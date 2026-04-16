import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import FirecrawlApp from '@mendable/firecrawl-js';

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.API_KEY });

const LINKEDIN_EMAIL    = process.env.LINKEDIN_EMAIL;
const LINKEDIN_PASSWORD = process.env.LINKEDIN_PASSWORD;
const FACEBOOK_EMAIL    = process.env.FACEBOOK_EMAIL;
const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD;

// ─── Persistent authenticated browser sessions ───────────────────────────────
// Kept alive until the user closes the window — reused by the deep-search agent.

let linkedInContext = null;  // Playwright BrowserContext
let facebookContext = null;  // Playwright BrowserContext

function watchBrowser(browser, label, clearFn) {
  browser.on('disconnected', () => {
    console.log(`[${label}] Browser window closed by user.`);
    clearFn();
  });
}

// ─── Playwright tools exposed to Claude ──────────────────────────────────────

const TOOLS = [
  {
    name: 'navigate',
    description: 'Navigate the browser to a URL and wait for the page to load.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_page_text',
    description: 'Get the visible text content of the current page (trimmed to 8 000 chars).',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_element_text',
    description: 'Get the text content of a specific element using a CSS selector.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for the element' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_links',
    description: 'Return all <a> href + text pairs visible on the current page.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'click',
    description: 'Click on a page element matching the given CSS selector.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector to click' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'type_text',
    description: 'Focus an input element and type text into it character by character (human-like).',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for the input' },
        text: { type: 'string', description: 'Text to type' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key on the currently focused element (e.g. Enter, Tab, Escape).',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name, e.g. "Enter", "Tab", "Escape"' },
      },
      required: ['key'],
    },
  },
  {
    name: 'wait',
    description: 'Pause for a short moment — use this when you land on a profile that does not match before navigating away, or any time a human would briefly pause.',
    input_schema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to wait (max 3000)' },
      },
      required: ['ms'],
    },
  },
  {
    name: 'finish',
    description: 'Signal that research is complete and return all collected profiles.',
    input_schema: {
      type: 'object',
      properties: {
        profiles: {
          type: 'array',
          description: 'Up to 5 LinkedIn profiles found',
          items: {
            type: 'object',
            properties: {
              name:             { type: 'string' },
              headline:         { type: 'string' },
              location:         { type: 'string' },
              current_company:  { type: 'string' },
              profile_url:      { type: 'string' },
              match_confidence: { type: 'string', description: 'HIGH / MEDIUM / LOW' },
              about:            { type: 'string' },
              experience: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title:       { type: 'string' },
                    company:     { type: 'string' },
                    duration:    { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
              education: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    school: { type: 'string' },
                    degree: { type: 'string' },
                    years:  { type: 'string' },
                  },
                },
              },
              skills:           { type: 'array', items: { type: 'string' } },
              connections:      { type: 'string' },
              phone:            { type: 'string', description: 'Phone number if visible on profile or in Contact Info section' },
              email:            { type: 'string', description: 'Email address if visible on profile or in Contact Info section' },
              physical_address: { type: 'string', description: 'Physical/mailing address if visible on profile' },
              notes:            { type: 'string' },
            },
          },
        },
        search_notes: { type: 'string', description: 'Summary of what was searched and found' },
      },
      required: ['profiles'],
    },
  },
];

// ─── Force Claude to flush partial results when the iteration limit is hit ────

async function forceFinish(messages, tools, label) {
  console.log(`[${label}] Iteration limit reached — requesting partial results.`);
  messages.push({
    role: 'user',
    content: 'You have reached the tool call limit. Call finish() RIGHT NOW with every profile you have collected so far, even if incomplete. Do not call any other tool.',
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    tools,
    messages,
  });

  for (const block of response.content ?? []) {
    if (block.type === 'tool_use' && block.name === 'finish') {
      return { profiles: block.input.profiles ?? [], search_notes: block.input.search_notes ?? 'Reached iteration limit — partial results.' };
    }
  }
  return null;
}

// ─── Execute a single Playwright tool call ────────────────────────────────────

const humanDelay = (min = 600, max = 1400) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

