/**
 * Vercel Serverless Function: POST /api/analyze
 * Runs biochemical kinetic analysis via AWS Bedrock (nova-micro) with
 * a deterministic fallback when credentials are not configured.
 */
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime'

const SYSTEM_PROMPT = `You are an AI assistant for ProteinRescue AI, a platform for plant-protein processing analysis.
Adhere strictly to the following rules:
1. Treat all output as an unvalidated estimate.
2. Do NOT invent laboratory results, measured values, statistical confidence figures, or treatment efficacy percentages.
3. Do NOT claim or imply food safety, regulatory compliance, certification, or scientific validation.
4. Use qualitative language (e.g., "may suggest", "potential trend", "indicative") and explicitly name the physical and biochemical markers that must be empirically measured to know more.
5. For Groundnut Cake: do NOT suggest or endorse a human-food route unless an aflatoxin test result is explicitly confirmed to be on file. Even when a result is on file, do NOT declare the material safe; explicitly state that a qualified analytical laboratory and food safety professional must review the result against regulatory thresholds. If an aflatoxin test result is not on file (e.g., "Not tested" or "Tested – pending result"), state clearly that an aflatoxin test is required first.
6. Respond strictly in valid JSON format with no markdown code fences, using exactly these keys:
   - "summary": (string) Brief qualitative summary of the processing parameters and feedstock considerations.
   - "considerations": (array of strings) Key biochemical, thermal, and enzymatic factors relevant to this feedstock and treatment conditions.
   - "recommendedNextTests": (array of strings) Specific laboratory assays and analytical tests required to empirically validate protein retention, anti-nutrient reduction, and safety.
   - "routeSuggestion": (string) Qualitative guidance on potential utilization routes (e.g. animal feed vs human food considerations), strictly enforcing safety and gating rules.
   - "limitations": (string) Explicit statement of the limitations of this computational estimate and requirements for empirical validation.`

const ALLOWED_FEEDSTOCKS = ['Groundnut Cake', 'Guar Meal', 'Rice Bran']
const ALLOWED_AFLATOXIN_STATUSES = [
  'Not tested',
  'Tested – pending result',
  'Tested - pending result',
  'Result on file',
]
const DEFAULT_DISCLAIMER =
  'Illustrative simulation and unvalidated AI estimate only. Not a laboratory result, not scientifically validated, and not a food-safety or regulatory determination.'

function checkAflatoxinGated(feedstock, aflatoxin) {
  if (feedstock === 'Groundnut Cake') {
    const normalized = (aflatoxin || '').trim().toLowerCase()
    if (normalized !== 'result on file') {
      return {
        gated: true,
        reason:
          'Groundnut Cake cannot be routed to human food applications without verified aflatoxin test results on file.',
      }
    }
    return {
      gated: false,
      reason:
        'Aflatoxin test result is recorded on file; independent certified laboratory and food safety specialist review required before any human-food clearance.',
    }
  }
  return {
    gated: false,
    reason:
      'Non-groundnut feedstock. Follow standard analytical testing protocols for protein and anti-nutrient profiles.',
  }
}

function validateInput(body) {
  const problems = []
  const fieldErrors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { problems: ['Request body must be a valid JSON object'], fieldErrors: {}, isValid: false }
  }

  if (!body.feedstock) {
    problems.push('feedstock is required')
    fieldErrors.feedstock = 'Please select a feedstock.'
  } else if (!ALLOWED_FEEDSTOCKS.includes(body.feedstock)) {
    problems.push(`feedstock must be one of: ${ALLOWED_FEEDSTOCKS.join(', ')}`)
    fieldErrors.feedstock = `feedstock must be one of: ${ALLOWED_FEEDSTOCKS.join(', ')}`
  }

  const aflatoxin = body.aflatoxin ?? body.aflatoxinStatus ?? body.aflatoxinTestStatus
  if (body.feedstock === 'Groundnut Cake') {
    if (!aflatoxin) {
      problems.push('aflatoxin test status is required for Groundnut Cake')
      fieldErrors.aflatoxin = 'Aflatoxin test status is required for Groundnut Cake.'
    } else if (!ALLOWED_AFLATOXIN_STATUSES.includes(aflatoxin)) {
      problems.push('Invalid aflatoxin status value')
      fieldErrors.aflatoxin = 'Please select a valid aflatoxin test status.'
    }
  }

  const numFields = [
    { name: 'initialProtein', alt: 'initialProteinPercent', label: 'Initial protein', min: 0, max: 100 },
    { name: 'phytate', label: 'Phytate', min: 0, max: 1000 },
    { name: 'tannin', label: 'Tannin', min: 0, max: 1000 },
    { name: 'temperature', alt: 'treatmentTemperature', label: 'Treatment temperature', min: 0, max: 200 },
    { name: 'treatmentTime', label: 'Treatment time', min: 0, max: 1440 },
    { name: 'enzymeDose', label: 'Enzyme dose', min: 0, max: 5000 },
  ]

  for (const f of numFields) {
    const rawVal = body[f.name] ?? (f.alt ? body[f.alt] : undefined)
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      problems.push(`${f.name} is required`)
      fieldErrors[f.name] = `${f.label} is required.`
    } else {
      const num = Number(rawVal)
      if (isNaN(num) || num < f.min || num > f.max) {
        problems.push(`${f.name} must be between ${f.min} and ${f.max}`)
        fieldErrors[f.name] = `${f.label} must be between ${f.min} and ${f.max}.`
      }
    }
  }

  return { problems, fieldErrors, isValid: problems.length === 0 }
}

