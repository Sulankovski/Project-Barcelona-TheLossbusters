import { corsHeaders } from '@supabase/supabase-js/cors'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, country, additionalInfo, caseContext } = await req.json()

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Name is required (min 2 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const searchPrompt = buildSearchPrompt(name.trim(), country, additionalInfo, caseContext)

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: searchPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('AI API error:', aiResponse.status, errText)
      return new Response(JSON.stringify({ error: 'AI enrichment failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content

    let enrichmentResult
    try {
      enrichmentResult = JSON.parse(content)
    } catch {
      enrichmentResult = { raw_text: content, parse_error: true }
    }

    return new Response(JSON.stringify({ success: true, data: enrichmentResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

const SYSTEM_PROMPT = `You are an OSINT intelligence analyst for a debt collection agency. Your job is to research a person using publicly available information and return actionable intelligence.

CRITICAL RULES:
1. Only report information that could plausibly be found through public sources (business registries, LinkedIn, social media, public records, domain registrations, court records)
2. Clearly mark confidence levels: HIGH (multiple corroborating sources), MEDIUM (single credible source), LOW (inference only)
3. If you cannot find information, say so explicitly. NEVER fabricate data.
4. Every claim must reference a plausible source type
5. Focus on information that helps debt recovery: employment, assets, business connections, contact methods

Return a JSON object with this exact structure:
{
  "identity_matches": [
    {
      "description": "Brief description of matched identity",
      "likelihood": "HIGH|MEDIUM|LOW",
      "reasoning": "Why this match was selected",
      "location": "City, Country"
    }
  ],
  "employment": {
    "status": "employed|self_employed|unemployed|unknown",
    "details": "Description of employment situation",
    "employer_name": "Name if found or null",
    "confidence": "HIGH|MEDIUM|LOW",
    "source_type": "linkedin|business_registry|company_website|inference"
  },
  "business_connections": [
    {
      "entity": "Company or person name",
      "relationship": "director|employee|partner|shareholder",
      "source_type": "business_registry|linkedin|website",
      "confidence": "HIGH|MEDIUM|LOW"
    }
  ],
  "social_presence": [
    {
      "platform": "LinkedIn|Facebook|Instagram|Twitter|Other",
      "visibility": "public|limited|private",
      "notable_signals": "Any relevant observations"
    }
  ],
  "possible_assets": [
    {
      "type": "property|vehicle|business|bank_account|other",
      "description": "Details",
      "confidence": "HIGH|MEDIUM|LOW",
      "source_type": "Source type"
    }
  ],
  "contact_alternatives": [
    {
      "type": "phone|email|address|social",
      "value": "The contact method or description",
      "source_type": "Source"
    }
  ],
  "location_signals": [
    {
      "location": "City/Region, Country",
      "confidence": "HIGH|MEDIUM|LOW",
      "source_type": "Source"
    }
  ],
  "risk_indicators": ["List of risk signals"],
  "leverage_points": ["List of leverage opportunities for debt recovery"],
  "lifestyle_signals": {
    "observed": ["Observable lifestyle indicators"],
    "inconsistencies": ["Any gaps between declared and observed"],
    "confidence": "HIGH|MEDIUM|LOW"
  },
  "negative_signals": ["Things NOT found that are notable"],
  "recovery_outlook": {
    "rating": "HIGH|MEDIUM|LOW|UNKNOWN",
    "reasoning": "Why this rating",
    "recommended_action": "What to do next",
    "suggested_approach": "Detailed negotiation approach"
  },
  "negotiation_strategy": {
    "primary_angle": "Main approach",
    "secondary_angle": "Backup approach",
    "tone": "recommended tone",
    "opening_line": "Suggested opening line for the call",
    "risks": ["Potential risks of this approach"]
  },
  "evidence_chain": [
    {
      "claim": "What was found",
      "evidence": "Supporting evidence",
      "source_type": "Type of source",
      "confidence": "HIGH|MEDIUM|LOW"
    }
  ],
  "intelligence_gaps": ["What could NOT be determined"],
  "overall_confidence": 0.0 to 1.0,
  "summary": "2-3 sentence executive summary for the collector"
}`

function buildSearchPrompt(name: string, country?: string, additionalInfo?: string, caseContext?: any): string {
  let prompt = `Research the following individual for debt collection intelligence:\n\nName: ${name}`

  if (country) prompt += `\nCountry: ${country}`
  if (additionalInfo) prompt += `\nAdditional information provided: ${additionalInfo}`

  if (caseContext) {
    prompt += `\n\nCase context:`
    if (caseContext.debt_eur) prompt += `\n- Outstanding debt: €${caseContext.debt_eur.toLocaleString()}`
    if (caseContext.debt_origin) prompt += `\n- Debt origin: ${caseContext.debt_origin.replace(/_/g, ' ')}`
    if (caseContext.call_outcome) prompt += `\n- Last call outcome: ${caseContext.call_outcome.replace(/_/g, ' ')}`
    if (caseContext.legal_asset_finding) prompt += `\n- Legal asset finding: ${caseContext.legal_asset_finding.replace(/_/g, ' ')}`
    if (caseContext.debt_age_months) prompt += `\n- Debt age: ${caseContext.debt_age_months} months`
  }

  prompt += `\n\nSearch thoroughly using all available public intelligence methods. For each finding, note the source type and confidence level. If this is a common name, identify multiple possible matches and rank them by likelihood. Be honest about what you cannot determine.`

  return prompt
}