async function executeTool(page, toolName, input) {
  switch (toolName) {
    case 'navigate': {
      // Small random pre-navigation pause — like a human deciding where to go
      await humanDelay(800, 1800);
      try {
        await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch {
        // partial load is fine
      }
      // Random settle time after page loads
      await humanDelay(1200, 2500);
      return `Navigated to ${input.url}. Current URL: ${page.url()}`;
    }

    case 'get_page_text': {
      const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
      return text.substring(0, 8000);
    }

    case 'get_element_text': {
      try {
        const text = await page.$eval(input.selector, el => el.innerText?.trim() ?? '');
        return text.substring(0, 4000);
      } catch {
        return `Element not found: ${input.selector}`;
      }
    }

    case 'get_links': {
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.textContent?.trim() }))
          .filter(l => l.href && l.text)
          .slice(0, 60),
      );
      return JSON.stringify(links);
    }

    case 'click': {
      try {
        await humanDelay(400, 900);
        await page.click(input.selector, { timeout: 8000 });
        await humanDelay(1000, 2000);
        return `Clicked ${input.selector}`;
      } catch (e) {
        return `Could not click ${input.selector}: ${e.message}`;
      }
    }

    case 'type_text': {
      try {
        await page.click(input.selector, { timeout: 5000 });
        await humanDelay(300, 600);
        // Type character by character with random delays
        for (const char of input.text) {
          await page.keyboard.type(char);
          await new Promise(r => setTimeout(r, 40 + Math.random() * 80));
        }
        return `Typed "${input.text}" into ${input.selector}`;
      } catch (e) {
        return `Could not type into ${input.selector}: ${e.message}`;
      }
    }

    case 'press_key': {
      await humanDelay(300, 600);
      await page.keyboard.press(input.key);
      await humanDelay(800, 1500);
      return `Pressed ${input.key}. Current URL: ${page.url()}`;
    }

    case 'wait': {
      const ms = Math.min(input.ms ?? 1000, 3000);
      await new Promise(r => setTimeout(r, ms));
      return `Waited ${ms}ms.`;
    }

    case 'finish':
      return 'done';

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ─── LinkedIn login via Google OAuth ─────────────────────────────────────────

async function loginToLinkedIn(page) {
  console.log('[LinkedIn Bot] Loading LinkedIn...');

  page.setDefaultTimeout(300000); // 5 min — user needs time to log in

  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Check already logged in: not on an auth page + search bar present
  const alreadyLoggedIn = await page.evaluate(() => {
    const url = window.location.href;
    const onAuthPage = url.includes('/login') || url.includes('/checkpoint') || url.includes('/uas/');
    const hasSearchBar = !!(
      document.querySelector('input[role="combobox"]') ||
      document.querySelector('.search-global-typeahead') ||
      document.querySelector('input[placeholder*="Search"]')
    );
    return !onAuthPage && hasSearchBar;
  });

  if (alreadyLoggedIn) {
    console.log('[LinkedIn Bot] Already logged in.');
    return;
  }

  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log('  ACTION REQUIRED in the browser window:');
  console.log('  Log in to LinkedIn — click "Sign in with Google"');
  console.log('  and complete the full Google OAuth flow.');
  console.log('');
  console.log('  *** The bot will NOT move until LinkedIn\'s      ***');
  console.log('  *** search bar is visible (logged-in state).    ***');
  console.log('  (timeout: 5 minutes)');
  console.log('════════════════════════════════════════════════════');
  console.log('');

  // HARD BLOCK — polls every 300ms for the search bar that only appears when authenticated
  await page.waitForFunction(
    () => {
      const url = window.location.href;
      const onAuthPage = url.includes('/login') || url.includes('/checkpoint') || url.includes('/uas/');
      const hasSearchBar = !!(
        document.querySelector('input[role="combobox"]') ||
        document.querySelector('.search-global-typeahead') ||
        document.querySelector('input[placeholder*="Search"]')
      );
      return !onAuthPage && hasSearchBar;
    },
    null,
    { timeout: 300000, polling: 300 },
  );

  await page.waitForTimeout(2000);
  console.log('[LinkedIn Bot] Login confirmed ✓ — search bar detected. Starting search.');
}

// ─── Main agentic loop ────────────────────────────────────────────────────────

