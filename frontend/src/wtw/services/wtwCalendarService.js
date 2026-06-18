export async function getUpcomingEvents(msToken, days = 7) {
  const now = new Date()
  const end = new Date(now.getTime() + days * 86400000)
  const params = new URLSearchParams({
    startDateTime: now.toISOString(),
    endDateTime:   end.toISOString(),
    $top:          '20',
    $orderby:      'start/dateTime',
    $select:       'subject,start,end,location,onlineMeeting,organizer,isOnlineMeeting,bodyPreview',
  })
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
      headers: { Authorization: `Bearer ${msToken}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.value || []
  } catch {
    return []
  }
}

export function groupByDay(events) {
  const groups = {}
  events.forEach(ev => {
    const date = ev.start.dateTime
      ? new Date(ev.start.dateTime).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
      : ev.start.date
    if (!groups[date]) groups[date] = []
    groups[date].push(ev)
  })
  return groups
}

export function fmtTime(dateTimeStr) {
  if (!dateTimeStr) return ''
  return new Date(dateTimeStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
