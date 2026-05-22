import { useEffect, useMemo, useState } from 'react'
import { resultAPI, studentAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function StudentResultsPage() {
  const [profile, setProfile] = useState(null)
  const [results, setResults] = useState([])
  const [tab, setTab] = useState('internal')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      studentAPI.getProfile(),
      resultAPI.getMy(),
    ])
      .then(([profileResponse, resultsResponse]) => {
        if (profileResponse.status === 'fulfilled') {
          const student = profileResponse.value.data.data
          setProfile(student)
          setSelectedSemester(String(student?.semester || ''))
        } else {
          toast.error('Failed to load student profile')
        }

        if (resultsResponse.status === 'fulfilled') {
          setResults(resultsResponse.value.data.data || [])
        } else {
          setResults([])
          toast.error('Failed to load results')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const internalRows = results.filter(row => String(row.examType).toUpperCase() === 'INTERNAL')
  const finalRows = results.filter(row => String(row.examType).toUpperCase() !== 'INTERNAL' && isPublishedResult(row))
  const semesters = uniqueNumbers(results.map(row => row.semester).concat(profile?.semester || []))
  const subjectGroups = groupBy(internalRows, row => row.subject || 'Subject')
  const selectedInternalRows = selectedSubject ? subjectGroups.get(selectedSubject) || [] : []
  const semesterRows = [...internalRows, ...finalRows].filter(row => (
    !selectedSemester || Number(row.semester) === Number(selectedSemester)
  ))
  const semesterSummary = summarizeSemester(semesterRows)

  if (loading) return <div className="card"><div className="empty-state compact">Loading results...</div></div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>My Results</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 10, padding: 4 }}>
          <TabButton active={tab === 'internal'} onClick={() => setTab('internal')}>Internal Results</TabButton>
          <TabButton active={tab === 'see'} onClick={() => setTab('see')}>SEE Results</TabButton>
        </div>
      </div>

      {tab === 'internal' ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="card" style={{ padding: 0 }}>
            <div className="table-card-header">
              <div>
                <h3>Subjects</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Subject</th><th>Total</th><th>Grade</th></tr></thead>
                <tbody>
                  {[...subjectGroups.entries()].length === 0 ? (
                    <tr><td colSpan="3">No internal marks available</td></tr>
                  ) : [...subjectGroups.entries()].map(([subject, rows]) => {
                    const row = rows[0]
                    return (
                      <tr key={subject} onClick={() => setSelectedSubject(subject)} style={{ cursor: 'pointer' }}>
                        <td>{subject}</td>
                        <td>{row.marksObtained}/{row.maxMarks}</td>
                        <td><span className="badge badge-blue">{row.grade || '-'}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ padding: 0 }}>
            <div className="table-card-header">
              <div>
                <h3>{selectedSubject || 'Internal Components'}</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Component</th><th>Marks</th></tr></thead>
                <tbody>
                  {!selectedSubject ? (
                    <tr><td colSpan="2">Select a subject</td></tr>
                  ) : componentRows(selectedInternalRows[0]).length === 0 ? (
                    <tr><td colSpan="2">No component breakdown available</td></tr>
                  ) : componentRows(selectedInternalRows[0]).map(component => (
                    <tr key={component.id || component.name}>
                      <td>{component.name}</td>
                      <td>{component.marks ?? 0}/{component.maxMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div>
          <section className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-input" value={selectedSemester} onChange={event => setSelectedSemester(event.target.value)}>
                  <option value="">All Semesters</option>
                  {semesters.map(semester => <option key={semester} value={semester}>Semester {semester}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => downloadReport(profile, semesterRows, semesterSummary)} style={{ minWidth: 190, justifyContent: 'center' }}>Download Result PDF</button>
            </div>
          </section>

          <div className="grid-3 dashboard-grid" style={{ marginBottom: 20 }}>
            <Metric label="Percentage" value={`${semesterSummary.percentage}%`} />
            <Metric label="CGPA" value={semesterSummary.cgpa} />
            <Metric label="Grade" value={semesterSummary.grade} />
          </div>

          <section className="card" style={{ padding: 0 }}>
            <div className="table-card-header">
              <div>
                <h3>Semester Marks</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Percentage</th><th>Grade</th></tr>
                </thead>
                <tbody>
                  {semesterRows.length === 0 ? (
                    <tr><td colSpan="5">No marks available for selected semester</td></tr>
                  ) : semesterRows.map(row => (
                    <tr key={row.id}>
                      <td>{row.subject}</td>
                      <td>{row.examType}</td>
                      <td>{row.marksObtained}/{row.maxMarks}</td>
                      <td>{round(percent(row))}%</td>
                      <td><span className="badge badge-blue">{row.grade || '-'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return <button onClick={onClick} style={{ padding: '7px 12px', borderRadius: 7, border: 0, cursor: 'pointer', background: active ? 'var(--bg-card)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{children}</button>
}

function Metric({ label, value }) {
  return <div className="stat-card" style={{ '--accent-color': '#1e40af', '--accent-bg': 'rgba(30,64,175,0.12)' }}><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
}

function groupBy(rows, fn) {
  const groups = new Map()
  rows.forEach(row => groups.set(fn(row), [...(groups.get(fn(row)) || []), row]))
  return groups
}

function componentRows(result) {
  try {
    return JSON.parse(result?.remarks || '{}').components || []
  } catch {
    return []
  }
}

function isPublishedResult(result) {
  try {
    const remarks = JSON.parse(result?.remarks || '{}')
    return remarks.published === true || remarks.exportedToAdmin === true
  } catch {
    return false
  }
}

function percent(row) {
  return (Number(row.marksObtained || 0) / Number(row.maxMarks || 100)) * 100
}

function summarizeSemester(rows) {
  const total = rows.reduce((sum, row) => sum + Number(row.maxMarks || 0), 0)
  const obtained = rows.reduce((sum, row) => sum + Number(row.marksObtained || 0), 0)
  const percentage = total ? round((obtained / total) * 100) : 0
  return { percentage, cgpa: round(percentage / 10), grade: gradeFromPercentage(percentage) }
}

function gradeFromPercentage(value) {
  if (value >= 90) return 'O'
  if (value >= 80) return 'A+'
  if (value >= 70) return 'A'
  if (value >= 60) return 'B+'
  if (value >= 50) return 'B'
  if (value >= 40) return 'C'
  return 'F'
}

function uniqueNumbers(values) {
  return [...new Set(values.map(Number).filter(Boolean))].sort((a, b) => a - b)
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

function downloadReport(profile, rows, summary) {
  if (!rows.length) return toast.error('No marks available to download')
  const html = `
    <html>
      <head>
        <title>Result Marksheet - ${escapeHtml(profile?.rollNumber || 'student')}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 28px; }
          h1 { margin: 0 0 4px; font-size: 24px; }
          .college-header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
          .college-name { font-size: 20px; font-weight: 800; text-transform: uppercase; }
          .college-affiliation { margin-top: 5px; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
          .report-title { margin-top: 14px; font-size: 18px; font-weight: 700; }
          .muted { color: #64748b; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 22px 0; }
          .box { border: 1px solid #dbe3ef; padding: 10px 12px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #dbe3ef; padding: 9px 10px; text-align: left; font-size: 13px; }
          th { background: #eef2f7; text-transform: uppercase; font-size: 11px; letter-spacing: .06em; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
          .summary .box strong { display: block; font-size: 20px; margin-top: 4px; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="college-header">
          <div class="college-name">The Karnataka Law Society's Gogte Institute of Technology, Belagavi</div>
          <div class="college-affiliation">Affiliated to Visvesvaraya Technological University, Belagavi</div>
          <div class="report-title">Result Marksheet</div>
          <div class="muted">Internal marks and published SEE marks</div>
        </div>
        <div class="details">
          <div class="box"><b>Name:</b> ${escapeHtml(profile?.fullName || '-')}</div>
          <div class="box"><b>USN:</b> ${escapeHtml(profile?.rollNumber || '-')}</div>
          <div class="box"><b>Course:</b> ${escapeHtml(`${profile?.courseCode || ''} ${profile?.courseName || ''}`.trim() || '-')}</div>
          <div class="box"><b>Semester:</b> ${escapeHtml(rows[0]?.semester || profile?.semester || '-')}</div>
          <div class="box"><b>Section:</b> ${escapeHtml(profile?.section || '-')}</div>
          <div class="box"><b>Academic Year:</b> ${escapeHtml(profile?.academicYear || '-')}</div>
        </div>
        <div class="summary">
          <div class="box">Percentage<strong>${summary.percentage}%</strong></div>
          <div class="box">CGPA<strong>${summary.cgpa}</strong></div>
          <div class="box">Grade<strong>${summary.grade}</strong></div>
        </div>
        <table>
          <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Percentage</th><th>Grade</th></tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${escapeHtml(row.subject || '-')}</td>
                <td>${escapeHtml(row.examType || '-')}</td>
                <td>${escapeHtml(`${row.marksObtained ?? 0} / ${row.maxMarks ?? 100}`)}</td>
                <td>${round(percent(row))}%</td>
                <td>${escapeHtml(row.grade || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank')
  if (!printWindow) return toast.error('Allow popups to download the PDF')
  printWindow.document.write(html)
  printWindow.document.close()
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]))
}