async function runLinkedInAgent({ name: targetName, country, phone, address, additionalInfo }) {
  console.log(`[LinkedIn Bot] Starting agent for: "${targetName}"`);

  if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD) {
    throw new Error('LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set in .env');
  }

  // Build a context summary for Claude to use when evaluating profile matches
  const contextLines = [
    country      && `Country/Region: ${country}`,
    phone        && `Phone: ${phone}`,
    address      && `Address: ${address}`,
    additionalInfo && `Additional info: ${additionalInfo}`,
  ].filter(Boolean);
  const contextBlock = contextLines.length
    ? `\n\nKnown details about this person (use these to pick the best match):\n${contextLines.map(l => `- ${l}`).join('\n')}`
    : '';

  // Reuse existing authenticated session, or launch a new browser
  if (!linkedInContext) {
    const browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    linkedInContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'mk-MK',
      timezoneId: 'Europe/Skopje',
      geolocation: { latitude: 41.9981, longitude: 21.4254 },
      permissions: ['geolocation'],
    });
    watchBrowser(browser, 'LinkedIn', () => { linkedInContext = null; });
    console.log('[LinkedIn Bot] New browser launched.');
  } else {
    console.log('[LinkedIn Bot] Reusing existing authenticated session.');
  }

  const page = await linkedInContext.newPage();

  // Step 1: log in before handing control to Claude
  await loginToLinkedIn(page);

  const messages = [
    {
      role: 'user',
      content: `You are a LinkedIn research agent with control of a real browser via Playwright tools.
You are already logged in to LinkedIn.

Your goal: find and return the first 5 LinkedIn profiles for the name below.

Target person:
- Full name: ${targetName}${contextBlock}

─── STEP-BY-STEP INSTRUCTIONS ───────────────────────────────────────────

Step 1 — Navigate directly to the LinkedIn people search:
  https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(targetName)}

Step 2 — Read the search results:
  - get_page_text to see the list of people
  - get_links to extract profile URLs (look for linkedin.com/in/ links)
  - Identify the first 5 profile URLs from the results

Step 3 — Visit each of the 5 profiles one by one:
  For each profile URL:
  a. navigate to the profile page
  b. wait 300ms
  c. get_page_text to read name, headline, location, company, about, experience, education, skills, connections
  d. If the page text contains a "Contact info" section or any phone/email/address data, extract it
  e. Record the data and assign match_confidence HIGH/MEDIUM/LOW vs the known details
  f. Capture phone, email, and physical_address whenever they appear anywhere on the page text

Step 4 — After visiting all 5 (or fewer if less exist), call finish() immediately.

─── RULES ───────────────────────────────────────────────────────────────
- Stop at 5 profiles — do not look for more.
- Always wait 300ms between profiles (use the wait tool).
- Do not spend more than 3 tool calls per profile.
- Prefer /in/ profile URLs over /company/ pages.
- If fewer than 5 results exist, collect whatever is there.
- If no results found, call finish() with an empty profiles array and explain in search_notes.
- Never stop without calling finish().
- You have up to 25 tool calls.`,
    },
  ];

  let result = null;
  const MAX_ITERATIONS = 20;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        tools: TOOLS,
        messages,
      });

      console.log(`[LinkedIn Bot] Iteration ${i + 1}, stop_reason: ${response.stop_reason}`);

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') break;

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          console.log(`[LinkedIn Bot] Tool: ${block.name}`, JSON.stringify(block.input).substring(0, 120));

          let output;
          if (block.name === 'finish') {
            result = { profiles: block.input.profiles ?? [], search_notes: block.input.search_notes };
            output = `Collected ${result.profiles.length} profile(s).`;
          } else {
            output = await executeTool(page, block.name, block.input);
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: String(output),
          });

          if (block.name === 'finish') break;
        }

        messages.push({ role: 'user', content: toolResults });

        if (result) break;
      }
    }

    // If loop ended without finish(), ask Claude to flush whatever it found
    if (!result) {
      result = await forceFinish(messages, TOOLS, 'LinkedIn Bot');
    }
  } finally {
    await page.close();
    console.log('[LinkedIn Bot] Research page closed (browser session kept alive).');
  }

  return result;
}

// ─── API endpoint ─────────────────────────────────────────────────────────────

