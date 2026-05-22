import { useEffect, useMemo, useState } from 'react'
import { attendanceAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState('semester')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    Promise.allSettled([
      attendanceAPI.getMySummary(),
      attendanceAPI.getMy(),
    ])
      .then(([summaryResponse, recordsResponse]) => {
        if (summaryResponse.status === 'fulfilled') {
          setSummary(summaryResponse.value.data.data || {})
        } else {
          setSummary({})
          toast.error('Failed to load attendance summary')
        }

        if (recordsResponse.status === 'fulfilled') {
          setRecords(recordsResponse.value.data.data || [])
        } else {
          setRecords([])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const reportSummary = useMemo(() => buildAttendanceSummary(records, reportPeriod, reportDate), [records, reportPeriod, reportDate])
  const visibleSummary = reportPeriod === 'semester' ? (summary || reportSummary) : reportSummary
  const rows = useMemo(() => subjectRows(visibleSummary, reportSummary.records), [visibleSummary, reportSummary.records])

  if (loading) return <div className="card"><div className="empty-state compact">Loading attendance...</div></div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>View Attendance</h1>
        </div>
      </div>

      <div className="grid-3 dashboard-grid" style={{ marginBottom: 20 }}>
        <Metric label="Attended Classes" value={visibleSummary?.totalPresent || 0} />
        <Metric label="All Classes" value={visibleSummary?.totalClasses || 0} />
        <Metric label="Attendance %" value={`${visibleSummary?.overallPercentage || 0}%`} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <select className="form-input" value={reportPeriod} onChange={event => setReportPeriod(event.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="fifteen">15 Days</option>
              <option value="monthly">Monthly</option>
              <option value="semester">Per Semester</option>
            </select>
          </div>
          {reportPeriod !== 'semester' && (
            <div className="form-group">
              <label className="form-label">Report Date</label>
              <input className="form-input" type="date" value={reportDate} max={todayValue()} onChange={event => setReportDate(event.target.value)} />
            </div>
          )}
        </div>
      </div>

      <section className="card" style={{ padding: 0 }}>
        <div className="table-card-header">
          <div>
            <h3>Subject Attendance</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Attended Classes</th>
                <th>All Classes</th>
                <th>Faculty</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="4">No attendance has been added yet</td></tr>
              ) : rows.map(row => (
                <tr key={row.subject}>
                  <td>{row.subject}</td>
                  <td>{row.attendedClasses}</td>
                  <td>{row.totalClasses}</td>
                  <td>{row.faculty || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="stat-card" style={{ '--accent-color': '#1e40af', '--accent-bg': 'rgba(30,64,175,0.12)' }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function subjectRows(summary, records) {
  const counts = summary?.subjectCounts || {}
  const facultyBySubject = new Map()
  ;(records || []).forEach(record => {
    if (!record.subject) return
    const existing = facultyBySubject.get(record.subject) || new Set()
    if (record.markedByName) existing.add(record.markedByName)
    facultyBySubject.set(record.subject, existing)
  })
  return Object.entries(counts).map(([subject, row]) => ({
    subject,
    attendedClasses: row.attendedClasses || 0,
    totalClasses: row.totalClasses || 0,
    faculty: Array.from(facultyBySubject.get(subject) || []).join(', '),
  }))
}

function buildAttendanceSummary(records, period, reportDate) {
  const filteredRecords = filterRecordsByPeriod(records, period, reportDate)
  const counts = {}
  filteredRecords.forEach(record => {
    const subject = record.subject || 'Subject'
    if (!counts[subject]) counts[subject] = { attendedClasses: 0, totalClasses: 0, percentage: 0 }
    counts[subject].totalClasses += 1
    if (record.status === 'PRESENT') counts[subject].attendedClasses += 1
  })
  Object.values(counts).forEach(row => {
    row.percentage = row.totalClasses ? Math.round((row.attendedClasses * 1000) / row.totalClasses) / 10 : 0
  })
  const totalPresent = filteredRecords.filter(record => record.status === 'PRESENT').length
  return {
    totalPresent,
    totalClasses: filteredRecords.length,
    overallPercentage: filteredRecords.length ? Math.round((totalPresent * 1000) / filteredRecords.length) / 10 : 0,
    subjectCounts: counts,
    records: filteredRecords,
  }
}

function filterRecordsByPeriod(records, period, reportDate) {
  if (period === 'semester') return records || []
  const range = reportDateRange(period, reportDate)
  if (!range) return []
  return (records || []).filter(record => {
    const value = String(record.attendanceDate || '').slice(0, 10)
    return value && value >= range.start && value <= range.end
  })
}

function reportDateRange(period, reportDate) {
  const anchor = parseDateValue(reportDate)
  if (!anchor) return null
  const start = new Date(anchor)
  const end = new Date(anchor)
  if (period === 'weekly') start.setDate(anchor.getDate() - 6)
  if (period === 'fifteen') start.setDate(anchor.getDate() - 14)
  if (period === 'monthly') start.setDate(anchor.getDate() - 29)
  return { start: dateValue(start), end: dateValue(end) }
}

function reportPeriodLabel(period, reportDate) {
  if (period === 'semester') return 'the semester'
  const labels = { daily: 'daily', weekly: 'weekly', fifteen: '15 days', monthly: 'monthly' }
  const range = reportDateRange(period, reportDate)
  if (!range) return labels[period] || 'selected period'
  return `${labels[period] || 'selected period'} report (${range.start} to ${range.end})`
}

function todayValue() {
  return dateValue(new Date())
}

function parseDateValue(value) {
  const raw = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
