import { useEffect, useMemo, useState } from 'react'
import { studentAPI } from '../services/api'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const COLORS = ['#1e40af', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#7c3aed']

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.analytics()
      .then(res => setAnalytics(res.data.data || null))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false))
  }, [])

  const healthData = useMemo(() => {
    const labels = new Set([
      ...(analytics?.attendanceByDepartment || []).map(row => row.label),
      ...(analytics?.passPercentageByDepartment || []).map(row => row.label),
    ])
    return Array.from(labels).map(label => ({
      label,
      attendance: analytics?.attendanceByDepartment?.find(row => row.label === label)?.value || 0,
      pass: analytics?.passPercentageByDepartment?.find(row => row.label === label)?.value || 0,
    }))
  }, [analytics])

  if (loading) return <div className="empty-state"><div className="spin" style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} /></div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Student Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Enrollment, attendance, and result insights from optimized backend aggregates
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Metric label="Total Students" value={analytics?.totalStudents || 0} tone="#1e40af" />
        <Metric label="Active Students" value={analytics?.activeStudents || 0} tone="#10b981" />
        <Metric label="Attendance Average" value={`${analytics?.averageAttendance || 0}%`} tone="#0891b2" />
        <Metric label="Pass Percentage" value={`${analytics?.passPercentage || 0}%`} tone="#f59e0b" />
      </div>

      <div className="dashboard-charts">
        <section className="card">
          <div className="section-title">
            <div>
              <h3>Department-wise Count</h3>
              <p>Live student count by branch</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.departmentCounts || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1e40af" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <div className="section-title">
            <div>
              <h3>Department Mix</h3>
              <p>Enrollment share across programs</p>
            </div>
          </div>
          {(analytics?.departmentCounts || []).length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={analytics.departmentCounts} cx="50%" cy="46%" innerRadius={58} outerRadius={90} dataKey="value" paddingAngle={4}>
                  {analytics.departmentCounts.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={9} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state compact">No department data available</div>}
        </section>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">
          <div>
            <h3>Attendance and Pass Percentage</h3>
            <p>Department-wise academic performance indicators</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={healthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="attendance" stroke="#0891b2" strokeWidth={3} />
            <Line type="monotone" dataKey="pass" stroke="#f59e0b" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <div className="section-title">
          <div>
            <h3>Low Attendance Alerts</h3>
            <p>Students below 75 percent attendance</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>USN/Register No.</th><th>Branch</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              {(analytics?.lowAttendanceAlerts || []).map(alert => (
                <tr key={alert.studentId}>
                  <td>{alert.studentName}</td>
                  <td><span className="mono erp-usn">{alert.rollNumber}</span></td>
                  <td>{alert.courseCode}</td>
                  <td>{alert.attendancePercentage}%</td>
                </tr>
              ))}
              {(analytics?.lowAttendanceAlerts || []).length === 0 && (
                <tr><td colSpan="4">No low attendance alerts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone }) {
  return (
    <div className="stat-card" style={{ '--accent-color': tone, '--accent-bg': `${tone}1f` }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