app.post('/api/linkedin-bot', async (req, res) => {
  const { name, country, phone, address, additionalInfo } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'name is required (min 2 chars)' });
  }

  try {
    const data = await runLinkedInAgent({
      name: name.trim(),
      country: country?.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      additionalInfo: additionalInfo?.trim(),
    });

    if (!data || !data.profiles) {
      return res.status(404).json({ error: `No LinkedIn profiles found for "${name.trim()}".` });
    }
    if (data.profiles.length === 0) {
      return res.status(404).json({ error: `No LinkedIn profiles found for "${name.trim()}". ${data.search_notes ?? ''}` });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[LinkedIn Bot] Error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ─── Facebook: login ──────────────────────────────────────────────────────────

async function loginToFacebook(page) {
  console.log('[Facebook Bot] Loading Facebook...');

  page.setDefaultTimeout(300000); // 5 min — user needs time to log in
  await page.goto('https://www.facebook.com/?locale=mk_MK', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Check if already logged in by looking for feed-only DOM elements
  const alreadyLoggedIn = await page.evaluate(() =>
    !!(document.querySelector('[data-pagelet="Stories"]') ||
       document.querySelector('[data-pagelet="FeedUnit_0"]') ||
       document.querySelector('[aria-label="Create a post"]') ||
       document.querySelector('[data-pagelet="LeftRail"]'))
  );

  if (alreadyLoggedIn) {
    console.log('[Facebook Bot] Already logged in.');
    return;
  }

  // Pre-fill credentials if the login form is visible — convenience only, no auto-submit
  try {
    const emailInput = page.locator('#email');
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(FACEBOOK_EMAIL);
      await page.waitForTimeout(300);
      await page.locator('#pass').fill(FACEBOOK_PASSWORD);
      console.log('[Facebook Bot] Credentials pre-filled.');
    }
  } catch {
    // form not visible — user handles it
  }

  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log('  ACTION REQUIRED in the browser window:');
  console.log('  Log in to Facebook (credentials are pre-filled).');
  console.log('  Complete any CAPTCHA / 2FA if prompted.');
  console.log('');
  console.log('  *** The bot will NOT move until a logged-in     ***');
  console.log('  *** Facebook feed element appears on the page.  ***');
  console.log('  (timeout: 5 minutes)');
  console.log('════════════════════════════════════════════════════');
  console.log('');

  // HARD BLOCK — wait for a DOM element that only exists on the real logged-in feed.
  // This cannot be fooled by URL patterns.
  // arg = null (no argument to pass into the page fn), options = third param
  await page.waitForFunction(
    () =>
      !!(document.querySelector('[data-pagelet="Stories"]') ||
         document.querySelector('[data-pagelet="FeedUnit_0"]') ||
         document.querySelector('[data-pagelet="LeftRail"]') ||
         document.querySelector('[aria-label="Create a post"]') ||
         document.querySelector('[role="main"] form[method="post"]')),
    null,
    { timeout: 300000, polling: 300 },
  );

  await page.waitForTimeout(2000);
  console.log(`[Facebook Bot] Login confirmed ✓ — feed detected. Starting search.`);
}

// ─── Facebook: TOOLS finish schema ───────────────────────────────────────────

const FACEBOOK_FINISH_TOOL = {
  name: 'finish',
  description: 'Signal that research is complete and return all collected Facebook data.',
  input_schema: {
    type: 'object',
    properties: {
      profiles: {
        type: 'array',
        description: 'All Facebook profiles found that match the search parameters',
        items: {
          type: 'object',
          properties: {
            name:                { type: 'string' },
            profile_url:         { type: 'string' },
            match_confidence:    { type: 'string', description: 'HIGH / MEDIUM / LOW — how well this profile matches the known details' },
            location:            { type: 'string' },
            hometown:            { type: 'string' },
            relationship_status: { type: 'string' },
            about:               { type: 'string' },
            friends_count:       { type: 'string' },
            photos_visible:      { type: 'boolean' },
            work: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  employer: { type: 'string' },
                  title:    { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
            education: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  school: { type: 'string' },
                  degree: { type: 'string' },
                  years:  { type: 'string' },
                },
              },
            },
            interests:        { type: 'array', items: { type: 'string' } },
            recent_activity:  { type: 'array', items: { type: 'string' } },
            phone:            { type: 'string', description: 'Phone number if visible on the profile or About/Contact tab' },
            email:            { type: 'string', description: 'Email address if visible on the profile or About/Contact tab' },
            physical_address: { type: 'string', description: 'Physical/home address if visible on the profile or About tab' },
            contact_info: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type:  { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
            notes: { type: 'string' },
          },
        },
      },
      search_notes: { type: 'string', description: 'Summary of search attempts and why these profiles were selected' },
    },
    required: ['profiles'],
  },
};

const FACEBOOK_TOOLS = [...TOOLS.filter(t => t.name !== 'finish'), FACEBOOK_FINISH_TOOL];

// ─── Facebook: main agent loop ────────────────────────────────────────────────

async function runFacebookAgent({ name: targetName, country, phone, address, additionalInfo }) {
  console.log(`[Facebook Bot] Starting agent for: "${targetName}"`);

  if (!FACEBOOK_EMAIL || !FACEBOOK_PASSWORD) {
    throw new Error('FACEBOOK_EMAIL and FACEBOOK_PASSWORD must be set in .env');
  }

  const contextLines = [
    country        && `Country/Region: ${country}`,
    phone          && `Phone: ${phone}`,
    address        && `Address: ${address}`,
    additionalInfo && `Additional info: ${additionalInfo}`,
  ].filter(Boolean);
  const contextBlock = contextLines.length
    ? `\n\nKnown details about this person (use these to pick the best match):\n${contextLines.map(l => `- ${l}`).join('\n')}`
    : '';

  // Reuse existing authenticated session, or launch a new browser
  if (!facebookContext) {
    const browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    facebookContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport:   { width: 1280, height: 800 },
      locale:     'mk-MK',
      timezoneId: 'Europe/Skopje',
      geolocation: { latitude: 41.9981, longitude: 21.4254 },
      permissions: ['geolocation'],
    });
    watchBrowser(browser, 'Facebook', () => { facebookContext = null; });
    console.log('[Facebook Bot] New browser launched.');
  } else {
    console.log('[Facebook Bot] Reusing existing authenticated session.');
  }

  const page = await facebookContext.newPage();

  await loginToFacebook(page);

  const messages = [
    {
      role: 'user',
      content: `You are a Facebook research agent controlling a real browser. You are already logged in to Facebook.

Your goal: find and return the first 5 Facebook profiles for the name below.

Target person:
- Full name: ${targetName}${contextBlock}

─── STEP-BY-STEP INSTRUCTIONS ───────────────────────────────────────────

Step 1 — Navigate to the Facebook people search directly:
  navigate to https://www.facebook.com/search/people/?q=${encodeURIComponent(targetName)}

Step 2 — Read the search results:
  - get_page_text to see the list of people
  - get_links to extract profile URLs (look for facebook.com/<username> or facebook.com/profile.php?id=... links)
  - Identify the first 5 profile URLs from the results

Step 3 — Visit each of the 5 profiles one by one:
  For each profile URL:
  a. navigate to the profile page
  b. wait 300ms
  c. get_page_text to read the profile
  d. navigate to profile URL + /about
  e. get_page_text to read structured info (work, education, location, contact)
  f. Extract phone, email, and physical_address if they appear anywhere in the page text or About section
  g. Note the data, assign match_confidence HIGH/MEDIUM/LOW vs the known details

Step 4 — After visiting all 5 (or fewer if less than 5 exist), call finish() immediately.

─── RULES ───────────────────────────────────────────────────────────────
- Stop at 5 profiles — do not look for more.
- Always wait 300ms between profiles.
- Do not spend more than 3 tool calls per profile.
- If the search returns fewer than 5 results, collect whatever is there.
- If the search page is empty, try once more with: https://www.facebook.com/search/people/?q=${encodeURIComponent(targetName.split(' ').join('+'))}
- If still nothing, call finish() with an empty profiles array and explain in search_notes.
- Never stop without calling finish().
- You have up to 30 tool calls — budget them carefully.`,
    },
  ];

  let result = null;
  const MAX_ITERATIONS = 30;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        tools: FACEBOOK_TOOLS,
        messages,
      });

      console.log(`[Facebook Bot] Iteration ${i + 1}, stop_reason: ${response.stop_reason}`);

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') {
        console.log('[Facebook Bot] Agent ended turn without calling finish.');
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          console.log(`[Facebook Bot] Tool: ${block.name}`, JSON.stringify(block.input).substring(0, 120));

          let output;
          if (block.name === 'finish') {
            result = { profiles: block.input.profiles ?? [], search_notes: block.input.search_notes };
            output = `Collected ${result.profiles.length} profile(s).`;
          } else {
            output = await executeTool(page, block.name, block.input);
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: String(output),
          });

          if (block.name === 'finish') break;
        }

        messages.push({ role: 'user', content: toolResults });

        if (result) break;
      }
    }

    // If loop ended without finish(), ask Claude to flush whatever it found
    if (!result) {
      result = await forceFinish(messages, FACEBOOK_TOOLS, 'Facebook Bot');
    }
  } finally {
    await page.close();
    console.log('[Facebook Bot] Research page closed (browser session kept alive).');
  }

  return result;
}

