import { useState } from 'react'
import {
  ALLOWED_FEEDSTOCKS,
  AFLATOXIN_OPTIONS,
  NUMERIC_FIELDS,
  DEFAULT_DISCLAIMER,
  INITIAL_FORM,
  validateAnalyzeInput,
  checkAflatoxinGated,
} from '../data/analysisSchema.js'
import styles from './Reports.module.css'

const PRESETS = [
  {
    name: 'Groundnut Cake (Aflatoxin Not Tested)',
    description: 'Standard oilseed press-cake with human-food safety gate active.',
    values: {
      feedstock: 'Groundnut Cake',
      aflatoxin: 'Not tested',
      initialProtein: 45,
      phytate: 12,
      tannin: 8,
      temperature: 48,
      treatmentTime: 60,
      enzymeDose: 15,
    },
  },
  {
    name: 'Groundnut Cake (Aflatoxin On File)',
    description: 'Groundnut cake with lab record on file requiring formal verification.',
    values: {
      feedstock: 'Groundnut Cake',
      aflatoxin: 'Result on file',
      initialProtein: 48,
      phytate: 10,
      tannin: 6,
      temperature: 50,
      treatmentTime: 45,
      enzymeDose: 12,
    },
  },
  {
    name: 'Guar Meal (Korm / Churi)',
    description: 'High-protein legume by-product; template pending expert review.',
    values: {
      feedstock: 'Guar Meal',
      aflatoxin: '',
      initialProtein: 50,
      phytate: 8,
      tannin: 4,
      temperature: 52,
      treatmentTime: 45,
      enzymeDose: 10,
    },
  },
  {
    name: 'Defatted Rice Bran',
    description: 'Cereal milling by-product; template pending expert review.',
    values: {
      feedstock: 'Rice Bran',
      aflatoxin: '',
      initialProtein: 15,
      phytate: 65,
      tannin: 2,
      temperature: 55,
      treatmentTime: 60,
      enzymeDose: 20,
    },
  },
]

