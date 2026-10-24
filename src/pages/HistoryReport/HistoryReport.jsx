import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  History as HistoryIcon,
  Search,
  FileText,
  Check,
  Clock,
  AlertTriangle,
  MoreVertical,
  Calendar,
  User,
  Eye,
  Download,
  Trash2,
  Upload,
  Filter,
  PlusCircle,
  X,
  Copy,
} from 'lucide-react'
import {
  getReports,
  deleteReport,
  resetReports,
  DEMO_NOW,
} from '../../data/demoReports.js'
import StatusBadge from '../../components/StatusBadge/StatusBadge.jsx'
import IconTile from '../../components/IconTile/IconTile.jsx'
import Toast from '../../components/Toast/Toast.jsx'
import styles from './HistoryReport.module.css'

// Reusable document thumbnail SVG
function DocumentThumbnail() {
  return (
    <div className={styles.docThumbnail} aria-hidden="true">
      <div className={styles.docHeaderLine} />
      <div className={styles.docLineLong} />
      <div className={styles.docLineShort} />
      <div className={styles.docLineMed} />
      <div className={styles.docLineLong} />
      <div className={styles.docLineShort} />
    </div>
  )
}

export default function HistoryReport() {
  const navigate = useNavigate()

  // In-memory reports state
  const [reports, setReports] = useState(() => getReports())

  // Toast state
  const [toastMessage, setToastMessage] = useState(null)

  // Modals state
  const [selectedReport, setSelectedReport] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)

  // Dialog refs
  const viewDialogRef = useRef(null)
  const deleteDialogRef = useRef(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Top filter bar state
  const [statusFilter, setStatusFilter] = useState('All') // 'All', 'Completed', 'Processing', 'Failed'
  const [proteinFilter, setProteinFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'confidence'

  // Pagination: initially 4, reveal 10 more each click
  const [visibleCount, setVisibleCount] = useState(4)

  // Advanced filters draft state
  const [draftStatuses, setDraftStatuses] = useState({
    All: true,
    Processing: false,
    Completed: false,
    Failed: false,
  })
  const [draftProteins, setDraftProteins] = useState({
    All: true,
    'Groundnut Albumin': false,
    'Soy Globulin': false,
    'Rice Glutelin': false,
    'Canola Prolamin': false,
    Others: false,
  })
  const [draftDateRange, setDraftDateRange] = useState('All Time')
  const [draftFromDate, setDraftFromDate] = useState('')
  const [draftToDate, setDraftToDate] = useState('')

  // Active advanced filters state
  const [activeDateRange, setActiveDateRange] = useState('All Time')
  const [activeFromDate, setActiveFromDate] = useState('')
  const [activeToDate, setActiveToDate] = useState('')
  const [activeAdvancedProteins, setActiveAdvancedProteins] = useState([])

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  // Sync native dialogs
  useEffect(() => {
    if (selectedReport && viewDialogRef.current) {
      if (!viewDialogRef.current.open) {
        viewDialogRef.current.showModal()
      }
    }
  }, [selectedReport])

  useEffect(() => {
    if (deleteCandidate && deleteDialogRef.current) {
      if (!deleteDialogRef.current.open) {
        deleteDialogRef.current.showModal()
      }
    }
  }, [deleteCandidate])

  // Computed stats from current reports list
  const stats = useMemo(() => {
    const total = reports.length
    const completed = reports.filter((r) => r.status === 'Completed').length
    const processing = reports.filter((r) => r.status === 'Processing').length
    const failed = reports.filter((r) => r.status === 'Failed').length
    return { total, completed, processing, failed }
  }, [reports])

  // Available protein list for dropdown
  const proteinOptions = useMemo(() => {
    const set = new Set()
    reports.forEach((r) => {
      if (r.protein && r.protein !== 'Identifying...') {
        set.add(r.protein)
      }
    })
    return Array.from(set).sort()
  }, [reports])

  // Helper to parse report date for filtering/sorting
  function getReportTimestamp(r) {
    const normalized = r.uploadedAt.replace(' ', 'T') + ':00Z'
    return new Date(normalized).getTime()
  }

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Status filter (from top pills or advanced checkboxes)
        if (statusFilter !== 'All' && r.status !== statusFilter) {
          return false
        }

        // Top Protein select filter
        if (proteinFilter !== 'All' && r.protein !== proteinFilter) {
          return false
        }

        // Advanced Protein filter checkboxes
        if (activeAdvancedProteins.length > 0) {
          const p = r.protein || ''
          const matches = activeAdvancedProteins.some((item) => {
            if (item === 'Groundnut Albumin') return p === 'Groundnut Albumin'
            if (item === 'Soy Globulin') return p === 'Soy Globulin'
            if (item === 'Rice Glutelin') return p === 'Rice Glutelin'
            if (item === 'Canola Prolamin') return p === 'Canola Prolamin'
            if (item === 'Others')
              return ![
                'Groundnut Albumin',
                'Soy Globulin',
                'Rice Glutelin',
                'Canola Prolamin',
              ].includes(p)
            return false
          })
          if (!matches) return false
        }

        // Search query: ID, fileName, protein, uploader, date text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const idMatch = r.id.toLowerCase().includes(q)
          const fileMatch = r.fileName.toLowerCase().includes(q)
          const proteinMatch = (r.protein || '').toLowerCase().includes(q)
          const uploaderMatch = (r.uploader || '').toLowerCase().includes(q)
          const dateMatch = (r.uploadedDisplay || '').toLowerCase().includes(q)
          if (!idMatch && !fileMatch && !proteinMatch && !uploaderMatch && !dateMatch) {
            return false
          }
        }

        // Date Range filter relative to DEMO_NOW (2026-10-24 11:00 UTC)
        const demoNowTs = new Date(DEMO_NOW.replace(' ', 'T') + ':00Z').getTime()
        const rTs = getReportTimestamp(r)

        if (activeDateRange === 'Last 7 Days') {
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
          if (demoNowTs - rTs > sevenDaysMs || rTs > demoNowTs) return false
        } else if (activeDateRange === 'Last 30 Days') {
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
          if (demoNowTs - rTs > thirtyDaysMs || rTs > demoNowTs) return false
        } else if (activeDateRange === 'Custom') {
          if (activeFromDate) {
            const fromTs = new Date(activeFromDate).getTime()
            if (rTs < fromTs) return false
          }
          if (activeToDate) {
            const toTs = new Date(activeToDate).getTime() + 24 * 60 * 60 * 1000
            if (rTs > toTs) return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return getReportTimestamp(b) - getReportTimestamp(a)
        }
        if (sortBy === 'oldest') {
          return getReportTimestamp(a) - getReportTimestamp(b)
        }
        if (sortBy === 'confidence') {
          return (b.confidence || 0) - (a.confidence || 0)
        }
        return 0
      })
  }, [
    reports,
    statusFilter,
    proteinFilter,
    activeAdvancedProteins,
    searchQuery,
    activeDateRange,
    activeFromDate,
    activeToDate,
    sortBy,
  ])

  // Slice visible reports
  const displayedReports = useMemo(() => {
    return filteredReports.slice(0, visibleCount)
  }, [filteredReports, visibleCount])

  // Timeline entries: 5 most recent reports sorted by date
  const timelineEntries = useMemo(() => {
    const sorted = [...reports].sort(
      (a, b) => getReportTimestamp(b) - getReportTimestamp(a)
    )
    return sorted.slice(0, 5)
  }, [reports])

  // Group timeline entries by date label
  const groupedTimeline = useMemo(() => {
    const groups = []
    let currentGroup = null

    timelineEntries.forEach((entry) => {
      let dateHeading = entry.uploadedDisplay.slice(0, 11).trim()
      if (entry.uploadedAt.startsWith('2026-10-24')) {
        dateHeading = 'Today (24 Oct 2026)'
      } else if (entry.uploadedAt.startsWith('2026-10-23')) {
        dateHeading = 'Yesterday (23 Oct 2026)'
      } else if (entry.uploadedAt.startsWith('2026-10-22')) {
        dateHeading = '22 Oct 2026'
      } else if (entry.uploadedAt.startsWith('2026-10-20')) {
        dateHeading = '20 Oct 2026'
      }

      if (!currentGroup || currentGroup.heading !== dateHeading) {
        currentGroup = { heading: dateHeading, items: [] }
        groups.push(currentGroup)
      }
      currentGroup.items.push(entry)
    })

    return groups
  }, [timelineEntries])

  // Handle Delete report
  function handleConfirmDelete() {
    if (!deleteCandidate) return
    const id = deleteCandidate.id
    const updated = deleteReport(id)
    setReports(updated)
    setDeleteCandidate(null)
    deleteDialogRef.current?.close()
    setToastMessage('Demo entry removed. Reload the page to restore the samples.')
  }

  // Handle Copy Report ID
  async function handleCopyReportId(id, e) {
    e?.stopPropagation()
    setActiveMenuId(null)
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(id)
      }
      setToastMessage(`Report ID copied to clipboard: ${id}`)
    } catch {
      setToastMessage(`Report ID: ${id}`)
    }
  }

  // Handle Download PDF Toast
  function handleDownloadClick(e) {
    e?.stopPropagation()
    setToastMessage('Demo data: no real file is attached to this sample.')
  }

  // Apply Advanced Filters
  function handleApplyAdvancedFilters() {
    // If 'All' is checked in draft status, set statusFilter to 'All'
    if (draftStatuses.All) {
      setStatusFilter('All')
    } else {
      const activeStatus = Object.keys(draftStatuses).find(
        (k) => k !== 'All' && draftStatuses[k]
      )
      setStatusFilter(activeStatus || 'All')
    }

    // Set protein filters
    if (draftProteins.All) {
      setActiveAdvancedProteins([])
    } else {
      const selected = Object.keys(draftProteins).filter(
        (k) => k !== 'All' && draftProteins[k]
      )
      setActiveAdvancedProteins(selected)
    }

    // Date range
    setActiveDateRange(draftDateRange)
    setActiveFromDate(draftFromDate)
    setActiveToDate(draftToDate)
    setVisibleCount(4)
  }

  // Reset Filters
  function handleResetFilters() {
    setStatusFilter('All')
    setProteinFilter('All')
    setSortBy('newest')
    setSearchQuery('')
    setDraftStatuses({
      All: true,
      Processing: false,
      Completed: false,
      Failed: false,
    })
    setDraftProteins({
      All: true,
      'Groundnut Albumin': false,
      'Soy Globulin': false,
      'Rice Glutelin': false,
      'Canola Prolamin': false,
      Others: false,
    })
    setDraftDateRange('All Time')
    setDraftFromDate('')
    setDraftToDate('')
    setActiveDateRange('All Time')
    setActiveFromDate('')
    setActiveToDate('')
    setActiveAdvancedProteins([])
    setVisibleCount(4)
  }

  // View All Reports from Timeline
  function handleViewAllReports() {
    handleResetFilters()
    setVisibleCount(reports.length)
    const listEl = document.getElementById('reports-list-top')
    if (listEl) {
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconTile}>
              <HistoryIcon size={24} className={styles.headerIcon} />
            </div>
            <div>
              <div className={styles.titleLine}>
                <h1 className={styles.pageTitle}>History</h1>
                <span
                  className={styles.demoPill}
                  title="These are sample entries for design preview, not real reports."
                >
                  DEMO DATA
                </span>
              </div>
              <p className={styles.pageSubtitle}>
                View and manage your previous lab reports and AI analysis results.
              </p>
            </div>
          </div>

          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setVisibleCount(4)
              }}
              placeholder="Search by Report ID, file name, feedstock, protein or date..."
              className={styles.searchInput}
              aria-label="Search reports"
            />
          </div>
        </div>

        {/* Stats Row: 4 cards with gradient-tinted icons */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <FileText size={22} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Total Reports</div>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statDesc}>All uploaded reports</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Completed</div>
              <div className={styles.statNumber}>{stats.completed}</div>
              <div className={styles.statDesc}>Successfully analysed</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
              <Clock size={22} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Processing</div>
              <div className={styles.statNumber}>{stats.processing}</div>
              <div className={styles.statDesc}>Currently in analysis</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconRed}`}>
              <AlertTriangle size={22} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Failed</div>
              <div className={styles.statNumber}>{stats.failed}</div>
              <div className={styles.statDesc}>Need attention</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.statusPillsGroup}>
            <span className={styles.filterBarLabel}>Filter by Status:</span>
            <div className={styles.statusPills}>
              {['All', 'Completed', 'Processing', 'Failed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={statusFilter === st}
                  onClick={() => {
                    setStatusFilter(st)
                    setDraftStatuses({
                      All: st === 'All',
                      Completed: st === 'Completed',
                      Processing: st === 'Processing',
                      Failed: st === 'Failed',
                    })
                    setVisibleCount(4)
                  }}
                  className={`${styles.filterPill} ${
                    statusFilter === st ? styles.filterPillActive : ''
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.selectsGroup}>
            <div className={styles.selectWrapper}>
              <label htmlFor="protein-select" className={styles.filterBarLabel}>
                Filter by Protein:
              </label>
              <select
                id="protein-select"
                value={proteinFilter}
                onChange={(e) => {
                  setProteinFilter(e.target.value)
                  setVisibleCount(4)
                }}
                className={styles.filterSelect}
              >
                <option value="All">All Proteins</option>
                {proteinOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.selectWrapper}>
              <label htmlFor="sort-select" className={styles.filterBarLabel}>
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="confidence">Highest Confidence</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content: Left Reports Column + Right Sidebar */}
        <div className={styles.mainGrid}>
          {/* Left Column: Report Cards */}
          <div className={styles.reportsCol} id="reports-list-top">
            {displayedReports.length === 0 ? (
              <div className={styles.emptyCard}>
                <p className={styles.emptyText}>No reports match your filters.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className={styles.resetFiltersBtn}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              displayedReports.map((report) => (
                <article key={report.id} className={styles.reportCard}>
                  {/* Left Column of Card: Status Badge & Document Thumbnail */}
                  <div className={styles.cardLeftCol}>
                    <StatusBadge status={report.status} />
                    <DocumentThumbnail />
                  </div>

                  {/* Right Column of Card: Title, Metadata, Buttons */}
                  <div className={styles.cardRightCol}>
                    <div className={styles.cardHeaderRow}>
                      <div className={styles.reportIdTitleRow}>
                        <h2 className={styles.reportTitle}>Report #{report.id}</h2>
                        {report.demo && (
                          <span className={styles.cardDemoTag}>Demo</span>
                        )}
                      </div>

                      {/* Kebab Action Menu */}
                      <div className={styles.kebabWrapper}>
                        <button
                          type="button"
                          className={styles.kebabBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(
                              activeMenuId === report.id ? null : report.id
                            )
                          }}
                          aria-label={`Options for report ${report.id}`}
                          aria-expanded={activeMenuId === report.id}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeMenuId === report.id && (
                          <div
                            className={styles.kebabMenu}
                            onClick={(e) => e.stopPropagation()}
                            role="menu"
                          >
                            <button
                              type="button"
                              className={styles.kebabItem}
                              onClick={(e) => handleCopyReportId(report.id, e)}
                              role="menuitem"
                            >
                              <Copy size={14} />
                              <span>Copy report ID</span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.kebabItem} ${styles.kebabDelete}`}
                              onClick={() => {
                                setActiveMenuId(null)
                                setDeleteCandidate(report)
                              }}
                              role="menuitem"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File Name Row */}
                    <div className={styles.fileNameRow}>
                      <FileText
                        size={15}
                        className={
                          report.status === 'Failed'
                            ? styles.fileIconFailed
                            : styles.fileIconNormal
                        }
                      />
                      <span
                        className={
                          report.status === 'Failed'
                            ? styles.fileNameFailed
                            : styles.fileNameNormal
                        }
                      >
                        {report.fileName}
                      </span>
                    </div>

                    {/* Info Grid: Varies by status */}
                    {report.status === 'Completed' && (
                      <div className={styles.infoGrid}>
                        {/* Row 1 */}
                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Uploaded</span>
                          <span className={styles.infoValueWithIcon}>
                            <Calendar size={13} className={styles.infoSubIcon} />
                            <span>{report.uploadedDisplay}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Protein Detected</span>
                          <span className={styles.proteinPill}>
                            {report.protein}
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Confidence</span>
                          <span className={styles.confidenceValue}>
                            {report.confidence}%
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>AI Version</span>
                          <span className={styles.infoValue}>{report.aiVersion}</span>
                        </div>

                        {/* Row 2 */}
                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Uploaded by</span>
                          <span className={styles.infoValueWithIcon}>
                            <User size={13} className={styles.infoSubIcon} />
                            <span>{report.uploader}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>File Size</span>
                          <span className={styles.infoValueWithIcon}>
                            <FileText size={13} className={styles.infoSubIcon} />
                            <span>{report.fileSize}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Analysis Time</span>
                          <span className={styles.infoValueWithIcon}>
                            <Clock size={13} className={styles.infoSubIcon} />
                            <span>{report.analysisTime}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {report.status === 'Processing' && (
                      <div className={styles.infoGrid}>
                        {/* Row 1 */}
                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Uploaded</span>
                          <span className={styles.infoValueWithIcon}>
                            <Calendar size={13} className={styles.infoSubIcon} />
                            <span>{report.uploadedDisplay}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Protein Detected</span>
                          <span className={styles.identifyingPill}>
                            Identifying...
                          </span>
                        </div>

                        <div className={`${styles.infoCol} ${styles.progressCol}`}>
                          <span className={styles.infoLabel}>Progress</span>
                          <div className={styles.progressBarWrapper}>
                            <div
                              className={styles.progressBarTrack}
                              role="progressbar"
                              aria-valuenow={report.progress || 98}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className={styles.progressBarFill}
                                style={{ width: `${report.progress || 98}%` }}
                              />
                            </div>
                            <span className={styles.progressPercent}>
                              {report.progress || 98}%
                            </span>
                          </div>
                          <span className={styles.progressSubtext}>
                            Estimated time: {report.estimatedTime || '2 min'}
                          </span>
                        </div>

                        {/* Row 2 */}
                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Uploaded by</span>
                          <span className={styles.infoValueWithIcon}>
                            <User size={13} className={styles.infoSubIcon} />
                            <span>{report.uploader}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>File Size</span>
                          <span className={styles.infoValueWithIcon}>
                            <FileText size={13} className={styles.infoSubIcon} />
                            <span>{report.fileSize}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>AI Version</span>
                          <span className={styles.infoValue}>{report.aiVersion}</span>
                        </div>
                      </div>
                    )}

                    {report.status === 'Failed' && (
                      <div className={styles.infoGrid}>
                        {/* Row 1 */}
                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Uploaded</span>
                          <span className={styles.infoValueWithIcon}>
                            <Calendar size={13} className={styles.infoSubIcon} />
                            <span>{report.uploadedDisplay}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Reason</span>
                          <span className={styles.failedReasonPill}>
                            {report.reason || 'Image Quality Too Low'}
                          </span>
                        </div>

                        <div className={styles.infoCol} />

                        {/* Row 2 */}
                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>Uploaded by</span>
                          <span className={styles.infoValueWithIcon}>
                            <User size={13} className={styles.infoSubIcon} />
                            <span>{report.uploader}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>File Size</span>
                          <span className={styles.infoValueWithIcon}>
                            <FileText size={13} className={styles.infoSubIcon} />
                            <span>{report.fileSize}</span>
                          </span>
                        </div>

                        <div className={styles.infoCol}>
                          <span className={styles.infoLabel}>AI Version</span>
                          <span className={styles.infoValue}>{report.aiVersion}</span>
                        </div>
                      </div>
                    )}

                    {/* Card Action Buttons */}
                    <div className={styles.cardActionsRow}>
                      {report.status === 'Completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className={styles.viewReportBtn}
                          >
                            <Eye size={15} />
                            <span>View Report</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadClick}
                            className={styles.downloadPdfBtn}
                          >
                            <Download size={15} />
                            <span>Download PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(report)}
                            className={styles.deleteOutlineBtn}
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        </>
                      )}

                      {report.status === 'Processing' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className={styles.viewReportBtn}
                          >
                            <Eye size={15} />
                            <span>Open Report</span>
                          </button>
                          <button
                            type="button"
                            disabled
                            className={styles.downloadDisabledBtn}
                          >
                            <Download size={15} />
                            <span>Download (Processing)</span>
                          </button>
                        </>
                      )}

                      {report.status === 'Failed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate('/#analyze')}
                            className={styles.reUploadBtn}
                          >
                            <Upload size={15} />
                            <span>Re-upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(report)}
                            className={styles.deleteOutlineBtn}
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}

            {/* Show more reports text button */}
            {filteredReports.length > visibleCount && (
              <div className={styles.showMoreWrapper}>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className={styles.showMoreBtn}
                >
                  Show more reports
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Advanced Filters & Report Timeline */}
          <aside className={styles.sidebarCol}>
            {/* Advanced Filters Card */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarHeader}>
                <Filter size={18} className={styles.sidebarHeaderIcon} />
                <h3 className={styles.sidebarTitle}>Advanced Filters</h3>
              </div>

              {/* Status Section */}
              <div className={styles.filterSection}>
                <span className={styles.filterSectionTitle}>Status</span>
                <div className={styles.checkboxGrid2}>
                  {['All', 'Processing', 'Completed', 'Failed'].map((st) => (
                    <label key={st} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={draftStatuses[st] || false}
                        onChange={(e) => {
                          const checked = e.target.checked
                          if (st === 'All') {
                            setDraftStatuses({
                              All: checked,
                              Processing: false,
                              Completed: false,
                              Failed: false,
                            })
                          } else {
                            setDraftStatuses((prev) => ({
                              ...prev,
                              All: false,
                              [st]: checked,
                            }))
                          }
                        }}
                        className={styles.checkbox}
                      />
                      <span>{st}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Protein Section */}
              <div className={styles.filterSection}>
                <span className={styles.filterSectionTitle}>Protein</span>
                <div className={styles.checkboxGrid2}>
                  {[
                    'All Proteins',
                    'Groundnut Albumin',
                    'Soy Globulin',
                    'Rice Glutelin',
                    'Canola Prolamin',
                    'Others',
                  ].map((pName) => {
                    const isAll = pName === 'All Proteins'
                    return (
                      <label key={pName} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={
                            isAll
                              ? draftProteins.All
                              : draftProteins[pName] || false
                          }
                          onChange={(e) => {
                            const checked = e.target.checked
                            if (isAll) {
                              setDraftProteins({
                                All: checked,
                                'Groundnut Albumin': false,
                                'Soy Globulin': false,
                                'Rice Glutelin': false,
                                'Canola Prolamin': false,
                                Others: false,
                              })
                            } else {
                              setDraftProteins((prev) => ({
                                ...prev,
                                All: false,
                                [pName]: checked,
                              }))
                            }
                          }}
                          className={styles.checkbox}
                        />
                        <span>{pName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Date Range Section */}
              <div className={styles.filterSection}>
                <span className={styles.filterSectionTitle}>Date Range</span>
                <div className={styles.dateRangeSelectWrapper}>
                  <Calendar size={16} className={styles.dateRangeIcon} />
                  <select
                    value={draftDateRange}
                    onChange={(e) => setDraftDateRange(e.target.value)}
                    className={styles.dateRangeSelect}
                  >
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="All Time">All Time</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className={styles.customDateRow}>
                  <div className={styles.dateInputCol}>
                    <span className={styles.dateInputLabel}>From</span>
                    <input
                      type="date"
                      value={draftFromDate}
                      onChange={(e) => {
                        setDraftFromDate(e.target.value)
                        setDraftDateRange('Custom')
                      }}
                      className={styles.dateInput}
                    />
                  </div>
                  <div className={styles.dateInputCol}>
                    <span className={styles.dateInputLabel}>To</span>
                    <input
                      type="date"
                      value={draftToDate}
                      onChange={(e) => {
                        setDraftToDate(e.target.value)
                        setDraftDateRange('Custom')
                      }}
                      className={styles.dateInput}
                    />
                  </div>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className={styles.filterButtonsRow}>
                <button
                  type="button"
                  onClick={handleApplyAdvancedFilters}
                  className={styles.applyFiltersBtn}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className={styles.resetDraftBtn}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Report Timeline Card */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarHeader}>
                <Clock size={18} className={styles.sidebarHeaderIcon} />
                <h3 className={styles.sidebarTitle}>Report Timeline</h3>
              </div>

              <div className={styles.timelineList}>
                {groupedTimeline.map((group) => (
                  <div key={group.heading} className={styles.timelineGroup}>
                    <div className={styles.timelineGroupHeading}>
                      {group.heading}
                    </div>

                    <div className={styles.timelineItemsList}>
                      {group.items.map((item) => {
                        let dotColor = styles.timelineDotGreen
                        let subTextColor = styles.timelineSubGreen
                        let subText = `Completed • ${item.protein || 'Protein'} • ${
                          item.confidence || 98
                        }%`

                        if (item.status === 'Processing') {
                          dotColor = styles.timelineDotOrange
                          subTextColor = styles.timelineSubOrange
                          subText = `Processing • ${item.progress || 98}%`
                        } else if (item.status === 'Failed') {
                          dotColor = styles.timelineDotRed
                          subTextColor = styles.timelineSubRed
                          subText = `Failed • ${item.reason || 'Image Quality Too Low'}`
                        }

                        return (
                          <div
                            key={item.id}
                            className={styles.timelineEntry}
                            onClick={() => setSelectedReport(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedReport(item)
                              }
                            }}
                          >
                            <div className={`${styles.timelineDot} ${dotColor}`} />
                            <div className={styles.timelineEntryContent}>
                              <div className={styles.timelineTitleRow}>
                                <span className={styles.timelineFileName}>
                                  {item.fileName}
                                </span>
                                <span className={styles.timelineTime}>
                                  {item.uploadedDisplay.slice(-8)}
                                </span>
                              </div>
                              <div
                                className={`${styles.timelineSubText} ${subTextColor}`}
                              >
                                {subText}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.timelineFooter}>
                <button
                  type="button"
                  onClick={handleViewAllReports}
                  className={styles.viewAllTimelineBtn}
                >
                  View All Reports &rarr;
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Floating Upload New Report Button */}
        <div className={styles.floatingButtonSlot}>
          <Link to="/#analyze" className={styles.floatingUploadBtn}>
            <PlusCircle size={20} className={styles.floatingPlusIcon} />
            <span>Upload New Report</span>
          </Link>
        </div>
      </div>

      {/* Native <dialog> for View / Open Report */}
      <dialog
        ref={viewDialogRef}
        className={styles.nativeDialog}
        onClose={() => setSelectedReport(null)}
      >
        {selectedReport && (
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <div>
                <h3 className={styles.dialogTitle}>
                  Report #{selectedReport.id}
                </h3>
                <p className={styles.dialogSubtitle}>
                  {selectedReport.fileName}
                </p>
              </div>
              <button
                type="button"
                className={styles.dialogCloseBtn}
                onClick={() => {
                  viewDialogRef.current?.close()
                  setSelectedReport(null)
                }}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.dialogBody}>
              <div className={styles.dialogMetaGrid}>
                <div>
                  <span className={styles.dialogLabel}>Status:</span>{' '}
                  <span className={styles.dialogVal}>{selectedReport.status}</span>
                </div>
                <div>
                  <span className={styles.dialogLabel}>Uploaded:</span>{' '}
                  <span className={styles.dialogVal}>
                    {selectedReport.uploadedDisplay}
                  </span>
                </div>
                <div>
                  <span className={styles.dialogLabel}>Uploaded by:</span>{' '}
                  <span className={styles.dialogVal}>
                    {selectedReport.uploader}
                  </span>
                </div>
                <div>
                  <span className={styles.dialogLabel}>File Size:</span>{' '}
                  <span className={styles.dialogVal}>
                    {selectedReport.fileSize}
                  </span>
                </div>
                {selectedReport.protein && (
                  <div>
                    <span className={styles.dialogLabel}>Protein:</span>{' '}
                    <span className={styles.dialogVal}>
                      {selectedReport.protein}
                    </span>
                  </div>
                )}
                {selectedReport.confidence && (
                  <div>
                    <span className={styles.dialogLabel}>Confidence:</span>{' '}
                    <span className={styles.dialogVal}>
                      {selectedReport.confidence}%
                    </span>
                  </div>
                )}
                {selectedReport.reason && (
                  <div>
                    <span className={styles.dialogLabel}>Reason:</span>{' '}
                    <span className={styles.dialogVal}>
                      {selectedReport.reason}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.demoNoticeBox}>
                This is a demo entry. No real report file is attached.
              </div>
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                onClick={() => {
                  viewDialogRef.current?.close()
                  setSelectedReport(null)
                }}
                className={styles.dialogPrimaryBtn}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Native <dialog> for Delete Confirmation */}
      <dialog
        ref={deleteDialogRef}
        className={styles.nativeDialog}
        onClose={() => setDeleteCandidate(null)}
      >
        {deleteCandidate && (
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <h3 className={styles.dialogTitle}>Delete this demo entry?</h3>
              <button
                type="button"
                className={styles.dialogCloseBtn}
                onClick={() => {
                  deleteDialogRef.current?.close()
                  setDeleteCandidate(null)
                }}
                aria-label="Cancel deletion"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.dialogBody}>
              <p style={{ margin: 0, color: '#334155', fontSize: 14 }}>
                Are you sure you want to remove Report #{deleteCandidate.id} (
                {deleteCandidate.fileName}) from the preview list?
              </p>
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                onClick={() => {
                  deleteDialogRef.current?.close()
                  setDeleteCandidate(null)
                }}
                className={styles.dialogSecondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className={styles.dialogDangerBtn}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Live Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  )
}
