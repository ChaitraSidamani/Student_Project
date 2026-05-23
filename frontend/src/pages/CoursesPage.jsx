import { useEffect, useState } from 'react'
import { courseAPI, studentAPI, erpAPI } from '../services/api'
import toast from 'react-hot-toast'

const EMPTY = { code:'', name:'', description:'', durationYears:'', totalSemesters:'', maxStudents:'' }

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [branches, setBranches] = useState([])
  const [subjects, setSubjects] = useState([])
  const [semesters, setSemesters] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(() => ({ ...EMPTY }))
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [subjectCourse, setSubjectCourse] = useState(null)
  const [subjectForm, setSubjectForm] = useState({ semester: '', name: '' })
  // DB-backed components
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [dbComponents, setDbComponents] = useState([])
  const [componentDraft, setComponentDraft] = useState({ name: '', maxMarks: '' })
  const [savingSubject, setSavingSubject] = useState(false)
  const [savingComponent, setSavingComponent] = useState(false)

  const load = async () => {
    try {
      const cRes = await courseAPI.getAll()
      setCourses((cRes.data.data || []).sort(newestFirst))
    } catch {
      setCourses([])
      toast.error('Could not load courses')
    }
    const [sRes, bRes, subRes, semRes] = await Promise.allSettled([
      studentAPI.getAll(),
      erpAPI.branches(),
      erpAPI.subjects(),
      erpAPI.semesters(),
    ])
    setStudents(sRes.status === 'fulfilled' ? (sRes.value.data.data || []) : [])
    setBranches(bRes.status === 'fulfilled' ? (bRes.value.data.data || []) : [])
    setSubjects(subRes.status === 'fulfilled' ? (subRes.value.data.data || []) : [])
    setSemesters(semRes.status === 'fulfilled' ? (semRes.value.data.data || []) : [])
  }

  useEffect(() => { load() }, [])

  const studentCount = (courseId) => students.filter(s => s.courseId === courseId).length
  const selectedCourseSubjects = selectedCourse ? subjectsForCourse(selectedCourse, subjects) : []
  const subjectCourseRows = subjectCourse ? subjectsForCourse(subjectCourse, subjects) : []

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setModal('form') }
  const openEdit = (c) => {
    setForm({ code:c.code, name:c.name, description:c.description||'', durationYears:c.durationYears, totalSemesters:c.totalSemesters, maxStudents:c.maxStudents })
    setEditing(c); setModal('form')
  }
  const openSubjectPanel = (course) => {
    setSubjectCourse(course); setSelectedCourse(null); setSubjectForm({ semester: '', name: '' })
  }

  const handleSave = async () => {
    if (!form.name) return toast.error('Course name required')
    if (!form.durationYears || !form.totalSemesters || !form.maxStudents)
      return toast.error('Duration, semesters, and max students are required')
    const payload = {
      ...form,
      code: editing ? form.code : generateCourseCode(form),
      durationYears: Number(form.durationYears),
      totalSemesters: Number(form.totalSemesters),
      maxStudents: Number(form.maxStudents),
    }
    setSaving(true)
    try {
      if (editing) await courseAPI.update(editing.id, payload)
      else {
        await courseAPI.create(payload)
        // Auto-create a matching ERP department so it appears in Faculty > Department dropdown
        const deptCode = courseToCode(payload.code)
        try {
          await erpAPI.saveDepartment({
            code: deptCode,
            name: payload.name,
            hodName: 'To be assigned',
            active: true,
          })
        } catch { /* ignore if dept already exists */ }
      }
      toast.success(editing ? 'Course updated!' : 'Course created!')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return
    try { await courseAPI.delete(id); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Could not delete course') }
  }

  const handleAddSubject = async () => {
    if (!subjectCourse) return toast.error('Select a course first')
    if (!subjectForm.semester || !subjectForm.name.trim()) return toast.error('Select semester and enter subject name')
    setSavingSubject(true)
    try {
      const branch = await ensureBranch(subjectCourse, branches, setBranches)
      const semester = await ensureSemester(Number(subjectForm.semester), semesters, setSemesters)
      const code = nextSubjectCode(subjectCourse, Number(subjectForm.semester), subjects)
      await erpAPI.saveSubject({
        code, name: subjectForm.name.trim(),
        branch: { id: branch.id }, semester: { id: semester.id },
        credits: 4, type: 'THEORY', active: true,
      })
      toast.success(`Subject added: ${code}`)
      setSubjectForm(prev => ({ ...prev, name: '' }))
      await load()
    } catch (err) { toast.error(err.response?.data?.message || 'Could not add subject') }
    finally { setSavingSubject(false) }
  }

  const openSubjectDetails = async (subject) => {
    setSelectedSubject(subject)
    setComponentDraft({ name: '', maxMarks: '' })
    try {
      const res = await erpAPI.getSubjectComponents(subject.id)
      setDbComponents(res.data.data || [])
    } catch {
      setDbComponents([])
    }
  }

  const addComponent = async () => {
    if (!selectedSubject) return toast.error('Choose a subject first')
    if (!componentDraft.name.trim()) return toast.error('Enter component name')
    const maxMarks = Number(componentDraft.maxMarks)
    if (!maxMarks || maxMarks <= 0) return toast.error('Enter allocated marks')
    setSavingComponent(true)
    try {
      const res = await erpAPI.saveSubjectComponent(selectedSubject.id, {
        name: componentDraft.name.trim(),
        maxMarks,
        sequence: dbComponents.length,
      })
      setDbComponents(prev => [...prev, res.data.data])
      setComponentDraft({ name: '', maxMarks: '' })
      toast.success('Component saved to database')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save component')
    } finally {
      setSavingComponent(false)
    }
  }

  const removeComponent = async (componentId) => {
    try {
      await erpAPI.deleteSubjectComponent(componentId)
      setDbComponents(prev => prev.filter(c => c.id !== componentId))
      toast.success('Component removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove component')
    }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const totalAllocated = dbComponents.reduce((sum, c) => sum + (c.maxMarks || 0), 0)

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Courses</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:2 }}>Manage academic programmes with departments, branches, and subjects</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><PlusIcon /> Add Course</button>
      </div>

      <div className="grid-3">
        {courses.map(c => {
          const enrolled = studentCount(c.id)
          const pct = Math.round((enrolled / c.maxStudents) * 100)
          return (
            <div key={c.id} className="card" onClick={() => setSelectedCourse(c)}
              style={{ display:'flex', flexDirection:'column', gap:14, cursor:'pointer',
                borderColor: selectedCourse?.id === c.id ? 'var(--accent)' : undefined }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{ background:'var(--accent-glow)', color:'var(--accent)',
                  padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700,
                  fontFamily:'Space Mono, monospace' }}>{c.code}</div>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{c.name}</div>
                {c.description && <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4, lineHeight:1.5 }}>{c.description}</div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['Duration', `${c.durationYears} yrs`], ['Semesters', c.totalSemesters], ['Capacity', c.maxStudents]].map(([l, v]) => (
                  <div key={l} style={{ background:'var(--bg-elevated)', borderRadius:6, padding:'8px 10px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
                    <div style={{ fontSize:15, fontWeight:700, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>Enrolled</span>
                  <span style={{ fontWeight:600 }}>{enrolled} / {c.maxStudents}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{
                    width:`${Math.min(pct,100)}%`,
                    background: pct > 80 ? 'var(--accent4)' : pct > 60 ? 'var(--accent3)' : 'var(--accent)' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
                <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center', fontSize:12 }} onClick={e => { e.stopPropagation(); openEdit(c) }}>Edit</button>
                <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center', fontSize:12 }} onClick={e => { e.stopPropagation(); openSubjectPanel(c) }}>Sem Wise Subjects</button>
                <button className="btn btn-danger" style={{ padding:'8px 14px', fontSize:12 }} onClick={e => { e.stopPropagation(); handleDeleteCourse(c.id) }}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {subjectCourse && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSubjectCourse(null)}>
          <div className="modal" style={{ maxWidth: 920 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700 }}>Add Semester Wise Subjects</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{subjectCourse.code} - choose semester and add subjects one by one</p>
              </div>
              <button onClick={() => setSubjectCourse(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select className="form-input" value={subjectForm.semester} onChange={e => setSubjectForm(p => ({ ...p, semester: e.target.value ? Number(e.target.value) : '' }))}>
                    <option value="">Select semester</option>
                    {semesterOptions(subjectCourse).map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input className="form-input" value={subjectForm.name} onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter subject name" />
                </div>
                <button className="btn btn-primary" onClick={handleAddSubject} disabled={savingSubject}>{savingSubject ? 'Adding...' : 'Add Subject'}</button>
              </div>
              <SemesterSubjectList course={subjectCourse} subjects={subjectCourseRows} showEmpty={false} onSubjectClick={openSubjectDetails} />
            </div>
          </div>
        </div>
      )}

      {selectedSubject && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSelectedSubject(null)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700 }}>{selectedSubject.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  {selectedSubject.code || '-'} — Semester {subjectSemesterNumber(selectedSubject) || '-'} — {branchCode(selectedSubject.branch || selectedSubject) || 'Course subject'}
                </p>
              </div>
              <button onClick={() => setSelectedSubject(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                Total allocated: <strong>{totalAllocated} / 100</strong> marks
                {totalAllocated > 100 && <span style={{ color: 'var(--accent4)', marginLeft: 8 }}>⚠ Exceeds 100</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Component Name</label>
                  <input className="form-input" value={componentDraft.name} onChange={e => setComponentDraft(p => ({ ...p, name: e.target.value }))} placeholder="e.g. IA1 / IA2 / Assignment" />
                </div>
                <div className="form-group">
                  <label className="form-label">Allocated Marks</label>
                  <input className="form-input" type="number" min="1" max={100 - totalAllocated} value={componentDraft.maxMarks} onChange={e => setComponentDraft(p => ({ ...p, maxMarks: e.target.value }))} placeholder="Marks" />
                </div>
                <button className="btn btn-primary" onClick={addComponent} disabled={savingComponent || totalAllocated >= 100}>
                  {savingComponent ? 'Saving...' : 'Add'}
                </button>
              </div>
              {dbComponents.length === 0 ? (
                <div className="empty-state compact">No components yet. Add components above (e.g. IA1=30, IA2=30, Assignment=40)</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {dbComponents.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Allocated marks: {c.maxMarks}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeComponent(c.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSelectedCourse(null)}>
          <div className="modal" style={{ maxWidth: 920 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700 }}>{selectedCourse.code} Subjects</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Semester-wise subject list</p>
              </div>
              <button onClick={() => setSelectedCourse(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>×</button>
            </div>
            <div className="modal-body">
              <SemesterSubjectList course={selectedCourse} subjects={selectedCourseSubjects} showEmpty={false} onSubjectClick={openSubjectDetails} />
            </div>
          </div>
        </div>
      )}

      {modal === 'form' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontWeight:700 }}>{editing ? 'Edit Course' : 'New Course'}</h3>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>×</button>
            </div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Course Name *</label>
                  <input className="form-input" value={form.name} onChange={f('name')} placeholder="B.Tech Computer Science Engineering" />
                </div>
                {editing && (
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-input" value={form.code} disabled />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={form.description} onChange={f('description')} placeholder="Brief description..." />
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Duration (Years)</label>
                  <input className="form-input" type="number" min="1" max="6" value={form.durationYears ?? ''} onChange={f('durationYears')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Semesters</label>
                  <input className="form-input" type="number" min="1" max="12" value={form.totalSemesters ?? ''} onChange={f('totalSemesters')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Students</label>
                  <input className="form-input" type="number" min="1" value={form.maxStudents ?? ''} onChange={f('maxStudents')} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Course'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlusIcon() {
  return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}

function SemesterSubjectList({ course, subjects, showEmpty = true, onSubjectClick }) {
  const semesterRows = semesterOptions(course)
    .map(semester => ({ semester, rows: subjects.filter(s => subjectSemesterNumber(s) === semester) }))
    .filter(group => showEmpty || group.rows.length > 0)
  if (semesterRows.length === 0) {
    return <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)' }}>No subjects added yet.</div>
  }
  return (
    <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
      {semesterRows.map(({ semester, rows }) => (
        <div key={semester} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Semester {semester}</div>
          {rows.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No subjects added</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {rows.map(subject => (
                <button key={subject.id} type="button" onClick={() => onSubjectClick?.(subject)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, textAlign: 'left', color: 'inherit', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{subject.code}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>{subject.name}</div>
                  <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8 }}>Click to manage components</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function subjectsForCourse(course, rows) {
  const code = courseBranchCode(course)
  return (rows || []).filter(s => branchCode(s.branch || s) === code)
}
function courseToCode(code) {
  const c = String(code || '').trim().toUpperCase()
  if (c.startsWith('BTECH-')) return c.replace('BTECH-', '')
  if (c.startsWith('BTECH')) return c.replace('BTECH', '').replace(/^\W+/, '') || c
  return c
}

function courseBranchCode(course) {
  const code = String(course?.code || '').trim().toUpperCase()
  if (code.startsWith('BTECH-')) return code.replace('BTECH-', '')
  if (code.startsWith('BTECH')) return code.replace('BTECH', '').replace(/^\W+/, '')
  return code
}
function branchCode(value) {
  return String(value?.code || value?.branchCode || '').trim().toUpperCase().replace('BTECH-', '')
}
function subjectSemesterNumber(subject) {
  const raw = subject.semester?.number ?? subject.semesterNumber ?? subject.semester
  if (typeof raw === 'object' && raw !== null) return Number(raw.number || 0)
  const match = String(raw || '').match(/\d+/)
  return match ? Number(match[0]) : 0
}
async function ensureBranch(course, branches, setBranches) {
  const code = courseBranchCode(course)
  const existing = (branches || []).find(b => branchCode(b) === code)
  if (existing) return existing
  const res = await erpAPI.saveBranch({ code, name: course.name || code, durationSemesters: Number(course.totalSemesters || 0), active: true })
  const saved = res.data.data
  setBranches(prev => [...prev, saved])
  return saved
}
async function ensureSemester(number, semesters, setSemesters) {
  const existing = (semesters || []).find(s => Number(s.number) === Number(number))
  if (existing) return existing
  const res = await erpAPI.saveSemester({ number, name: `Semester ${number}`, active: true })
  const saved = res.data.data
  setSemesters(prev => [...prev, saved])
  return saved
}
function nextSubjectCode(course, semester, subjects) {
  const prefix = courseBranchCode(course).replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'SB'
  const existingCount = subjectsForCourse(course, subjects).filter(s => subjectSemesterNumber(s) === semester).length
  return `${prefix}${Number(semester) % 10}${String(existingCount + 1).padStart(2, '0')}`.slice(0, 30)
}
function semesterOptions(course) {
  const total = Number(course?.totalSemesters || 0)
  if (!Number.isFinite(total) || total <= 0) return []
  return Array.from({ length: total }, (_, i) => i + 1)
}
function newestFirst(a, b) {
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
  if (aTime !== bTime) return bTime - aTime
  return Number(b.id || 0) - Number(a.id || 0)
}
function generateCourseCode(course) {
  const prefix = courseCodePrefix(course.name).slice(0, 2)
  const duration = digit(course.durationYears)
  const semesters = digit(course.totalSemesters)
  const capacity = digit(course.maxStudents)
  return `${prefix}${duration}${semesters}${capacity}`.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
}
function courseCodePrefix(name) {
  const value = String(name || '').toUpperCase()
  if (value.includes('B.TECH') || value.includes('BTECH')) return acronym(value.replace('B.TECH', '').replace('BTECH', ''))
  return acronym(value)
}
function digit(value) { return String(Math.abs(Number(value || 0)) % 10) }
function acronym(value) {
  const skip = new Set(['OF', 'AND', 'THE', 'FOR', 'IN'])
  const code = String(value || '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w && !skip.has(w)).map(w => w[0]).join('').slice(0, 8)
  return code || 'COURSE'
}
