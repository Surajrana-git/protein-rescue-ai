import { useState } from 'react'
import {
  BOOKING_URL,
  BOOKING_EMAIL,
  WHATSAPP_NUMBER,
} from '../../config/links.js'
import styles from './AssistanceRow.module.css'

export default function AssistanceRow() {
  const [bookingNotice, setBookingNotice] = useState(false)
  const [whatsAppNotice, setWhatsAppNotice] = useState(false)

  function handleBookingClick() {
    if (BOOKING_URL && BOOKING_URL.trim()) {
      window.open(BOOKING_URL, '_blank', 'noopener,noreferrer')
    } else if (BOOKING_EMAIL && BOOKING_EMAIL.trim()) {
      const subject = encodeURIComponent('Field visit request')
      const body = encodeURIComponent(
        'Hello ProteinRescue AI Team,\n\nI would like to request a field visit to explore protein upcycling opportunities.\n\nThank you.'
      )
      window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`
    } else {
      setBookingNotice(true)
    }
  }

  function handleWhatsAppClick() {
    if (WHATSAPP_NUMBER && WHATSAPP_NUMBER.trim()) {
      const msg = encodeURIComponent('Hello, I would like help with ProteinRescue AI.')
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener,noreferrer')
    } else {
      setWhatsAppNotice(true)
    }
  }

  function handleCardKeyDown(e, callback) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      callback()
    }
  }

  return (
    <section className={styles.section} aria-label="Assistance Section">
      <h2 className={styles.heading}>Get personalized assistance</h2>

      <div className={styles.cardsRow}>
        {/* Left Card: Field Visit with Outer Square BOOK NOW button */}
        <div
          className={styles.card}
          role="button"
          tabIndex={0}
          onClick={handleBookingClick}
          onKeyDown={(e) => handleCardKeyDown(e, handleBookingClick)}
          aria-label="Book a field visit"
        >
          <div className={styles.cardContent}>
            <button
              type="button"
              className={styles.bookNowBtn}
              onClick={(e) => {
                e.stopPropagation()
                handleBookingClick()
              }}
            >
              BOOK NOW
            </button>
            <span className={styles.fieldVisitLabel}>FIELD VISIT</span>
          </div>

          <div className={styles.noticeSlot} aria-live="polite">
            {bookingNotice && (
              <span className={styles.inlineNotice}>
                Booking contact is not set up yet.
              </span>
            )}
          </div>
        </div>

        {/* Right Card: WhatsApp Chat */}
        <div
          className={styles.card}
          role="button"
          tabIndex={0}
          onClick={handleWhatsAppClick}
          onKeyDown={(e) => handleCardKeyDown(e, handleWhatsAppClick)}
          aria-label="Chat on WhatsApp"
        >
          <div className={styles.cardContent}>
            <div className={styles.waIconWrapper}>
              <svg className={styles.waIcon} viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle cx="24" cy="24" r="22" fill="#25D366" />
                <path
                  d="M34.2 13.8A14.28 14.28 0 0 0 24.1 9.6C16.2 9.6 9.8 16 9.8 23.9c0 2.5.7 5 1.9 7.2L10 38.4l7.5-2c2.1 1.2 4.4 1.8 6.6 1.8 7.9 0 14.3-6.4 14.3-14.3 0-3.8-1.5-7.4-4.2-10.1zM24.1 35.8c-2.1 0-4.2-.6-6-1.7l-.4-.3-4.5 1.2 1.2-4.4-.3-.5c-1.2-1.9-1.9-4.1-1.9-6.2 0-6.6 5.4-12 12-12 3.2 0 6.2 1.2 8.5 3.5 2.3 2.3 3.5 5.3 3.5 8.5 0 6.6-5.4 12-12.1 12.1zm6.6-9c-.4-.2-2.1-1-2.4-1.2-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.2-1-1.9-2.3-2.2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.6.2-.2.2-.4.3-.6.1-.2 0-.5 0-.6s-.8-2-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.7.1-1.1.5-.4.4-1.5 1.4-1.5 3.5s1.5 4.1 1.7 4.3c.2.3 3 4.6 7.3 6.4 1 .4 1.8.7 2.5.9 1.1.3 2 .3 2.8.2.9-.1 2.7-1.1 3.1-2.2.4-1.1.4-2 .3-2.2-.2-.2-.5-.3-.9-.5z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <span className={styles.waChatLabel}>CHAT ON WHATSAPP</span>
          </div>

          <div className={styles.noticeSlot} aria-live="polite">
            {whatsAppNotice && (
              <span className={styles.inlineNotice}>
                WhatsApp number is not set up yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
