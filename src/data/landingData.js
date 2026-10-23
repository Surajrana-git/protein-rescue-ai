/**
 * Data arrays for the landing page.
 * Keeps JSX clean — edit content here.
 */

export const NAV_ITEMS = [
  { to: '/',               label: 'HOME' },
  { to: '/history-report', label: 'HISTORY/REPORT' },
  { to: '/safety-check',   label: 'SAFETY CHECK' },
  { to: '/help-centre',    label: 'HELP CENTRE' },
]

export const STEPS = [
  {
    step: '01',
    title: 'UPLOAD THE LAB REPORT',
    action: 'scroll-upload', // special: scroll to upload zone
    active: true,
  },
  {
    step: '02',
    title: 'ROUTE SUGGESTION',
    action: '/app/new-analysis',
    active: false,
  },
  {
    step: '03',
    title: 'RECOMMENDATION / LIMITATION',
    action: '/app/new-analysis',
    active: false,
  },
  {
    step: '04',
    title: 'REPORT GENERATION (.PDF)',
    action: '/app/reports',
    active: false,
  },
]

export const FEATURE_CARDS = [
  {
    icon: '/images/icon-database.png',
    iconAlt: 'Database analysis icon',
    title: 'DATA BASED ANALYSIS',
    text: 'View detailed lab reports on your agro-waste and get instant, accurate insight into its nutrient and protein potential.',
    to: '/#analyze',
  },
  {
    icon: '/images/icon-flask.png',
    iconAlt: 'Treatment flask icon',
    title: 'TREATMENT SIMULATOR',
    text: 'Simulate upcycling methods (like fermentation or enzymes) to see exactly how to extract the highest value from your waste',
    to: '/treatment-simulator',
  },
  {
    icon: '/images/icon-cost.png',
    iconAlt: 'Cost comparison chart icon',
    title: 'COST COMPARISON',
    text: 'Compare upcycling costs against regular disposal to see how much you save and exactly where you can make a profit.',
    to: '/cost-comparison',
  },
]

export const FOOTER_FEATURES = [
  { label: 'Instant Lab Parsing',   action: 'scroll-upload' },
  { label: 'Compound Detection',    to: '/compound-detection' },
  { label: 'Treatment Simulation',  to: '/treatment-simulator' },
  { label: 'Quality Prediction',    to: '/quality-prediction' },
]

export const FOOTER_ECONOMICS = [
  { label: 'Direct Benchmark',      to: '/cost-comparison' },
  { label: 'Financial Modeling',     to: '/cost-comparison' },
  { label: 'Scientific Accuracy',   to: '/scientific-accuracy' },
  { label: 'FSSAI Compliance',      to: '/fssai-compliance' },
]

export const FOOTER_BOTTOM_LINKS = [
  { label: 'FSSAI Compliance', to: '/fssai-compliance' },
  { label: 'Methodology',      to: '/methodology' },
]

export const PLACEHOLDER_ROUTES = [
  { path: '/treatment-simulator', title: 'Treatment Simulator' },
  { path: '/cost-comparison',     title: 'Cost Comparison' },
  { path: '/login',               title: 'Login' },
  { path: '/methodology',         title: 'Methodology' },
  { path: '/fssai-compliance',    title: 'FSSAI Compliance' },
  { path: '/compound-detection',  title: 'Compound Detection' },
  { path: '/quality-prediction',  title: 'Quality Prediction' },
  { path: '/scientific-accuracy', title: 'Scientific Accuracy' },
]
