/**
 * Help Topics Data for ProteinRescue AI Help Centre.
 * Written in 3 to 5 short, factual steps using only current app capabilities.
 * No marketing claims, no em dashes, plain and specific.
 */

export const HELP_TOPICS = [
  {
    slug: 'uploading-lab-report',
    title: 'Uploading Lab Report',
    shortDesc: 'Learn how to upload your lab report and supported file formats.',
    category: 'Getting Started',
    steps: [
      'Navigate to the Home page and locate the Lab Report Upload card.',
      'Drag and drop your report or click to browse. Supported formats are PDF, PNG, JPEG, DOCX, and CSV with a 10 MB file size limit.',
      'Automatic parsing reads text-based PDF documents in memory to extract protein, phytate, and tannin values.',
      'If your document is scanned or non-PDF, click Enter values manually to input laboratory measurements directly into the form.',
      'Review and verify every prefilled number before continuing to Route Suggestion.',
    ],
  },
  {
    slug: 'safety-check',
    title: 'Safety Check',
    shortDesc: 'Understand the safety parameters we analyse.',
    category: 'Safety & Quality',
    steps: [
      'Open the Safety Check page from the main navigation bar to review monitored parameters.',
      'The system tracks indicators including aflatoxin, crude protein, moisture, phytate, tannin, saponin, trypsin inhibitors, and heavy metals.',
      'For Groundnut Cake feedstock, human food routing requires an explicit aflatoxin laboratory test result on file.',
      'Safety Check is an informational tool. It does not certify food safety or regulatory compliance.',
      'All treatment suggestions and outputs are illustrative simulations, not validated predictions.',
    ],
  },
  {
    slug: 'treatment-simulation',
    title: 'Treatment Simulation',
    shortDesc: 'Learn how treatment recommendations are generated.',
    category: 'Analysis & Simulation',
    steps: [
      'Enter your by-product composition and processing parameters on the Home page wizard.',
      'Step 02 runs an automated analysis based on initial protein, phytate, tannin, temperature, time, and enzyme dose.',
      'The system evaluates pathway feasibility and flags gating constraints such as aflatoxin requirements.',
      'Step 03 lists recommended empirical validation assays and highlights operational limitations.',
      'Simulation results are model estimates for research planning and must be confirmed with wet-lab testing.',
    ],
  },
  {
    slug: 'history-report',
    title: 'History Report',
    shortDesc: 'View, download and manage your past reports.',
    category: 'Reports & Records',
    steps: [
      'Open the History/Report page from the top navigation menu.',
      'The current list displays sample demonstration entries to preview the archive interface.',
      'You can filter sample records by status, protein category, date range, or free-text search.',
      'Click View Report to inspect sample parameters, or Delete to remove an entry in memory for this session.',
      'Permanent cloud report storage is not active yet. Reloading the page restores the demo records.',
    ],
  },
  {
    slug: 'report-insights',
    title: 'Report Insights',
    shortDesc: 'Understand the results and evidence shown in the report.',
    category: 'Analysis & Simulation',
    steps: [
      'Complete the 4-step wizard on the Home page to reach Report Generation.',
      'Click Generate PDF report to download a multi-page analytical dossier created by the backend.',
      'The report documents feedstock inputs, simulation pathway rationale, and safety boundaries.',
      'A dedicated validation section outlines recommended laboratory assays and analytical limitations.',
      'Draft values and citations are labeled so your technical team can audit every underlying assumption.',
    ],
  },
  {
    slug: 'account-settings',
    title: 'Account & Settings',
    shortDesc: 'Manage your profile, preferences and account details.',
    category: 'Account',
    steps: [
      'User accounts and authentication profiles are not available yet.',
      'All analysis workflows and parameter simulations run openly without requiring login credentials.',
      'Session inputs remain stored in browser memory only and are cleared when you refresh or close the tab.',
      'For team inquiries or project collaboration, use the Hack The Fork link in the utility header.',
    ],
  },
  {
    slug: 'quick-start',
    title: 'Quick Start Guide',
    shortDesc: 'Get started with ProteinRescue AI in minutes.',
    category: 'Getting Started',
    steps: [
      'Step 1: Upload your agro-waste laboratory report (PDF up to 10 MB) or select Enter values manually.',
      'Step 2: Choose your by-product feedstock and verify or enter protein, phytate, tannin, and treatment conditions.',
      'Step 3: Review the Route Suggestion pathway, conversion estimate, and safety gate indicators.',
      'Step 4: Check recommended validation assays and click Generate PDF report to download your simulation dossier.',
    ],
  },
]