export default function Reports() {
  const [form, setForm] = useState({
    feedstock: 'Groundnut Cake',
    aflatoxin: 'Not tested',
    initialProtein: 45,
    phytate: 12,
    tannin: 8,
    temperature: 48,
    treatmentTime: 60,
    enzymeDose: 15,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const isGroundnut = form.feedstock === 'Groundnut Cake'
  const { gated: isGated, reason: gatedReason } = checkAflatoxinGated(
    form.feedstock,
    form.aflatoxin
  )

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  function applyPreset(presetValues) {
    setForm(presetValues)
    setErrors({})
    setErrorMessage(null)
    setDownloadSuccess(null)
  }

  async function handleGenerateReport(e) {
    e.preventDefault()
    const { fieldErrors, isValid } = validateAnalyzeInput(form)
    if (!isValid) {
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setLoading(true)
    setErrorMessage(null)
    setDownloadSuccess(null)

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
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || `Server returned error (${response.status})`)
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

      setDownloadSuccess(`Report downloaded: ${filename}`)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to generate PDF report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconBadge}>◫</div>
          <div>
            <h1 className={styles.title}>Predictive Treatment Reports</h1>
            <p className={styles.subtitle}>
              Generate comprehensive multi-page PDF simulation reports featuring kinetic curves, off-flavour analysis, and economic protein benchmarks.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Pickers */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
          Select a Feedstock Scenario Preset:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p.values)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: form.feedstock === p.values.feedstock && form.aflatoxin === p.values.aflatoxin
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Form Card */}
        <div className={styles.formCard}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-text)' }}>
            Report Parameters
          </h2>

          <form onSubmit={handleGenerateReport} noValidate>
            <div className={styles.section}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="feedstock">
                  Feedstock type
                </label>
                <select
                  id="feedstock"
                  name="feedstock"
                  className={`${styles.select} ${errors.feedstock ? styles.invalid : ''}`}
                  value={form.feedstock}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {ALLOWED_FEEDSTOCKS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                {errors.feedstock && (
                  <span className={styles.errorMsg}>{errors.feedstock}</span>
                )}
              </div>

              {isGroundnut && (
                <div className={styles.field} style={{ marginTop: 14 }}>
                  <label className={styles.label} htmlFor="aflatoxin">
                    Aflatoxin test status
                  </label>
                  <select
                    id="aflatoxin"
                    name="aflatoxin"
                    className={`${styles.select} ${errors.aflatoxin ? styles.invalid : ''}`}
                    value={form.aflatoxin}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">— Select status —</option>
                    {AFLATOXIN_OPTIONS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  {errors.aflatoxin && (
                    <span className={styles.errorMsg}>{errors.aflatoxin}</span>
                  )}
                </div>
              )}
            </div>

            <hr className={styles.divider} />

            <div className={styles.section}>
              <div className={styles.sectionLabel}>Composition &amp; Treatment</div>
              <div className={styles.fieldGroup}>
                {NUMERIC_FIELDS.map(({ id, label, unit }) => (
                  <div key={id} className={styles.field}>
                    <label className={styles.label} htmlFor={id}>
                      {label}
                      {unit && <span className={styles.unit}>({unit})</span>}
                    </label>
                    <input
                      id={id}
                      name={id}
                      type="number"
                      min="0"
                      step="any"
                      className={`${styles.input} ${errors[id] ? styles.invalid : ''}`}
                      value={form[id]}
                      onChange={handleChange}
                      placeholder="0"
                      disabled={loading}
                    />
                    {errors[id] && (
                      <span className={styles.errorMsg}>{errors[id]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
                style={{ width: '100%', padding: '12px 20px', fontSize: '15px' }}
              >
                {loading ? 'Generating Simulation PDF Report…' : 'Generate & Download PDF Report'}
              </button>
            </div>

            {errorMessage && (
              <div style={{ color: '#991b1b', background: '#fee2e2', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginTop: '14px', fontSize: '13px' }}>
                {errorMessage}
              </div>
            )}

            {downloadSuccess && (
              <div style={{ color: '#166534', background: '#dcfce7', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginTop: '14px', fontSize: '13px' }}>
                ✓ {downloadSuccess}
              </div>
            )}
          </form>
        </div>

        {/* Preview & Safety Status Card */}
        <div className={styles.resultsCard}>
          <div className={styles.resultsHeader}>
            <h2>Report Preview &amp; Safety Gate</h2>
            <div className={styles.disclaimerBanner}>
              Deterministic Python Engine
            </div>
          </div>

          <div className={styles.resultsBody}>
            {/* Safety Gate Banner */}
            {isGroundnut && isGated && (
              <div
                style={{
                  background: 'var(--color-danger-light)',
                  border: '1px solid #fca5a5',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  color: '#991b1b',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  ⛔ Human Food Route Gated (Safety Critical)
                </div>
                <div>{gatedReason}</div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#7f1d1d' }}>
                  The generated report will prominently highlight this hard safety gate on page 1 and section 6.
                </div>
              </div>
            )}

            {isGroundnut && !isGated && (
              <div
                style={{
                  background: 'var(--color-warning-light)',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  color: '#92400e',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  📋 Aflatoxin Record On File
                </div>
                <div>{gatedReason}</div>
              </div>
            )}

            {!isGroundnut && (
              <div
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  color: '#374151',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  ℹ️ Non-Groundnut Feedstock Template
                </div>
                <div>
                  Sections 4 &amp; 5 will note: <em>Template pending expert review</em> for {form.feedstock}.
                </div>
              </div>
            )}

            {/* Contents Overview */}
            <div style={{ marginBottom: '18px' }}>
              <div className={styles.sectionLabel}>Report Architecture</div>
              <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--color-text)', lineHeight: '1.6', margin: 0 }}>
                <li><strong>Section 1:</strong> Executive Summary &amp; Simulation KPI metrics</li>
                <li><strong>Section 2:</strong> Input Parameters &amp; Evidence Tiers</li>
                <li><strong>Section 3:</strong> Treatment Trajectory Forecast (Phytate &amp; Tannin Kinetics)</li>
                <li><strong>Section 4:</strong> Taste &amp; Off-Flavour Improvement Module (Groundnut)</li>
                <li><strong>Section 5:</strong> Recommended Taste Package &amp; Protein Parity Cost Model</li>
                <li><strong>Section 6:</strong> Utilization Route Evaluation &amp; Aflatoxin Gate</li>
                <li><strong>Sections 7–9:</strong> Considerations, Recommended Assays, and Mandatory Disclaimers</li>
              </ul>
            </div>

            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#1e40af',
              }}
            >
              <strong>Scientific Honesty:</strong> All charts include explicit sensitivity bands and are labeled <em>"ILLUSTRATIVE SIMULATION, placeholder model, not validated"</em>. Alternate processing conditions are designated as <em>"what-if scenarios"</em>.
            </div>
          </div>

          <div className={styles.disclaimerFooter}>
            <strong>Mandatory Disclaimer:</strong> {DEFAULT_DISCLAIMER}
          </div>
        </div>
      </div>
    </div>
  )
}