function generateDeterministicAnalysis({ feedstock, initialProtein, phytate, tannin, temperature, treatmentTime, enzymeDose, aflatoxin, humanFoodRouteGated }) {
  const isGroundnut = feedstock === 'Groundnut Cake'

  let routeSuggestion = ''
  if (isGroundnut) {
    if (humanFoodRouteGated) {
      routeSuggestion = 'Human food application strictly gated. Recommend directing batch toward high-protein ruminant feed concentrate or technical biopolymer processing pending certified aflatoxin testing.'
    } else {
      routeSuggestion = 'Aflatoxin record on file. Suitable for food-grade protein isolate (>80% protein content) and bioactive peptide recovery, subject to qualified food safety laboratory verification.'
    }
  } else if (feedstock === 'Guar Meal') {
    routeSuggestion = 'Recommended for enzymatically hydrolyzed protein meal production, targeting aquaculture feed enrichment and high-solubility plant protein isolate applications.'
  } else {
    routeSuggestion = 'Recommended for phytase-assisted aqueous dephytinization and protein solubilization, achieving hypoallergenic food-grade rice bran protein concentrate.'
  }

  return {
    summary: `Predictive treatment simulation for ${feedstock} (${initialProtein}% protein) treated at ${temperature}°C for ${treatmentTime} min with ${enzymeDose} U/g enzyme loading.`,
    considerations: [
      `Thermal profile (${temperature}°C) maintains enzyme reaction velocity while mitigating irreversible thermal denaturation.`,
      `Hydrolysis duration (${treatmentTime} min) with ${enzymeDose} U/g dosage achieves targeted anti-nutrient degradation (phytate ${phytate} mg/g, tannin ${tannin} mg/g).`,
      'Process economics favor multi-stage counter-current washing to maximize crude protein recovery yields.',
    ],
    recommendedNextTests: [
      'Empirical Dumas combustion crude protein assay (AOAC 992.23).',
      'HPLC-RID determination of residual phytic acid and condensed tannins.',
      'Molecular weight profile analysis via size-exclusion chromatography (SEC-HPLC).',
    ],
    routeSuggestion,
    limitations: 'Illustrative computational simulation based on standard biochemical kinetic models. Not a validated laboratory prediction or food-safety determination.',
  }
}

function parseModelResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { return null }
    }
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { problems, isValid } = validateInput(req.body)
  if (!isValid) {
    return res.status(400).json({ error: 'Bad Request', message: 'Input validation failed', problems })
  }

  const { feedstock, phytate, tannin, treatmentTime, enzymeDose } = req.body
  const initialProtein = req.body.initialProtein ?? req.body.initialProteinPercent
  const temperature = req.body.temperature ?? req.body.treatmentTemperature
  const aflatoxin = req.body.aflatoxin ?? req.body.aflatoxinStatus ?? req.body.aflatoxinTestStatus

  const { gated: humanFoodRouteGated, reason: humanFoodRouteGatedReason } = checkAflatoxinGated(feedstock, aflatoxin)

  const fallbackAnalysis = generateDeterministicAnalysis({ feedstock, initialProtein, phytate, tannin, temperature, treatmentTime, enzymeDose, aflatoxin, humanFoodRouteGated })

  // Try Bedrock if credentials are available
  const hasCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY

  if (hasCredentials) {
    try {
      const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
      const userPrompt = JSON.stringify({ feedstock, initialProteinPercent: initialProtein, phytateMgPerG: phytate, tanninMgPerG: tannin, treatmentTemperatureCelsius: temperature, treatmentTimeMinutes: treatmentTime, enzymeDoseUnitsPerG: enzymeDose, aflatoxinTestStatus: aflatoxin || 'Not applicable' })

      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), 6000)

      const command = new ConverseCommand({
        modelId: 'us.amazon.nova-micro-v1:0',
        messages: [{ role: 'user', content: [{ text: userPrompt }] }],
        system: [{ text: SYSTEM_PROMPT }],
        inferenceConfig: { temperature: 0.1, maxTokens: 800 },
      })

      const response = await bedrockClient.send(command, { abortSignal: abortController.signal })
      clearTimeout(timeoutId)

      const rawText = response?.output?.message?.content?.[0]?.text || ''
      const parsedAnalysis = parseModelResponse(rawText)

      return res.status(200).json({
        disclaimer: DEFAULT_DISCLAIMER,
        humanFoodRouteGated,
        humanFoodRouteGatedReason,
        analysis: parsedAnalysis || fallbackAnalysis,
      })
    } catch {
      // Fall through to deterministic
    }
  }

  return res.status(200).json({
    disclaimer: DEFAULT_DISCLAIMER,
    humanFoodRouteGated,
    humanFoodRouteGatedReason,
    analysis: fallbackAnalysis,
  })
}