// ─── Facebook API endpoint ────────────────────────────────────────────────────

app.post('/api/facebook-bot', async (req, res) => {
  const { name, country, phone, address, additionalInfo } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'name is required (min 2 chars)' });
  }

  try {
    const data = await runFacebookAgent({
      name: name.trim(),
      country: country?.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      additionalInfo: additionalInfo?.trim(),
    });

    if (!data || !data.profiles) {
      return res.status(404).json({ error: `No Facebook profiles found for "${name.trim()}". The agent exhausted all search attempts.` });
    }

    if (data.profiles.length === 0) {
      return res.status(404).json({ error: `No matching Facebook profiles found for "${name.trim()}". ${data.search_notes ?? ''}` });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Facebook Bot] Error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// ─── SuperVexor: master analysis ─────────────────────────────────────────────

async function runMasterAnalysis({ name, country, phone, address, additionalInfo, linkedinResult, facebookResult }) {
  const liProfiles = linkedinResult?.profiles ?? [];
  const fbProfiles = facebookResult?.profiles ?? [];

  if (liProfiles.length === 0 && fbProfiles.length === 0) {
    return { top_matches: [], analysis_notes: 'No profiles found on either platform.' };
  }

  const contextLines = [
    country        && `Country: ${country}`,
    phone          && `Phone: ${phone}`,
    address        && `Address: ${address}`,
    additionalInfo && `Additional info: ${additionalInfo}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are SuperVexor, a master OSINT intelligence analyst.

Search target: "${name}"
${contextLines}

LinkedIn profiles found (${liProfiles.length}):
${JSON.stringify(liProfiles, null, 2)}

Facebook profiles found (${fbProfiles.length}):
${JSON.stringify(fbProfiles, null, 2)}

Your task:
1. Analyze all profiles across both platforms.
2. Identify the top 3 most reliable matches for the target person.
3. Cross-reference LinkedIn + Facebook data where profiles appear to be the same person.
4. For each match give a detailed, human-readable description.

Return ONLY valid JSON — no markdown, no prose outside the JSON:
{
  "top_matches": [
    {
      "rank": 1,
      "name": "Full name",
      "confidence": "HIGH|MEDIUM|LOW",
      "reasoning": "Concise explanation of why this is a strong match",
      "summary": "2-3 sentence detailed description of this person",
      "key_facts": ["fact 1", "fact 2", "fact 3"],
      "linkedin_url": "url or null",
      "facebook_url": "url or null",
      "cross_platform_match": true,
      "phone": "best phone number found across all profile data for this person, or null",
      "email": "best email address found across all profile data for this person, or null",
      "location": "most specific location found (city, country) across all profiles, or null",
      "physical_address": "physical/home address if found in any profile data, or null"
    }
  ],
  "analysis_notes": "Overall observations about the search and data quality"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text ?? '';
  try {
    const stripped = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const first = stripped.indexOf('{');
    const last  = stripped.lastIndexOf('}');
    return JSON.parse(stripped.slice(first, last + 1));
  } catch {
    return { top_matches: [], analysis_notes: text };
  }
}

// ─── SuperVexor: SSE orchestration endpoint ───────────────────────────────────

app.get('/api/supervexor', async (req, res) => {
  const { name, country, phone, address, additionalInfo } = req.query;

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'name required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (event, data) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const params = {
    name:           String(name).trim(),
    country:        country        ? String(country).trim()        : undefined,
    phone:          phone          ? String(phone).trim()          : undefined,
    address:        address        ? String(address).trim()        : undefined,
    additionalInfo: additionalInfo ? String(additionalInfo).trim() : undefined,
  };

  let linkedinResult = null;
  let facebookResult = null;

  // ── Phase 1 + 2: LinkedIn + Facebook in parallel ───────────────────────────
  send('progress', { phase: 'linkedin', stage: 'login', message: 'Opening LinkedIn — please log in...' });
  send('progress', { phase: 'facebook', stage: 'login', message: 'Opening Facebook — please log in...' });

  const liPromise = runLinkedInAgent(params)
    .then(result => {
      linkedinResult = result;
      send('linkedin_done', { data: result });
      send('progress', { phase: 'linkedin', stage: 'done', message: `LinkedIn complete — ${result?.profiles?.length ?? 0} profiles found` });
    })
    .catch(err => {
      console.error('[SuperVexor] LinkedIn error:', err.message);
      send('progress', { phase: 'linkedin', stage: 'error', message: `LinkedIn failed: ${err.message}` });
    });

  const fbPromise = runFacebookAgent(params)
    .then(result => {
      facebookResult = result;
      send('facebook_done', { data: result });
      send('progress', { phase: 'facebook', stage: 'done', message: `Facebook complete — ${result?.profiles?.length ?? 0} profiles found` });
    })
    .catch(err => {
      console.error('[SuperVexor] Facebook error:', err.message);
      send('progress', { phase: 'facebook', stage: 'error', message: `Facebook failed: ${err.message}` });
    });

  await Promise.all([liPromise, fbPromise]);

  // ── Phase 3: Master analysis ───────────────────────────────────────────────
  try {
    send('progress', { phase: 'analysis', stage: 'running', message: 'Master agent cross-referencing all data...' });
    const summary = await runMasterAnalysis({ ...params, linkedinResult, facebookResult });
    send('complete', { summary });
  } catch (err) {
    console.error('[SuperVexor] Analysis error:', err.message);
    send('error', { message: `Analysis failed: ${err.message}` });
  }

  res.end();
});

// ─── Firecrawl deep-search: tools ────────────────────────────────────────────

const DEEP_SEARCH_TOOLS = [
  // ── Firecrawl: public web ──────────────────────────────────────────────────
  {
    name: 'search',
    description: 'Search the web. Returns titles, URLs, and snippets. Use targeted queries combining name + known details.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: '1-10, default 5' },
      },
      required: ['query'],
    },
  },
  {
    name: 'scrape',
    description: 'Fetch the full text of any public URL (Firecrawl). Use for people-finder pages, court records, property DBs, portfolio sites, or any external link found during research.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
  // ── LinkedIn authenticated browser ────────────────────────────────────────
  {
    name: 'linkedin_navigate',
    description: 'Navigate the live authenticated LinkedIn browser to a URL and return the full page text. Use for profiles, search results, or any LinkedIn URL.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'LinkedIn URL to navigate to' } },
      required: ['url'],
    },
  },
  {
    name: 'linkedin_get_links',
    description: 'Return all hyperlinks (href + text) visible on the current LinkedIn page. Use after linkedin_navigate to discover contact info links, portfolio URLs, website links, etc.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'linkedin_click',
    description: 'Click an element on the current LinkedIn page by its visible text label, then return the updated page text. Use this to open modals — e.g. click "Contact info" to reveal email/phone/website hidden behind a modal.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Visible text of the element to click' } },
      required: ['text'],
    },
  },
  // ── Facebook authenticated browser ────────────────────────────────────────
  {
    name: 'facebook_navigate',
    description: 'Navigate the live authenticated Facebook browser to a URL and return the full page text.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Facebook URL to navigate to' } },
      required: ['url'],
    },
  },
  {
    name: 'facebook_get_links',
    description: 'Return all hyperlinks visible on the current Facebook page. Use after facebook_navigate to find contact info, website, or other linked pages.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'facebook_click',
    description: 'Click an element on the current Facebook page by visible text, then return the updated page text. Use to expand sections or open contact info.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Visible text of the element to click' } },
      required: ['text'],
    },
  },
  // ── Done ──────────────────────────────────────────────────────────────────
  {
    name: 'finish',
    description: 'Research complete — return all findings.',
    input_schema: {
      type: 'object',
      properties: {
        phone_numbers:      { type: 'array', items: { type: 'string' } },
        email_addresses:    { type: 'array', items: { type: 'string' } },
        physical_addresses: { type: 'array', items: { type: 'string' } },
        properties:         { type: 'array', items: { type: 'string' } },
        vehicles:           { type: 'array', items: { type: 'string' } },
        employers:          { type: 'array', items: { type: 'string' } },
        social_profiles:    { type: 'array', items: { type: 'string' } },
        other_findings:     { type: 'array', items: { type: 'string' } },
        sources:            { type: 'array', items: { type: 'string' } },
        confidence:         { type: 'string', description: 'HIGH / MEDIUM / LOW' },
      },
      required: ['confidence'],
    },
  },
];

// ─── Firecrawl deep-search: agent loop ───────────────────────────────────────

async function runDeepSearchAgent({ name: targetName, location, phone, email, physical_address, linkedin_url, facebook_url }) {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not set in .env');

  const fc = new FirecrawlApp({ apiKey: firecrawlKey });

  // Open persistent pages in the authenticated sessions for this run
  let liPage = null;
  let fbPage = null;
  if (linkedInContext) {
    liPage = await linkedInContext.newPage();
    console.log('[DeepSearch] LinkedIn authenticated page ready.');
  }
  if (facebookContext) {
    fbPage = await facebookContext.newPage();
    console.log('[DeepSearch] Facebook authenticated page ready.');
  }

  const sessionInfo = [
    liPage ? '✓ LinkedIn session active (use linkedin_navigate / linkedin_get_links / linkedin_click)' : '✗ LinkedIn session not available',
    fbPage ? '✓ Facebook session active (use facebook_navigate / facebook_get_links / facebook_click)' : '✗ Facebook session not available',
  ].join('\n');

  const knownLines = [
    location         && `Location: ${location}`,
    phone            && `Phone: ${phone}`,
    email            && `Email: ${email}`,
    physical_address && `Known address: ${physical_address}`,
    linkedin_url     && `LinkedIn: ${linkedin_url}`,
    facebook_url     && `Facebook: ${facebook_url}`,
  ].filter(Boolean);

  const knownBlock = knownLines.length
    ? `\nKnown details:\n${knownLines.map(l => `- ${l}`).join('\n')}`
    : '';

  const messages = [
    {
      role: 'user',
      content: `You are an OSINT research agent. Collect every actionable detail about this person.

Target: "${targetName}"${knownBlock}

Browser sessions:
${sessionInfo}

Goal: phone numbers, emails, home/work addresses, property ownership, vehicles, employers,
court records, social profiles, and any other info useful to a debt collector.

You have 10 tool calls. Use them like a skilled investigator:

1. If LinkedIn/Facebook URLs are known, start there with linkedin_navigate / facebook_navigate.
2. IMMEDIATELY after loading a profile, call linkedin_get_links / facebook_get_links to see ALL
   available links — including "Contact info", website, portfolio, email links.
3. If you see a "Contact info" link or button, ALWAYS click it with linkedin_click("Contact info")
   — this opens a modal containing email, phone, and website that is NOT in the raw page text.
4. For any portfolio, personal website, or external URL you discover, scrape it with the scrape tool.
5. Use search for public records, people-finders (whitepages, spokeo, truepeoplesearch), property
   records, or anything not covered by the social profiles.
6. Extract EVERY email address, phone number, and address you encounter — do not skip anything.
7. Call finish() when done or after 8+ tool calls.

Never ignore a visible data point. Never skip a promising link.`,
    },
  ];

  let result = null;
  const MAX_ITERATIONS = 10;

  const pageText = async (page) => {
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
    return text.substring(0, 6000);
  };

  const pageLinks = async (page) => {
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: a.textContent?.trim() }))
        .filter(l => l.href && l.text)
        .slice(0, 80),
    );
    return JSON.stringify(links);
  };

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        tools: DEEP_SEARCH_TOOLS,
        messages,
      });

      console.log(`[DeepSearch] Iteration ${i + 1}, stop_reason: ${response.stop_reason}`);
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') break;

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          console.log(`[DeepSearch] Tool: ${block.name}`, JSON.stringify(block.input).substring(0, 120));

          let output;

          if (block.name === 'finish') {
            result = block.input;
            output = 'Research complete.';

          } else if (block.name === 'search') {
            try {
              const limit = Math.min(block.input.limit ?? 5, 10);
              const sr = await fc.search(block.input.query, { limit, scrapeOptions: { formats: ['markdown'] } });
              output = JSON.stringify((sr?.data ?? []).map(r => ({
                url: r.url, title: r.title,
                content: (r.markdown ?? r.description ?? '').substring(0, 2000),
              })));
            } catch (err) { output = `Search failed: ${err.message}`; }

          } else if (block.name === 'scrape') {
            try {
              const sr = await fc.scrapeUrl(block.input.url, { formats: ['markdown'] });
              output = (sr?.markdown ?? 'No content').substring(0, 5000);
            } catch (err) { output = `Scrape failed: ${err.message}`; }

          // ── LinkedIn tools ────────────────────────────────────────────────
          } else if (block.name === 'linkedin_navigate') {
            if (!liPage) { output = 'LinkedIn session not available.'; }
            else {
              try {
                await liPage.goto(block.input.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await liPage.waitForTimeout(1500);
                output = await pageText(liPage);
              } catch (err) { output = `LinkedIn navigate failed: ${err.message}`; }
            }
          } else if (block.name === 'linkedin_get_links') {
            if (!liPage) { output = 'LinkedIn session not available.'; }
            else {
              try { output = await pageLinks(liPage); }
              catch (err) { output = `LinkedIn get_links failed: ${err.message}`; }
            }
          } else if (block.name === 'linkedin_click') {
            if (!liPage) { output = 'LinkedIn session not available.'; }
            else {
              try {
                await liPage.getByText(block.input.text, { exact: false }).first().click({ timeout: 6000 });
                await liPage.waitForTimeout(1500);
                output = await pageText(liPage);
              } catch (err) { output = `LinkedIn click failed: ${err.message}`; }
            }

          // ── Facebook tools ────────────────────────────────────────────────
          } else if (block.name === 'facebook_navigate') {
            if (!fbPage) { output = 'Facebook session not available.'; }
            else {
              try {
                await fbPage.goto(block.input.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await fbPage.waitForTimeout(1500);
                output = await pageText(fbPage);
              } catch (err) { output = `Facebook navigate failed: ${err.message}`; }
            }
          } else if (block.name === 'facebook_get_links') {
            if (!fbPage) { output = 'Facebook session not available.'; }
            else {
              try { output = await pageLinks(fbPage); }
              catch (err) { output = `Facebook get_links failed: ${err.message}`; }
            }
          } else if (block.name === 'facebook_click') {
            if (!fbPage) { output = 'Facebook session not available.'; }
            else {
              try {
                await fbPage.getByText(block.input.text, { exact: false }).first().click({ timeout: 6000 });
                await fbPage.waitForTimeout(1500);
                output = await pageText(fbPage);
              } catch (err) { output = `Facebook click failed: ${err.message}`; }
            }

          } else {
            output = `Unknown tool: ${block.name}`;
          }

          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: String(output) });
          if (block.name === 'finish') break;
        }

        messages.push({ role: 'user', content: toolResults });
        if (result) break;
      }
    }

    if (!result) {
      console.log('[DeepSearch] Iteration limit reached — forcing finish.');
      messages.push({
        role: 'user',
        content: 'You have reached the 10 tool call limit. Call finish() RIGHT NOW with everything found so far.',
      });
      const response = await client.messages.create({
        model: 'claude-opus-4-6', max_tokens: 2048,
        tools: DEEP_SEARCH_TOOLS, messages,
      });
      for (const block of response.content ?? []) {
        if (block.type === 'tool_use' && block.name === 'finish') { result = block.input; break; }
      }
    }
  } finally {
    if (liPage) await liPage.close();
    if (fbPage) await fbPage.close();
  }

  return result ?? { confidence: 'LOW', other_findings: ['Agent exhausted without returning results.'] };
}

// ─── Firecrawl deep-search: endpoint ─────────────────────────────────────────

app.post('/api/deep-search', async (req, res) => {
  const { name, location, phone, email, physical_address, linkedin_url, facebook_url } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    return res.status(500).json({ error: 'FIRECRAWL_API_KEY not set in .env' });
  }

  try {
    const data = await runDeepSearchAgent({
      name: name.trim(), location, phone, email, physical_address, linkedin_url, facebook_url,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[DeepSearch] Error:', err.message);
    res.status(500).json({ error: err.message ?? 'Deep search failed' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.LINKEDIN_BOT_PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`[Bot Server] Running on http://localhost:${PORT}`);
  console.log(`[Bot Server] LinkedIn account : ${LINKEDIN_EMAIL  ?? '(not set)'}`);
  console.log(`[Bot Server] Facebook account : ${FACEBOOK_EMAIL  ?? '(not set)'}`);
  console.log(`[Bot Server] Locale: mk-MK / Europe/Skopje`);
});
