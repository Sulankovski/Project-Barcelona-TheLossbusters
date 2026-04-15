import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.API_KEY });

const LINKEDIN_EMAIL    = process.env.LINKEDIN_EMAIL;
const LINKEDIN_PASSWORD = process.env.LINKEDIN_PASSWORD;

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
    description: 'Focus an input element and type text into it.',
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
    name: 'finish',
    description: 'Signal that research is complete and return all collected data.',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Structured LinkedIn profile data',
          properties: {
            name: { type: 'string' },
            headline: { type: 'string' },
            location: { type: 'string' },
            current_company: { type: 'string' },
            profile_url: { type: 'string' },
            about: { type: 'string' },
            experience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  company: { type: 'string' },
                  duration: { type: 'string' },
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
                  years: { type: 'string' },
                },
              },
            },
            skills: { type: 'array', items: { type: 'string' } },
            connections: { type: 'string' },
            notes: { type: 'string', description: 'Any extra observations' },
          },
        },
      },
      required: ['data'],
    },
  },
];

// ─── Execute a single Playwright tool call ────────────────────────────────────

async function executeTool(page, toolName, input) {
  switch (toolName) {
    case 'navigate': {
      try {
        await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2500);
      } catch {
        // partial load is fine
      }
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
        await page.click(input.selector, { timeout: 8000 });
        await page.waitForTimeout(1500);
        return `Clicked ${input.selector}`;
      } catch (e) {
        return `Could not click ${input.selector}: ${e.message}`;
      }
    }

    case 'type_text': {
      try {
        await page.fill(input.selector, input.text);
        return `Typed into ${input.selector}`;
      } catch (e) {
        return `Could not type into ${input.selector}: ${e.message}`;
      }
    }

    case 'finish':
      return 'done';

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ─── LinkedIn login via Google OAuth ─────────────────────────────────────────

async function loginToLinkedIn(page) {
  console.log('[LinkedIn Bot] Opening LinkedIn login page...');

  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Check if already logged in
  if (page.url().includes('/feed') || page.url().includes('/mynetwork')) {
    console.log('[LinkedIn Bot] Already logged in, skipping login step.');
    return;
  }

  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log('  ACTION REQUIRED: Please log in to LinkedIn in the');
  console.log('  browser window that just opened.');
  console.log('  Click "Sign in with Google" and complete the flow.');
  console.log('  The bot will continue automatically once you are');
  console.log('  on the LinkedIn feed. (timeout: 2 minutes)');
  console.log('════════════════════════════════════════════════════');
  console.log('');

  // Wait up to 2 minutes for the user to complete login manually
  try {
    await page.waitForURL(
      url => url.includes('linkedin.com/feed') || url.includes('linkedin.com/mynetwork') || url.includes('linkedin.com/in/'),
      { timeout: 120000 }
    );
    console.log('[LinkedIn Bot] Login detected — continuing.');
  } catch {
    console.log('[LinkedIn Bot] Login timeout — proceeding anyway.');
  }

  await page.waitForTimeout(2000);
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

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'mk-MK',
    timezoneId: 'Europe/Skopje',
  });

  const page = await context.newPage();

  // Step 1: log in before handing control to Claude
  await loginToLinkedIn(page);

  const messages = [
    {
      role: 'user',
      content: `You are a LinkedIn research agent with control of a real browser via Playwright tools.
You are already logged in to LinkedIn.

Your goal: find the LinkedIn profile that best matches the person described below, then extract as much information as possible.

Target person:
- Full name: ${targetName}${contextBlock}

Strategy:
1. Navigate to LinkedIn people search: https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(targetName)}
2. Read the search results with get_page_text. You will see multiple profiles — evaluate each one against the known details above (country, phone, address, additional info) to identify the best match.
3. If the country is known, also try the filtered URL: https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(targetName)}&geoUrn=${encodeURIComponent(country || '')} to narrow results.
4. Navigate to the profile that most closely matches all known details.
5. Use get_page_text to read the full profile.
6. Extract: full name, headline/job title, location, current company, about section, work experience (title + company + duration), education, skills, connection count.
7. Call finish() with all the structured data and a note explaining why this profile was chosen as the best match.

Rules:
- Prefer people profiles (/in/) over company pages (/company/).
- If none of the first results match well, try a refined search with additional keywords (e.g. company name or city from the known details).
- Be thorough but efficient — you have up to 20 tool calls.`,
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
            result = block.input.data;
            output = 'Data collected successfully.';
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
  } finally {
    await browser.close();
    console.log('[LinkedIn Bot] Browser closed.');
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
    if (!data) return res.status(500).json({ error: 'Agent finished without returning data' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[LinkedIn Bot] Error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.LINKEDIN_BOT_PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`[LinkedIn Bot] Server running on http://localhost:${PORT}`);
  console.log(`[LinkedIn Bot] LinkedIn account: ${LINKEDIN_EMAIL ?? '(not set)'}`);
  console.log(`[LinkedIn Bot] Locale: mk-MK / Europe/Skopje`);
});
