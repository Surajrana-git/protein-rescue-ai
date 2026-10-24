import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { HELP_TOPICS } from '../../data/helpTopicsData.js'
import styles from './HelpTopic.module.css'

export default function HelpTopic() {
  const { slug } = useParams()

  const topic = HELP_TOPICS.find((t) => t.slug === slug)

  if (!topic) {
    return <Navigate to="/help-centre" replace />
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Back Link */}
        <Link to="/help-centre" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Back to Help Centre</span>
        </Link>

        {/* Topic Card */}
        <article className={styles.topicCard}>
          <div className={styles.categoryBadge}>{topic.category}</div>
          <h1 className={styles.topicTitle}>{topic.title}</h1>
          <p className={styles.topicSubtitle}>{topic.shortDesc}</p>

          <hr className={styles.divider} />

          <div className={styles.stepsContainer}>
            <h2 className={styles.stepsHeading}>Guide & Instructions</h2>
            <ol className={styles.stepsList}>
              {topic.steps.map((step, idx) => (
                <li key={idx} className={styles.stepItem}>
                  <div className={styles.stepNumberBadge}>{idx + 1}</div>
                  <div className={styles.stepText}>{step}</div>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.noticeBox}>
            <CheckCircle2 size={18} className={styles.noticeIcon} />
            <p className={styles.noticeText}>
              Need more assistance? Return to the Help Centre to explore other topics or contact support.
            </p>
          </div>
        </article>
      </div>
    </div>
  )
}
