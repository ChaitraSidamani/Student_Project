import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, studentAPI, courseAPI, attendanceAPI, resultAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line,
  RadialBarChart, RadialBar
} from 'recharts'
import {
  Users, BookOpen, TrendingUp, Calendar, Award, AlertTriangle,
  CheckCircle, Clock, Target, Activity, BarChart3, PieChart as PieChartIcon
} from 'lucide-react'

const ATTENDANCE_TREND = [
  { month: 'Aug', attendance: 88, target: 85 },
  { month: 'Sep', attendance: 82, target: 85 },
  { month: 'Oct', attendance: 91, target: 85 },
  { month: 'Nov', attendance: 76, target: 85 },
  { month: 'Dec', attendance: 84, target: 85 },
  { month: 'Jan', attendance: 89, target: 85 },
]

const GRADE_DISTRIBUTION = [
  { grade: 'A+', count: 45, percentage: 18 },
  { grade: 'A', count: 67, percentage: 27 },
  { grade: 'B+', count: 58, percentage: 23 },
  { grade: 'B', count: 42, percentage: 17 },
  { grade: 'C+', count: 28, percentage: 11 },
  { grade: 'C', count: 12, percentage: 4 },
]

const PERFORMANCE_METRICS = [
  { metric: 'Avg GPA', value: 3.4, change: '+0.2', trend: 'up' },
  { metric: 'Pass Rate', value: 92, change: '+3%', trend: 'up' },
  { metric: 'Attendance', value: 85, change: '-2%', trend: 'down' },
  { metric: 'Retention', value: 96, change: '+1%', trend: 'up' },
]

