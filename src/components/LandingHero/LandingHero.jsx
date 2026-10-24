import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  ALLOWED_FEEDSTOCKS,
  AFLATOXIN_OPTIONS,
  NUMERIC_FIELDS,
  INITIAL_FORM,
  validateAnalyzeInput,
  checkAflatoxinGated,
} from '../../data/analysisSchema.js'
import { STEPS } from '../../data/landingData.js'
import styles from './LandingHero.module.css'

const UPLOAD_CARD_SUBTITLE = 'AWS Textract OCR • Instant Parameter Parsing'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.csv']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/csv',
]

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function LandingHero() {
  // ── Step Navigation ──
  const [activeStep, setActiveStep] = useState('01')

  // ── Step 01: File & Extraction State ──
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState(null)
  const [sourceInfo, setSourceInfo] = useState({})
  const [hasCheckedPrefill, setHasCheckedPrefill] = useState(false)

  // ── Form State ──
  const [form, setForm] = useState(INITIAL_FORM)
  const [touched, setTouched] = useState({})

  // ── Step 02 & 03: Analyze State ──
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeData, setAnalyzeData] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)

  // ── Step 04: Report Generation State ──
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [reportSuccess, setReportSuccess] = useState(null)

  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const isGroundnut = form.feedstock === 'Groundnut Cake'
  const hasPrefilledValues = Object.keys(sourceInfo).length > 0

  // ── Validation Computation ──
  const validation = useMemo(() => {
    return validateAnalyzeInput(form)
  }, [form])

  // Determine what is missing for Step 01 Next button
  const missingItems = useMemo(() => {
    const missing = []
    if (!form.feedstock) missing.push('By-product')
    if (isGroundnut && !form.aflatoxin) missing.push('Aflatoxin status')

    NUMERIC_FIELDS.forEach((f) => {
      const val = form[f.name]
      if (val === '' || val === undefined || val === null) {
        missing.push(f.label)
      } else {
        const num = Number(val)
        if (Number.isNaN(num) || num < f.min || (f.max !== undefined && num > f.max)) {
          missing.push(`${f.label} (valid range)`)
        }
      }
    })

    if (hasPrefilledValues && !hasCheckedPrefill) {
      missing.push('review confirmation')
    }

    return missing
  }, [form, isGroundnut, hasPrefilledValues, hasCheckedPrefill])

  const isStep1Valid = missingItems.length === 0

  // ── Extract report via POST /api/extract-report ──
  const extractReport = useCallback(async (fileObj) => {
    const isPdf =
      fileObj.type === 'application/pdf' || fileObj.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      setExtractionStatus({
        type: 'non-pdf',
        text: 'Automatic reading works for text PDFs only for now. Enter the values manually.',
      })
      return
    }

    setIsExtracting(true)
    setExtractionStatus({
      type: 'extracting',
      text: 'Reading your report...',
    })

    const formData = new FormData()
    formData.append('report', fileObj)

    try {
      const response = await fetch('/api/extract-report', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        const fields = data.fields || data
        let foundCount = 0
        const newSourceInfo = {}
        const formUpdates = {}

        if (fields.proteinPct && fields.proteinPct.value !== null) {
          foundCount++
          formUpdates.initialProtein = fields.proteinPct.value
          newSourceInfo.initialProtein = { ...fields.proteinPct, isEdited: false }
        }
        if (fields.phytate && fields.phytate.value !== null) {
          foundCount++
          formUpdates.phytate = fields.phytate.value
          newSourceInfo.phytate = { ...fields.phytate, isEdited: false }
        }
        if (fields.tannin && fields.tannin.value !== null) {
          foundCount++
          formUpdates.tannin = fields.tannin.value
          newSourceInfo.tannin = { ...fields.tannin, isEdited: false }
        }

        setSourceInfo(newSourceInfo)
        setForm((prev) => ({ ...prev, ...formUpdates }))

        if (foundCount > 0) {
          setExtractionStatus({
            type: 'success',
            text: `Found ${foundCount} of 3 lab values. Check each one below.`,
          })
        } else {
          setExtractionStatus({
            type: 'none',
            text: 'No lab values were found. Enter them manually below.',
          })
        }
      } else if (response.status === 422) {
        setExtractionStatus({
          type: 'scanned',
          text: 'This PDF looks scanned, so it could not be read. Enter the values manually.',
        })
      } else {
        setExtractionStatus({
          type: 'error',
          text: 'Automatic reading is not available right now. Enter the values manually.',
        })
      }
    } catch {
      setExtractionStatus({
        type: 'error',
        text: 'Automatic reading is not available right now. Enter the values manually.',
      })
    } finally {
      setIsExtracting(false)
    }
  }, [])

  function validateAndSetFile(candidate) {
    setFileError(null)
    if (!candidate) return

    const name = candidate.name.toLowerCase()
    const extMatch = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
    const typeMatch = ALLOWED_MIME_TYPES.includes(candidate.type.toLowerCase())

    if (!extMatch && !typeMatch) {
      setFileError('Invalid file type. Supported formats: PDF, PNG, JPEG, DOCX, CSV.')
      setFile(null)
      return
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds the 10 MB limit. Please select a smaller file.')
      setFile(null)
      return
    }

    setFile(candidate)
    extractReport(candidate)
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0]
    validateAndSetFile(selected)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    validateAndSetFile(dropped)
  }

  function handleRemoveFile(e) {
    e.stopPropagation()
    setFile(null)
    setFileError(null)
    setExtractionStatus(null)
    setSourceInfo({})
    setHasCheckedPrefill(false)
    setForm(INITIAL_FORM)
    setTouched({})
    setAnalyzeData(null)
    setAnalyzeError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleInputChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))

    // If this field was prefilled from report, mark it as edited
    if (sourceInfo[name]) {
      setSourceInfo((prev) => ({
        ...prev,
        [name]: { ...prev[name], isEdited: true },
      }))
    }

    // Invalidate stale analysis results if parameters change
    setAnalyzeData(null)
    setAnalyzeError(null)
  }

  function handleInputBlur(name) {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  // ── Step 02: Analysis execution ──
  const runAnalysis = useCallback(async () => {
    setAnalyzeLoading(true)
    setAnalyzeError(null)

    const payload = {
      feedstock: form.feedstock,
      initialProtein: Number(form.initialProtein),
      phytate: Number(form.phytate),
      tannin: Number(form.tannin),
      temperature: Number(form.temperature),
      treatmentTime: Number(form.treatmentTime),
      enzymeDose: Number(form.enzymeDose),
      ...(isGroundnut || form.aflatoxin ? { aflatoxin: form.aflatoxin } : {}),
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setAnalyzeData(data)
      } else {
        setAnalyzeError('Route suggestion is not available right now.')
      }
    } catch {
      setAnalyzeError('Route suggestion is not available right now.')
    } finally {
      setAnalyzeLoading(false)
    }
  }, [form, isGroundnut])

  // Trigger analysis when entering Step 02 if not already loaded
  useEffect(() => {
    if (activeStep === '02' && !analyzeData && !analyzeLoading && isStep1Valid) {
      runAnalysis()
    }
  }, [activeStep, analyzeData, analyzeLoading, isStep1Valid, runAnalysis])

  // ── Step 04: Generate PDF Report ──
  async function handleGenerateReport() {
    setReportLoading(true)
    setReportError(null)
    setReportSuccess(null)

    const payload = {
      feedstock: form.feedstock,
      initialProtein: Number(form.initialProtein),
      phytate: Number(form.phytate),
      tannin: Number(form.tannin),
      temperature: Number(form.temperature),
      treatmentTime: Number(form.treatmentTime),
      enzymeDose: Number(form.enzymeDose),
      ...(isGroundnut || form.aflatoxin ? { aflatoxin: form.aflatoxin } : {}),
    }

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Report generation is not available yet.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `protein-rescue-report-${form.feedstock.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setReportSuccess(`Report downloaded: ${filename}`)
    } catch {
      setReportError('Report generation is not available yet.')
    } finally {
      setReportLoading(false)
    }
  }

  function handleResetAll() {
    setActiveStep('01')
    setFile(null)
    setFileError(null)
    setIsManualEntry(false)
    setIsExtracting(false)
    setExtractionStatus(null)
    setSourceInfo({})
    setHasCheckedPrefill(false)
    setForm(INITIAL_FORM)
    setTouched({})
    setAnalyzeLoading(false)
    setAnalyzeData(null)
    setAnalyzeError(null)
    setReportLoading(false)
    setReportError(null)
    setReportSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ── Deterministic Safety Gate for Step 02 ──
  const gateInfo = useMemo(() => {
    return checkAflatoxinGated(form.feedstock, form.aflatoxin)
  }, [form.feedstock, form.aflatoxin])

  // Dynamic Card Title & Subtitle based on active step
  const cardHeadings = useMemo(() => {
    switch (activeStep) {
      case '01':
        return {
          title: 'Lab Report Upload',
          subtitle: UPLOAD_CARD_SUBTITLE,
        }
      case '02':
        return {
          title: 'Route Suggestion',
          subtitle: 'Simulated processing pathway and conversion efficiency',
        }
      case '03':
        return {
          title: 'Recommendation / Limitation',
          subtitle: 'Critical validation protocols and enzyme boundary conditions',
        }
      case '04':
        return {
          title: 'Report Generation (.PDF)',
          subtitle: 'Download comprehensive analytical dossier',
        }
      default:
        return { title: 'Lab Report Upload', subtitle: UPLOAD_CARD_SUBTITLE }
    }
  }, [activeStep])

  return (
    <section id="analyze" className={styles.heroSection} aria-label="Hero Section">
      {/* Hero heading */}
      <div className={styles.headingWrapper}>
        <h1 className={styles.mainHeading}>
          Turn Agro-Industrial By-Products into{' '}
          <span className={styles.navyPill}>High-Value Protein</span>
        </h1>
      </div>

      {/* Hero row: Left Guided Flow Card + Right Step Tracker */}
      <div className={styles.heroRow}>
        {/* Left card: Guided Flow 4-Step Wizard */}
        <div className={styles.leftCard}>
          <div className={styles.cardHeader}>
            <div className={styles.folderIconBadge}>
              <svg
                className={styles.folderIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className={styles.cardTitle}>{cardHeadings.title}</h2>
              <p className={styles.cardSubtitle}>{cardHeadings.subtitle}</p>
            </div>
          </div>

          {/* ══════════ STEP 01: Upload & Parameters ══════════ */}
          {activeStep === '01' && (
            <div>
              {/* File Drop Zone or Compact File Row */}
              {!file ? (
                <div>
                  <div
                    id="lab-report-upload-zone"
                    ref={dropZoneRef}
                    tabIndex={0}
                    role="button"
                    aria-label="Upload laboratory report. Drag and drop file or press Enter to browse."
                    className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.csv"
                      onChange={handleFileChange}
                      className={styles.hiddenInput}
                      tabIndex={-1}
                      aria-hidden="true"
                    />

                    <div className={styles.dropZoneDefault}>
                      <svg
                        className={styles.cloudIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m16 16-4-4-4 4" />
                      </svg>
                      <span className={styles.uploadPrompt}>UPLOAD FILE</span>
                      <span className={styles.uploadFormats}>
                        (PDF, PNG, JPEG, DOCX, CSV)
                      </span>
                    </div>
                  </div>

                  <div className={styles.disclaimerRow}>
                    <span className={styles.disclaimerLabel}>Disclaimer:</span>{' '}
                    <span className={styles.disclaimerText}>
                      AI may occasionally misread characters. Please upload a clear,
                      high-resolution file for accurate parsing.
                    </span>
                  </div>

                  {!isManualEntry && (
                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setIsManualEntry(true)}
                        className={styles.manualLink}
                      >
                        Enter values manually
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Dashed zone shrinks to compact file row */}
                  <div className={styles.compactFileRow}>
                    <svg
                      className={styles.fileDocIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className={styles.removeBtn}
                      aria-label="Remove uploaded file"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Status line below file row (plain text, NO checkmarks) */}
                  {isExtracting && (
                    <div className={styles.statusLine}>Reading your report...</div>
                  )}
                  {!isExtracting && extractionStatus && (
                    <div className={styles.statusLine}>{extractionStatus.text}</div>
                  )}
                </div>
              )}

              {fileError && (
                <div className={styles.errorNotice} role="alert" style={{ marginTop: 10 }}>
                  {fileError}
                </div>
              )}

              {/* Form Section (shown if file selected OR manual entry toggled) */}
              {(file || isManualEntry) && (
                <div className={styles.formSection}>
                  <div className={styles.formSectionLabel}>COMPOSITION & TREATMENT</div>

                  {/* Feedstock and Aflatoxin Dropdowns */}
                  <div className={styles.topFieldsRow}>
                    <div className={styles.fieldCol}>
                      <label htmlFor="feedstock-select" className={styles.fieldLabel}>
                        By-product
                      </label>
                      <select
                        id="feedstock-select"
                        name="feedstock"
                        value={form.feedstock}
                        onChange={(e) => handleInputChange('feedstock', e.target.value)}
                        onBlur={() => handleInputBlur('feedstock')}
                        className={`${styles.fieldSelect} ${
                          touched.feedstock && validation.fieldErrors.feedstock
                            ? styles.inputError
                            : ''
                        }`}
                      >
                        <option value="">Select By-product...</option>
                        {ALLOWED_FEEDSTOCKS.map((fs) => (
                          <option key={fs} value={fs}>
                            {fs}
                          </option>
                        ))}
                      </select>
                      {touched.feedstock && validation.fieldErrors.feedstock && (
                        <span className={styles.fieldError}>
                          {validation.fieldErrors.feedstock}
                        </span>
                      )}
                    </div>

                    {isGroundnut && (
                      <div className={styles.fieldCol}>
                        <label htmlFor="aflatoxin-select" className={styles.fieldLabel}>
                          Aflatoxin test status
                        </label>
                        <select
                          id="aflatoxin-select"
                          name="aflatoxin"
                          value={form.aflatoxin}
                          onChange={(e) => handleInputChange('aflatoxin', e.target.value)}
                          onBlur={() => handleInputBlur('aflatoxin')}
                          className={`${styles.fieldSelect} ${
                            touched.aflatoxin && validation.fieldErrors.aflatoxin
                              ? styles.inputError
                              : ''
                          }`}
                        >
                          <option value="">Select status...</option>
                          {AFLATOXIN_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {touched.aflatoxin && validation.fieldErrors.aflatoxin && (
                          <span className={styles.fieldError}>
                            {validation.fieldErrors.aflatoxin}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2-Column Grid of 6 Number Inputs */}
                  <div className={styles.formGrid}>
                    {NUMERIC_FIELDS.map((f) => {
                      const isFieldTouched = touched[f.name]
                      const err = validation.fieldErrors[f.name]
                      const prefill = sourceInfo[f.name]

                      return (
                        <div key={f.name} className={styles.fieldCol}>
                          <label htmlFor={`input-${f.name}`} className={styles.fieldLabel}>
                            <span>{f.label}</span>
                            <span className={styles.fieldUnit}>({f.unit})</span>
                          </label>

                          <input
                            id={`input-${f.name}`}
                            name={f.name}
                            type="number"
                            step="any"
                            placeholder="0"
                            value={form[f.name]}
                            onChange={(e) => handleInputChange(f.name, e.target.value)}
                            onBlur={() => handleInputBlur(f.name)}
                            className={`${styles.fieldInput} ${
                              isFieldTouched && err ? styles.inputError : ''
                            }`}
                          />

                          {isFieldTouched && err && (
                            <span className={styles.fieldError}>{err}</span>
                          )}

                          {/* Prefill evidence and source information */}
                          {prefill && (
                            <div className={styles.prefillMeta}>
                              <span
                                className={
                                  prefill.isEdited
                                    ? styles.prefillEdited
                                    : styles.prefillTag
                                }
                              >
                                {prefill.isEdited
                                  ? `From report: ${prefill.originalValue} ${prefill.originalUnit} (Edited)`
                                  : `From report: ${prefill.originalValue} ${prefill.originalUnit}, page ${prefill.page}`}
                              </span>

                              {prefill.evidence && (
                                <details className={styles.evidenceDetails}>
                                  <summary>Show evidence</summary>
                                  <q>{prefill.evidence}</q>
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* AI assist notice & Verification checkbox */}
                  {hasPrefilledValues && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className={styles.aiAssistNotice}>
                        AI-assisted extraction. Review every value against your report.
                      </div>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={hasCheckedPrefill}
                          onChange={(e) => setHasCheckedPrefill(e.target.checked)}
                          className={styles.checkboxInput}
                        />
                        <span>I checked these values against the report</span>
                      </label>
                    </div>
                  )}

                  {/* Primary Next Button */}
                  <button
                    type="button"
                    disabled={!isStep1Valid}
                    onClick={() => setActiveStep('02')}
                    className={styles.primaryActionBtn}
                  >
                    Next: Route Suggestion &rarr;
                  </button>

                  {!isStep1Valid && (
                    <p className={styles.missingNotice}>
                      Missing: {missingItems.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════ STEP 02: Route Suggestion ══════════ */}
          {activeStep === '02' && (
            <div className={styles.stepBox}>
              {/* Immediate Deterministic Safety Gate */}
              {isGroundnut && (
                <div
                  className={`${styles.gateAlert} ${
                    gateInfo.gated ? styles.gateGated : styles.gateCleared
                  }`}
                >
                  {gateInfo.gated
                    ? 'Human food route gated: an aflatoxin test result is required first.'
                    : 'Aflatoxin result on file. It must be reviewed by a qualified laboratory.'}
                </div>
              )}

              {/* Analyze Loading Skeleton */}
              {analyzeLoading && (
                <div className={styles.skeletonContainer}>
                  <div className={styles.skeletonBar} style={{ width: '85%' }} />
                  <div className={styles.skeletonBar} style={{ width: '95%' }} />
                  <div className={styles.skeletonBar} style={{ width: '60%' }} />
                </div>
              )}

              {/* Analyze Error Notice */}
              {analyzeError && (
                <div className={styles.errorNotice} role="alert">
                  {analyzeError}
                </div>
              )}

              {/* Short Summary (at most 3 lines) */}
              {analyzeData && !analyzeLoading && (
                <div>
                  <div className={styles.sectionSubheading}>Simulation Pathway</div>
                  <ul className={styles.bulletList} style={{ marginTop: 6 }}>
                    {(
                      analyzeData.analysis?.routeSuggestion ||
                      analyzeData.analysis?.summary ||
                      'Enzymatic treatment potential identified for this feedstock composition.'
                    )
                      .split(/(?<=[.?!])\s+/)
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((sentence, idx) => (
                        <li key={idx} className={styles.bulletItem}>
                          <span className={styles.bulletDot}>•</span>
                          <span>{sentence.trim()}</span>
                        </li>
                      ))}
                  </ul>

                  <p className={styles.fixedDisclaimer}>
                    Illustrative simulation, not a validated prediction.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.stepActionsRow}>
                <button
                  type="button"
                  onClick={() => setActiveStep('01')}
                  className={styles.backBtn}
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('03')}
                  className={styles.stepNextBtn}
                >
                  Next: Recommendation / Limitation &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 03: Recommendation / Limitation ══════════ */}
          {activeStep === '03' && (
            <div className={styles.stepBox}>
              <div>
                <div className={styles.sectionSubheading}>Recommended Next Tests</div>
                <ul className={styles.bulletList} style={{ marginTop: 6 }}>
                  {analyzeData?.analysis?.recommendedNextTests &&
                  analyzeData.analysis.recommendedNextTests.length > 0 ? (
                    analyzeData.analysis.recommendedNextTests
                      .slice(0, 3)
                      .map((test, idx) => (
                        <li key={idx} className={styles.bulletItem}>
                          <span className={styles.bulletDot}>•</span>
                          <span>{test}</span>
                        </li>
                      ))
                  ) : (
                    <li className={styles.bulletItem}>
                      <span className={styles.bulletDot}>•</span>
                      <span>Empirical crude protein assay (AOAC / Dumas method).</span>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <div className={styles.sectionSubheading}>Simulation Limitations</div>
                <ul className={styles.bulletList} style={{ marginTop: 6 }}>
                  {analyzeData?.analysis?.considerations &&
                  analyzeData.analysis.considerations.length > 0 ? (
                    analyzeData.analysis.considerations.slice(0, 3).map((item, idx) => (
                      <li key={idx} className={styles.bulletItem}>
                        <span className={styles.bulletDot}>•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className={styles.bulletItem}>
                        <span className={styles.bulletDot}>•</span>
                        <span>Illustrative simulation, not validated.</span>
                      </li>
                      <li className={styles.bulletItem}>
                        <span className={styles.bulletDot}>•</span>
                        <span>Not a food-safety or regulatory determination.</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <p className={styles.fixedDisclaimer}>Full details are in the PDF report.</p>

              {/* Action Buttons */}
              <div className={styles.stepActionsRow}>
                <button
                  type="button"
                  onClick={() => setActiveStep('02')}
                  className={styles.backBtn}
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('04')}
                  className={styles.stepNextBtn}
                >
                  Next: Report Generation &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 04: Report Generation (.PDF) ══════════ */}
          {activeStep === '04' && (
            <div className={styles.stepBox}>
              <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                The PDF has the full route suggestion, recommendations, limitations,
                graphs, and cost details.
              </p>

              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className={styles.primaryActionBtn}
              >
                {reportLoading ? 'Generating PDF...' : 'Generate PDF report'}
              </button>

              {reportError && (
                <div className={styles.errorNotice} role="alert">
                  {reportError}
                </div>
              )}

              {reportSuccess && (
                <div className={styles.successNotice} role="status">
                  {reportSuccess}
                </div>
              )}

              <button
                type="button"
                onClick={handleResetAll}
                className={styles.resetBtn}
              >
                Start new analysis
              </button>
            </div>
          )}
        </div>

        {/* Right column: Paragraph & Stacked Steps (Progress Tracker) */}
        <div className={styles.rightCol}>
          <p className={styles.rightParagraph}>
            Review a sample batch, examine recovery assumptions and compare estimated
            processing costs. Draft values remain labeled for review.
          </p>

          {/* 4 Step Tracker Buttons */}
          <div className={styles.stepsStack} aria-label="Process steps">
            {STEPS.map((s, idx) => {
              const stepNum = s.step
              const isActive = activeStep === stepNum
              const isPast = Number(stepNum) < Number(activeStep)
              const isFuture = Number(stepNum) > Number(activeStep)

              return (
                <button
                  key={s.step}
                  type="button"
                  disabled={isFuture}
                  title={isFuture ? 'Complete the previous step first' : undefined}
                  onClick={() => {
                    if (isPast || isActive) {
                      setActiveStep(stepNum)
                    }
                  }}
                  className={`${styles.stepCard} ${
                    isActive ? styles.stepCardActive : styles.stepCardInactive
                  } ${isFuture ? styles.stepCardDisabled : ''}`}
                  style={{ zIndex: isActive ? 20 : 10 - idx }}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className={styles.stepContent}>
                    <span className={styles.stepNumber}>{`STEP ${s.step}`}</span>
                    <span className={styles.stepTitle}>{s.title}</span>
                  </div>

                  {isActive && <span className={styles.activePill}>ACTIVE</span>}
                </button>
              )
            })}
          </div>

          {/* Next option action bar for the process */}
          <div className={styles.nextOptionBar}>
            <div className={styles.nextOptionLabelCol}>
              <span className={styles.nextOptionPill}>NEXT OPTION</span>
              <span className={styles.nextOptionDesc}>
                {activeStep === '01' &&
                  (isStep1Valid
                    ? 'Parameters ready • Proceed to Route Suggestion'
                    : 'Upload lab report or enter values manually')}
                {activeStep === '02' &&
                  'Review route suggestions and safety requirements'}
                {activeStep === '03' &&
                  'Inspect assay recommendations and simulation limitations'}
                {activeStep === '04' &&
                  'Generate comprehensive multi-page simulation PDF report'}
              </span>
            </div>
            <button
              type="button"
              disabled={activeStep === '01' && !isStep1Valid}
              onClick={() => {
                if (activeStep === '01' && isStep1Valid) setActiveStep('02')
                else if (activeStep === '02') setActiveStep('03')
                else if (activeStep === '03') setActiveStep('04')
                else if (activeStep === '04') handleGenerateReport()
              }}
              className={styles.nextOptionButton}
            >
              {activeStep === '01' && 'Next: Step 02 \u2192'}
              {activeStep === '02' && 'Next: Step 03 \u2192'}
              {activeStep === '03' && 'Next: Step 04 \u2192'}
              {activeStep === '04' && 'Generate PDF \u2192'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
