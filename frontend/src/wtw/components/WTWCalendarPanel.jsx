import { useEffect, useState } from 'react'
import { getUpcomingEvents, groupByDay, fmtTime } from '../services/wtwCalendarService'
import styles from './WTWCalendarPanel.module.css'

export default function WTWCalendarPanel({ msToken }) {
  const [groups, setGroups] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!msToken) return
    setLoading(true)
    getUpcomingEvents(msToken, 7)
      .then(evs => setGroups(groupByDay(evs)))
      .finally(() => setLoading(false))
  }, [msToken])

  if (loading) return (
    <div className={styles.state}>
      <div className={styles.spinner} />
      <p>Cargando reuniones…</p>
    </div>
  )

  const days = groups ? Object.keys(groups) : []

  if (!days.length) return (
    <div className={styles.state}>
      <i className="ti ti-calendar-off" />
      <p>Sin reuniones en los próximos 7 días</p>
    </div>
  )

  return (
    <div className={styles.list}>
      {days.map(day => (
        <div key={day} className={styles.dayGroup}>
          <h4 className={styles.dayLabel}>{day}</h4>
          {groups[day].map((ev, i) => (
            <div key={i} className={styles.event}>
              <div className={styles.eventTime}>
                {ev.start.dateTime
                  ? `${fmtTime(ev.start.dateTime)} – ${fmtTime(ev.end.dateTime)}`
                  : 'Todo el día'}
              </div>
              <div className={styles.eventBody}>
                <p className={styles.eventTitle}>{ev.subject}</p>
                <div className={styles.eventMeta}>
                  {ev.organizer?.emailAddress?.name && (
                    <span><i className="ti ti-user" /> {ev.organizer.emailAddress.name}</span>
                  )}
                  {ev.location?.displayName && (
                    <span><i className="ti ti-map-pin" /> {ev.location.displayName}</span>
                  )}
                  {ev.isOnlineMeeting && ev.onlineMeeting?.joinUrl && (
                    <a
                      href={ev.onlineMeeting.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.joinBtn}
                    >
                      <i className="ti ti-brand-teams" /> Unirse
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