const GRADE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280']

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [resultsData, setResultsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, studentsRes, coursesRes, attendanceRes, resultsRes] = await Promise.all([
          dashboardAPI.getStats(),
          studentAPI.getAll(),
          courseAPI.getAll(),
          attendanceAPI.getAll(),
          resultAPI.getAll()
        ])

        setStats(statsRes.data.data)
        setStudents(studentsRes.data.data || [])
        setCourses(coursesRes.data.data || [])
        setAttendanceData(attendanceRes.data.data || [])
        setResultsData(resultsRes.data.data || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const courseEnrollmentData = courses.map(course => ({
    name: course.code,
    students: students.filter(s => s.courseId === course.id).length,
    capacity: course.capacity || 60,
    utilization: Math.round((students.filter(s => s.courseId === course.id).length / (course.capacity || 60)) * 100)
  })).filter(d => d.students > 0)

  const attendanceStats = {
    total: attendanceData.length,
    present: attendanceData.filter(a => a.status === 'PRESENT').length,
    absent: attendanceData.filter(a => a.status === 'ABSENT').length,
    late: attendanceData.filter(a => a.status === 'LATE').length,
    percentage: attendanceData.length > 0 ?
      Math.round((attendanceData.filter(a => a.status === 'PRESENT').length / attendanceData.length) * 100) : 0
  }

  const recentActivities = [
    { type: 'enrollment', message: 'New student enrolled in Computer Science', time: '2 hours ago', icon: Users },
    { type: 'result', message: 'Semester results published for Batch 2024', time: '4 hours ago', icon: Award },
    { type: 'attendance', message: 'Low attendance alert for Mathematics class', time: '6 hours ago', icon: AlertTriangle },
    { type: 'course', message: 'New course "Data Structures" added', time: '1 day ago', icon: BookOpen },
  ]

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? students.length,
      change: '+12%',
      trend: 'up',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      icon: Users,
      description: 'Active enrollments'
    },
    {
      label: 'Courses Offered',
      value: stats?.totalCourses ?? courses.length,
      change: '+2',
      trend: 'up',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      icon: BookOpen,
      description: 'This semester'
    },
    {
      label: 'Avg Attendance',
      value: `${attendanceStats.percentage}%`,
      change: attendanceStats.percentage > 85 ? '+2%' : '-1%',
      trend: attendanceStats.percentage > 85 ? 'up' : 'down',
      color: attendanceStats.percentage > 85 ? '#f59e0b' : '#ef4444',
      bg: attendanceStats.percentage > 85 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      icon: Calendar,
      description: 'Monthly average'
    },
    {
      label: 'Faculty Members',
      value: stats?.totalFaculty ?? '12',
      change: '+1',
      trend: 'up',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      icon: Award,
      description: 'Teaching staff'
    },
  ]

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-status">
            <div className="status-indicator"></div>
            <span className="status-text">Live Dashboard</span>
          </div>
          <h1 className="dashboard-title">
            Welcome back, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="dashboard-subtitle">
            Here's what's happening in your institution today.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary">
            <BarChart3 size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon" style={{ backgroundColor: card.bg }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              <div className="stat-trend" style={{ color: card.trend === 'up' ? '#10b981' : '#ef4444' }}>
                {card.change}
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-description">{card.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Attendance Trend Chart */}
        <div className="chart-card chart-large">
          <div className="chart-header">
            <div className="chart-title">
              <Activity size={20} />
              <h3>Attendance Trend</h3>
            </div>
            <div className="chart-actions">
              <button className="btn btn-ghost btn-sm">View Details</button>
            </div>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ATTENDANCE_TREND} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#targetGradient)"
                  name="Target"
                />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#attendanceGradient)"
                  name="Attendance %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Enrollment & Grade Distribution */}
        <div className="chart-grid">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <PieChartIcon size={20} />
                <h3>Course Enrollment</h3>
              </div>
            </div>
            <div className="chart-content">
              {courseEnrollmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={courseEnrollmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="students"
                    >
                      {courseEnrollmentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend
                      iconSize={8}
                      iconType="circle"
                      formatter={(value) => (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <BookOpen size={48} />
                  <p>No enrollment data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Award size={20} />
                <h3>Grade Distribution</h3>
              </div>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={GRADE_DISTRIBUTION} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-bottom">
        {/* Performance Metrics */}
        <div className="metrics-card">
          <div className="card-header">
            <h3>Performance Metrics</h3>
            <span className="card-subtitle">Key performance indicators</span>
          </div>
          <div className="metrics-grid">
            {PERFORMANCE_METRICS.map((metric, index) => (
              <div key={index} className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">{metric.metric}</span>
                  <span className={`metric-change ${metric.trend}`}>
                    {metric.change}
                  </span>
                </div>
                <div className="metric-value">{metric.value}{metric.metric.includes('Rate') || metric.metric.includes('Attendance') ? '%' : ''}</div>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{
                      width: `${metric.metric.includes('GPA') ? (metric.value / 4) * 100 : metric.value}%`,
                      backgroundColor: metric.trend === 'up' ? '#10b981' : '#ef4444'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities & Quick Actions */}
        <div className="activities-section">
          <div className="activities-card">
            <div className="card-header">
              <h3>Recent Activities</h3>
              <Link to="/notifications" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            <div className="activities-list">
              {recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon" style={{ backgroundColor: getActivityColor(activity.type) }}>
                    <activity.icon size={16} />
                  </div>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="quick-actions-card">
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="quick-actions-grid">
              <Link to="/students" className="quick-action-btn">
                <Users size={20} />
                <span>Add Student</span>
              </Link>
              <Link to="/courses" className="quick-action-btn">
                <BookOpen size={20} />
                <span>Add Course</span>
              </Link>
              <Link to="/attendance" className="quick-action-btn">
                <Calendar size={20} />
                <span>Mark Attendance</span>
              </Link>
              <Link to="/results" className="quick-action-btn">
                <Award size={20} />
                <span>Enter Results</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getActivityColor(type) {
  const colors = {
    enrollment: 'rgba(16, 185, 129, 0.1)',
    result: 'rgba(139, 92, 246, 0.1)',
    attendance: 'rgba(239, 68, 68, 0.1)',
    course: 'rgba(59, 130, 246, 0.1)'
  }
  return colors[type] || 'rgba(107, 114, 128, 0.1)'
}