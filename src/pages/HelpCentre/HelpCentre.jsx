import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  CloudUpload,
  ShieldCheck,
  FlaskConical,
  BarChart2,
  FileText,
  Settings,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Send,
} from 'lucide-react'
import { SUPPORT_EMAIL } from '../../config/links.js'
import { HELP_TOPICS } from '../../data/helpTopicsData.js'
import styles from './HelpCentre.module.css'

// Icon mapping for topic cards
const TOPIC_ICONS = {
  'uploading-lab-report': {
    icon: <CloudUpload size={22} />,
    tileClass: styles.tileBlue,
  },
  'safety-check': {
    icon: <ShieldCheck size={22} />,
    tileClass: styles.tileGreen,
  },
  'treatment-simulation': {
    icon: <FlaskConical size={22} />,
    tileClass: styles.tilePurple,
  },
  'history-report': {
    icon: <BarChart2 size={22} />,
    tileClass: styles.tileOrange,
  },
  'report-insights': {
    icon: <FileText size={22} />,
    tileClass: styles.tileBlue,
  },
  'account-settings': {
    icon: <Settings size={22} />,
    tileClass: styles.tileRed,
  },
}

export default function HelpCentre() {
  const [searchQuery, setSearchQuery] = useState('')
  const [supportNotice, setSupportNotice] = useState(false)

  // 6 main topics for grid (excluding quick-start which is accessed via the side card)
  const mainTopics = useMemo(() => {
    return HELP_TOPICS.filter((t) => t.slug !== 'quick-start')
  }, [])

  // Filter topics live by search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return mainTopics
    const q = searchQuery.toLowerCase().trim()
    return mainTopics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.shortDesc.toLowerCase().includes(q)
    )
  }, [mainTopics, searchQuery])

  function handleContactSupport() {
    if (SUPPORT_EMAIL && SUPPORT_EMAIL.trim()) {
      const subject = encodeURIComponent('ProteinRescue AI support request')
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}`
    } else {
      setSupportNotice(true)
    }
  }

  return (
    <div className={styles.page}>
      {/* Hero Band: Light blue full width with extracted illustrations */}
      <section className={styles.heroBand} aria-label="Help Centre Banner">
        <div className={styles.heroInner}>
          <img
            src="/images/help-bubbles.png"
            alt=""
            className={styles.leftIllustration}
            loading="lazy"
          />

          <div className={styles.heroCenter}>
            <h1 className={styles.heroTitle}>Help Centre</h1>
            <p className={styles.heroSubtitle}>
              Find answers, guides and support to make the most of ProteinRescue AI.
            </p>

            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className={styles.searchInput}
                aria-label="Search help topics"
              />
            </div>
          </div>

          <img
            src="/images/help-bulb.png"
            alt=""
            className={styles.rightIllustration}
            loading="lazy"
          />
        </div>
      </section>

      {/* Main Container */}
      <div className={styles.container}>
        {/* Help Topics Section */}
        <section className={styles.topicsSection} aria-label="Help Topics">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Help Topics</h2>
            <p className={styles.sectionSubtitle}>
              Choose a topic to find step-by-step guides and answers.
            </p>
          </div>

          {filteredTopics.length === 0 ? (
            <div className={styles.noResultsBox}>
              <p className={styles.noResultsText}>No topics match your search.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.clearSearchBtn}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className={styles.topicGrid}>
              {filteredTopics.map((topic) => {
                const config = TOPIC_ICONS[topic.slug] || {
                  icon: <FileText size={22} />,
                  tileClass: styles.tileBlue,
                }

                return (
                  <Link
                    key={topic.slug}
                    to={`/help-centre/${topic.slug}`}
                    className={styles.topicCard}
                    aria-label={`${topic.title}: ${topic.shortDesc}`}
                  >
                    <div className={`${styles.topicIconTile} ${config.tileClass}`}>
                      {config.icon}
                    </div>

                    <div className={styles.topicContent}>
                      <h3 className={styles.topicTitle}>{topic.title}</h3>
                      <p className={styles.topicDesc}>{topic.shortDesc}</p>
                    </div>

                    <ChevronRight size={18} className={styles.topicChevron} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Thin Divider */}
        <hr className={styles.divider} />

        {/* Two Wide Rounded Cards: Contact Support & Quick Start Guide */}
        <section className={styles.assistanceCardsRow} aria-label="Support and Quick Start">
          {/* Left: Still need help? */}
          <div className={styles.supportCard}>
            <div className={styles.supportCardContent}>
              <div className={styles.supportIconWrapper}>
                <MessageSquare size={26} className={styles.supportIcon} />
              </div>
              <div className={styles.supportTextCol}>
                <h3 className={styles.supportHeading}>Still need help?</h3>
                <p className={styles.supportDesc}>Our team is here to assist you.</p>
              </div>
            </div>

            <div className={styles.actionCol}>
              <button
                type="button"
                onClick={handleContactSupport}
                className={styles.contactBtn}
              >
                <Send size={15} />
                <span>Contact Support</span>
              </button>

              <div className={styles.noticeSlot} aria-live="polite">
                {supportNotice && (
                  <span className={styles.inlineNotice}>
                    Support contact is not set up yet.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Start Guide */}
          <div className={styles.quickStartCard}>
            <div className={styles.supportCardContent}>
              <div className={styles.quickStartIconWrapper}>
                <BookOpen size={26} className={styles.quickStartIcon} />
              </div>
              <div className={styles.supportTextCol}>
                <h3 className={styles.supportHeading}>Quick Start Guide</h3>
                <p className={styles.supportDesc}>
                  Get started with ProteinRescue AI in minutes.
                </p>
              </div>
            </div>

            <div className={styles.actionCol}>
              <Link to="/help-centre/quick-start" className={styles.viewGuideBtn}>
                <FileText size={15} />
                <span>View Guide</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
