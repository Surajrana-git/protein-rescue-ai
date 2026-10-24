/**
 * Shared analysis configuration, constants, validation, and safety gates.
 * Used by client forms, /api/analyze, and /api/report to ensure identical rules.
 */

export const ALLOWED_FEEDSTOCKS = ['Groundnut Cake', 'Guar Meal', 'Rice Bran'];

export const ALLOWED_AFLATOXIN_STATUSES = [
  'Not tested',
  'Tested – pending result',
  'Tested - pending result',
  'Result on file',
];

export const AFLATOXIN_OPTIONS = [
  'Not tested',
  'Tested – pending result',
  'Result on file',
];

export const NUMERIC_FIELDS = [
  { name: 'initialProtein', id: 'initialProtein', label: 'Initial protein', unit: '%', min: 0, max: 100, canPrefill: true },
  { name: 'phytate', id: 'phytate', label: 'Phytate', unit: 'mg/g', min: 0, max: 1000, canPrefill: true },
  { name: 'tannin', id: 'tannin', label: 'Tannin', unit: 'mg/g', min: 0, max: 1000, canPrefill: true },
  { name: 'temperature', id: 'temperature', label: 'Treatment temperature', unit: '°C', min: 0, max: 200, canPrefill: false },
  { name: 'treatmentTime', id: 'treatmentTime', label: 'Treatment time', unit: 'min', min: 0, max: 1440, canPrefill: false },
  { name: 'enzymeDose', id: 'enzymeDose', label: 'Enzyme dose', unit: 'U/g', min: 0, max: 5000, canPrefill: false },
];

export const INITIAL_FORM = {
  feedstock: '',
  initialProtein: '',
  phytate: '',
  tannin: '',
  temperature: '',
  treatmentTime: '',
  enzymeDose: '',
  aflatoxin: '',
};

export const DEFAULT_DISCLAIMER =
  'Illustrative simulation and unvalidated AI estimate only. Not a laboratory result, not scientifically validated, and not a food-safety or regulatory determination.';

/**
 * Deterministic server-side & client-side aflatoxin safety gate logic.
 */
export function checkAflatoxinGated(feedstock, aflatoxin) {
  if (feedstock === 'Groundnut Cake') {
    const normalized = (aflatoxin || '').trim().toLowerCase();
    if (normalized !== 'result on file') {
      return {
        gated: true,
        reason:
          'Groundnut Cake cannot be routed to human food applications without verified aflatoxin test results on file.',
      };
    }
    return {
      gated: false,
      reason:
        'Aflatoxin test result is recorded on file; independent certified laboratory and food safety specialist review required before any human-food clearance.',
    };
  }
  return {
    gated: false,
    reason:
      'Non-groundnut feedstock. Follow standard analytical testing protocols for protein and anti-nutrient profiles.',
  };
}

/**
 * Universal input validation used for API endpoints and client form validation.
 * @param {object} body
 * @returns {{ problems: string[], fieldErrors: Record<string, string>, isValid: boolean }}
 */
export function validateAnalyzeInput(body) {
  const problems = [];
  const fieldErrors = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      problems: ['Request body must be a valid JSON object'],
      fieldErrors: { form: 'Request body must be a valid JSON object' },
      isValid: false,
    };
  }

  // Feedstock validation
  if (!body.feedstock) {
    problems.push('feedstock is required');
    fieldErrors.feedstock = 'Please select a feedstock.';
  } else if (!ALLOWED_FEEDSTOCKS.includes(body.feedstock)) {
    const msg = `feedstock must be one of: ${ALLOWED_FEEDSTOCKS.join(', ')}`;
    problems.push(msg);
    fieldErrors.feedstock = msg;
  }

  // Aflatoxin validation (required for Groundnut Cake)
  const aflatoxin = body.aflatoxin ?? body.aflatoxinStatus ?? body.aflatoxinTestStatus;

  if (body.feedstock === 'Groundnut Cake') {
    if (!aflatoxin) {
      problems.push('aflatoxin status is required when feedstock is Groundnut Cake');
      fieldErrors.aflatoxin = 'Please select an aflatoxin test status.';
    } else if (!ALLOWED_AFLATOXIN_STATUSES.includes(aflatoxin)) {
      const msg = 'aflatoxin status must be one of: Not tested, Tested – pending result, Result on file';
      problems.push(msg);
      fieldErrors.aflatoxin = msg;
    }
  } else if (aflatoxin !== undefined && aflatoxin !== null && aflatoxin !== '') {
    if (!ALLOWED_AFLATOXIN_STATUSES.includes(aflatoxin)) {
      const msg = 'aflatoxin status must be one of: Not tested, Tested – pending result, Result on file';
      problems.push(msg);
      fieldErrors.aflatoxin = msg;
    }
  }

  // Numeric fields helper
  function checkField(val, id, { label, min = 0, max = Infinity, unit = '' }) {
    if (val === undefined || val === null || val === '') {
      problems.push(`${id} is required`);
      fieldErrors[id] = `${label} is required.`;
      return;
    }
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) {
      problems.push(`${id} must be a finite number`);
      fieldErrors[id] = 'Must be a number.';
      return;
    }
    if (num < min) {
      problems.push(`${id} must be non-negative (>= ${min}${unit})`);
      fieldErrors[id] = `Must be ≥ ${min}.`;
    } else if (num > max) {
      problems.push(`${id} must be <= ${max}${unit}`);
      fieldErrors[id] = `Must be ≤ ${max}.`;
    }
  }

  const initialProtein = body.initialProtein ?? body.initialProteinPercent;
  checkField(initialProtein, 'initialProtein', { label: 'Initial protein', min: 0, max: 100, unit: '%' });
  checkField(body.phytate, 'phytate', { label: 'Phytate', min: 0, unit: ' mg/g' });
  checkField(body.tannin, 'tannin', { label: 'Tannin', min: 0, unit: ' mg/g' });

  const temperature = body.temperature ?? body.treatmentTemperature;
  checkField(temperature, 'temperature', { label: 'Treatment temperature', min: 0, unit: '°C' });
  checkField(body.treatmentTime, 'treatmentTime', { label: 'Treatment time', min: 0, unit: ' min' });
  checkField(body.enzymeDose, 'enzymeDose', { label: 'Enzyme dose', min: 0, unit: ' U/g' });

  return {
    problems,
    fieldErrors,
    isValid: problems.length === 0,
  };
}
