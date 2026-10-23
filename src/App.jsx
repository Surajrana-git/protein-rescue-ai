import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingLayout from './components/LandingLayout/LandingLayout.jsx'
import Home from './pages/Home.jsx'
import ComingSoon from './components/ComingSoon/ComingSoon.jsx'
import ScrollToTop from './components/ScrollToTop/ScrollToTop.jsx'
import { PLACEHOLDER_ROUTES } from './data/landingData.js'

// Lazy-load internal pages
const Reports = lazy(() => import('./pages/Reports.jsx'))
const HistoryReport = lazy(() => import('./pages/HistoryReport/HistoryReport.jsx'))
const SafetyCheck = lazy(() => import('./pages/SafetyCheck/SafetyCheck.jsx'))
const HelpCentre = lazy(() => import('./pages/HelpCentre/HelpCentre.jsx'))
const HelpTopic = lazy(() => import('./pages/HelpCentre/HelpTopic.jsx'))

const PageLoader = () => (
  <div style={{ padding: '64px 0', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
    Loading...
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ── All Routes Rendered Inside the Universal Landing Shell ── */}
        <Route path="/" element={<LandingLayout />}>
          <Route index element={<Home />} />
          
          {/* Predictive PDF Reports page */}
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <Reports />
              </Suspense>
            }
          />

          {/* Real Nav Pages (Step 12) */}
          <Route
            path="history-report"
            element={
              <Suspense fallback={<PageLoader />}>
                <HistoryReport />
              </Suspense>
            }
          />
          <Route
            path="safety-check"
            element={
              <Suspense fallback={<PageLoader />}>
                <SafetyCheck />
              </Suspense>
            }
          />
          <Route
            path="help-centre"
            element={
              <Suspense fallback={<PageLoader />}>
                <HelpCentre />
              </Suspense>
            }
          />
          <Route
            path="help-centre/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <HelpTopic />
              </Suspense>
            }
          />

          {/* Reusable ComingSoon routes for pending features */}
          {PLACEHOLDER_ROUTES.map(({ path, title }) => (
            <Route
              key={path}
              path={path.replace(/^\//, '')}
              element={<ComingSoon title={title} />}
            />
          ))}
        </Route>

        {/* ── Backward-compatible Redirects from Old Dashboard Paths ── */}
        <Route path="/app/new-analysis" element={<Navigate to="/#analyze" replace />} />
        <Route path="/new-analysis" element={<Navigate to="/#analyze" replace />} />
        <Route path="/dashboard" element={<Navigate to="/#analyze" replace />} />
        <Route path="/app" element={<Navigate to="/#analyze" replace />} />
        <Route path="/app/treatment-simulator" element={<Navigate to="/treatment-simulator" replace />} />
        <Route path="/app/cost-comparison" element={<Navigate to="/cost-comparison" replace />} />
        <Route path="/app/reports" element={<Navigate to="/reports" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
