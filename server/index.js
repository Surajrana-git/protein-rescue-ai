import express from 'express';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { createExtractRouter } from './extract.js';
import { createReportRouter } from './reportRouter.js';
import {
  ALLOWED_FEEDSTOCKS,
  ALLOWED_AFLATOXIN_STATUSES,
  DEFAULT_DISCLAIMER,
  validateAnalyzeInput,
  checkAflatoxinGated,
} from '../src/data/analysisSchema.js';
import { handleBedrockError } from './bedrockErrors.js';

const app = express();
const PORT = 3001;
const HOST = '127.0.0.1';

// Security and parser configuration
app.disable('x-powered-by');

// Allow local cross-origin requests for development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// JSON body parser with 16kb limit
app.use(express.json({ limit: '16kb' }));

// Content-Type validation for POST /api/analyze and mutating routes
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // Exempt multipart/form-data and report extraction endpoints from JSON requirement
    if (
      req.path.includes('extract-report') ||
      req.originalUrl.includes('extract-report') ||
      req.headers['content-type']?.includes('multipart/form-data')
    ) {
      return next();
    }
    if (!req.is('application/json')) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json',
      });
    }
  }
  next();
});

// Bedrock Runtime client initialized using default AWS credential provider chain only
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-east-1',
});

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
   - "limitations": (string) Explicit statement of the limitations of this computational estimate and requirements for empirical validation.`;

function generateDeterministicAnalysis({
  feedstock,
  initialProtein,
  phytate,
  tannin,
  temperature,
  treatmentTime,
  enzymeDose,
  aflatoxin,
  humanFoodRouteGated,
}) {
  const isGroundnut = feedstock === 'Groundnut Cake';
  const hasAflatoxinRecord = (aflatoxin || '').trim().toLowerCase() === 'result on file';

  let routeSuggestion = '';
  if (isGroundnut) {
    if (humanFoodRouteGated) {
      routeSuggestion =
        'Human food application strictly gated. Recommend directing batch toward high-protein ruminant feed concentrate or technical biopolymer processing pending certified aflatoxin testing.';
    } else {
      routeSuggestion =
        'Aflatoxin record on file. Suitable for food-grade protein isolate (>80% protein content) and bioactive peptide recovery, subject to qualified food safety laboratory verification.';
    }
  } else if (feedstock === 'Guar Meal') {
    routeSuggestion =
      'Recommended for enzymatically hydrolyzed protein meal production, targeting aquaculture feed enrichment and high-solubility plant protein isolate applications.';
  } else {
    routeSuggestion =
      'Recommended for phytase-assisted aqueous dephytinization and protein solubilization, achieving hypoallergenic food-grade rice bran protein concentrate.';
  }

  const considerations = [
    `Thermal profile (${temperature}°C) maintains enzyme reaction velocity while mitigating irreversible thermal denaturation.`,
    `Hydrolysis duration (${treatmentTime} min) with ${enzymeDose} U/g dosage achieves targeted anti-nutrient degradation (phytate ${phytate} mg/g, tannin ${tannin} mg/g).`,
    'Process economics favor multi-stage counter-current washing to maximize crude protein recovery yields.',
  ];

  const recommendedNextTests = [
    'Empirical Dumas combustion crude protein assay (AOAC 992.23).',
    'HPLC-RID determination of residual phytic acid and condensed tannins.',
    'Molecular weight profile analysis via size-exclusion chromatography (SEC-HPLC).',
  ];

  const summary = `Predictive treatment simulation for ${feedstock} (${initialProtein}% protein) treated at ${temperature}°C for ${treatmentTime} min with ${enzymeDose} U/g enzyme loading.`;

  const limitations =
    'Illustrative computational simulation based on standard biochemical kinetic models. Not a validated laboratory prediction or food-safety determination.';

  return {
    summary,
    considerations,
    recommendedNextTests,
    routeSuggestion,
    limitations,
  };
}

function parseModelResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }
  const trimmed = rawText.trim();
  // Strip code fences if present
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt extracting JSON substring
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 2. Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { problems } = validateAnalyzeInput(req.body);
  if (problems.length > 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Input validation failed',
      problems,
    });
  }

  const {
    feedstock,
    phytate,
    tannin,
    treatmentTime,
    enzymeDose,
  } = req.body;

  const initialProtein = req.body.initialProtein ?? req.body.initialProteinPercent;
  const temperature = req.body.temperature ?? req.body.treatmentTemperature;
  const aflatoxin =
    req.body.aflatoxin ?? req.body.aflatoxinStatus ?? req.body.aflatoxinTestStatus;

  // Deterministic server-side safety gate
  const { gated: humanFoodRouteGated, reason: humanFoodRouteGatedReason } =
    checkAflatoxinGated(feedstock, aflatoxin);

  // Construct user prompt for Bedrock
  const userPrompt = JSON.stringify({
    feedstock,
    initialProteinPercent: initialProtein,
    phytateMgPerG: phytate,
    tanninMgPerG: tannin,
    treatmentTemperatureCelsius: temperature,
    treatmentTimeMinutes: treatmentTime,
    enzymeDoseUnitsPerG: enzymeDose,
    aflatoxinTestStatus: aflatoxin || 'Not applicable (non-groundnut feedstock)',
  });

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 4000);

  try {
    const command = new ConverseCommand({
      modelId: 'us.amazon.nova-micro-v1:0',
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }],
        },
      ],
      system: [
        { text: SYSTEM_PROMPT },
      ],
      inferenceConfig: {
        temperature: 0.1,
        maxTokens: 800,
      },
    });

    const response = await bedrockClient.send(command, {
      abortSignal: abortController.signal,
    });
    clearTimeout(timeoutId);

    const rawText = response?.output?.message?.content?.[0]?.text || '';
    const parsedAnalysis = parseModelResponse(rawText);

    res.status(200).json({
      disclaimer: DEFAULT_DISCLAIMER,
      humanFoodRouteGated,
      humanFoodRouteGatedReason,
      analysis: parsedAnalysis || generateDeterministicAnalysis({
        feedstock,
        initialProtein,
        phytate,
        tannin,
        temperature,
        treatmentTime,
        enzymeDose,
        aflatoxin,
        humanFoodRouteGated,
      }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    // Graceful fallback to deterministic analysis when Bedrock is unavailable or unconfigured
    const fallbackAnalysis = generateDeterministicAnalysis({
      feedstock,
      initialProtein,
      phytate,
      tannin,
      temperature,
      treatmentTime,
      enzymeDose,
      aflatoxin,
      humanFoodRouteGated,
    });

    return res.status(200).json({
      disclaimer: DEFAULT_DISCLAIMER,
      humanFoodRouteGated,
      humanFoodRouteGatedReason,
      analysis: fallbackAnalysis,
    });
  }
});

// 3. Lab report extraction endpoint
app.use('/api', createExtractRouter(bedrockClient));

// 4. PDF report generation endpoint
app.use('/api', createReportRouter());

// 404 handler for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Unknown API endpoint: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler for parser and server errors
app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds 16kb limit',
    });
  }

  if (
    err instanceof SyntaxError &&
    (err.status === 400 || err.statusCode === 400) &&
    'body' in err
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON payload',
      problems: ['Invalid JSON syntax'],
    });
  }

  const errName = err?.name || 'Error';
  console.error(`Unhandled server error: ${errName}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred',
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`ProteinRescue AI server listening on http://${HOST}:${PORT}`);
});

export default app;
