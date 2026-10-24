import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Upload,
  Info,
  FileText,
  Biohazard,
  FlaskConical,
  Droplets,
  Sprout,
  Share2,
  Layers,
} from 'lucide-react'
import styles from './SafetyCheck.module.css'

// Custom inline SVG for Tannin (cluster of polyphenol hexagons)
function TanninHexagons({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Top hexagon */}
      <polygon points="12,2 16,4.5 16,9.5 12,12 8,9.5 8,4.5" />
      {/* Bottom right hexagon */}
      <polygon points="17.5,11.5 21.5,14 21.5,19 17.5,21.5 13.5,19 13.5,14" />
      {/* Bottom left hexagon */}
      <polygon points="6.5,11.5 10.5,14 10.5,19 6.5,21.5 2.5,19 2.5,14" />
    </svg>
  )
}

// Custom inline SVG for Trypsin Inhibitor (protective enzyme inhibitor dome)
function TrypsinInhibitorDome({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Curved dome shape */}
      <path d="M4 19h16" />
      <path d="M5 19c0-6.627 3.134-12 7-12s7 5.373 7 12" />
      <line x1="12" y1="7" x2="12" y2="4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" />
    </svg>
  )
}

const SAFETY_PARAMETERS = [
  {
    id: 'aflatoxin',
    title: 'Aflatoxin',
    description: 'Checks if aflatoxin levels are within safe limits.',
    tileClass: styles.tileRed,
    icon: <Biohazard size={24} />,
  },
  {
    id: 'protein',
    title: 'Protein Content',
    description: 'Analyses protein levels in your sample.',
    tileClass: styles.tileBlue,
    icon: <FlaskConical size={24} />,
  },
  {
    id: 'moisture',
    title: 'Moisture',
    description: 'Evaluates moisture content for stability.',
    tileClass: styles.tileOrange,
    icon: <Droplets size={24} />,
  },
  {
    id: 'phytate',
    title: 'Phytate',
    description: 'Checks phytate levels (anti-nutrient).',
    tileClass: styles.tileGreen,
    icon: <Sprout size={24} />,
  },
  {
    id: 'tannin',
    title: 'Tannin',
    description: 'Analyses tannin levels (anti-nutrient).',
    tileClass: styles.tilePurple,
    icon: <TanninHexagons size={24} />,
  },
  {
    id: 'saponin',
    title: 'Saponin',
    description: 'Checks saponin levels (anti-nutrient).',
    tileClass: styles.tileSalmon,
    icon: <Share2 size={24} />,
  },
  {
    id: 'trypsin',
    title: 'Trypsin Inhibitor',
    description: 'Evaluates trypsin inhibitor levels (anti-nutrient).',
    tileClass: styles.tileCyan,
    icon: <TrypsinInhibitorDome size={24} />,
  },
  {
    id: 'heavy-metals',
    title: 'Heavy Metals',
    description: 'Checks for heavy metals (safety parameter).',
    tileClass: styles.tileSlate,
    icon: <Layers size={24} />,
  },
]

export default function SafetyCheck() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Title row */}
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconTile}>
              <ShieldCheck size={26} className={styles.headerIcon} />
            </div>
            <div>
              <h1 className={styles.pageTitle}>Safety Check</h1>
              <p className={styles.pageSubtitle}>
                Check key safety and quality parameters of your by-product before treatment simulation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/#analyze')}
            className={styles.uploadBtn}
          >
            <Upload size={18} />
            <div className={styles.uploadBtnTextCol}>
              <span className={styles.uploadBtnMain}>Upload Lab Report</span>
              <span className={styles.uploadBtnSub}>PDF, JPG, PNG (Max 10MB)</span>
            </div>
          </button>
        </div>

        {/* Large White Rounded Card */}
        <div className={styles.mainCard}>
          {/* Card Header */}
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardHeading}>Safety Parameters</h2>
              <p className={styles.cardSubtitle}>
                We analyse the key safety and quality indicators from your lab report.
              </p>
            </div>

            <div className={styles.cardHeaderRight}>
              <button
                type="button"
                className={styles.infoTooltipBtn}
                title="Parameters are read from your lab report when available. This page does not certify safety."
                aria-label="Safety parameters information note"
              >
                <Info size={18} />
              </button>

              <span className={styles.labReportDataPill}>
                <FileText size={14} className={styles.pillIcon} />
                <span>Based on lab report data</span>
              </span>
            </div>
          </div>

          {/* 4x2 Grid of 8 Parameter Cards */}
          <div className={styles.paramGrid}>
            {SAFETY_PARAMETERS.map((param) => (
              <div key={param.id} className={styles.paramCard}>
                <div className={`${styles.paramIconTile} ${param.tileClass}`}>
                  {param.icon}
                </div>
                <h3 className={styles.paramTitle}>{param.title}</h3>
                <p className={styles.paramDesc}>{param.description}</p>
              </div>
            ))}
          </div>

          {/* Bottom Info Banner */}
          <div className={styles.infoBanner}>
            <div className={styles.bannerIconWrapper}>
              <Info size={22} className={styles.bannerIcon} />
            </div>
            <div className={styles.bannerContent}>
              <div className={styles.bannerTitle}>
                Upload a lab report to analyse these safety parameters.
              </div>
              <div className={styles.bannerSubtitle}>
                We'll automatically extract the values and show the safety status for each parameter.
              </div>
            </div>
          </div>

          {/* Protected Safety Rule Informational Disclaimer Line */}
          <p className={styles.disclaimerLine}>
            This page is informational. It does not certify food safety or regulatory compliance. Sample outputs are illustrative simulations, not validated predictions.
          </p>
        </div>
      </div>
    </div>
  )
}
