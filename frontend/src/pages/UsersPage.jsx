import { useEffect, useState } from 'react'
import { ShieldCheck, UserCog, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { userAPI } from '../services/api'

const EMPTY = { username: '', password: '', fullName: '', email: '', phone: '', role: 'FACULTY' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [roleFilter, setRoleFilter] = useState('ALL')

  const load = async () => {
    const res = await userAPI.getAll()
    setUsers(res.data.data || [])
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(EMPTY)
    setEditing(null)
    setModal('form')
  }

  const openEdit = user => {
    setForm({
      username: user.username,
      password: '',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
    })
    setEditing(user)
    setModal('form')
  }

  const handleSave = async () => {
    if (!form.username || !form.password || !form.fullName || !form.email) {
      return toast.error('Fill all required fields')
    }

    setSaving(true)
    try {
      if (editing) await userAPI.update(editing.id, form)
      else await userAPI.create(form)
      toast.success(editing ? 'User updated!' : 'User created!')
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this user?')) return
    try {
      await userAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Cannot delete')
    }
  }

  const f = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }))

  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    return matchesRole
  })

  const roleCards = [
    { label: 'Total Users', value: users.length, icon: Users, color: '#1e40af' },
    { label: 'Admins', value: users.filter(user => user.role === 'ADMIN').length, icon: ShieldCheck, color: '#ef4444' },
    { label: 'Faculty', value: users.filter(user => user.role === 'FACULTY').length, icon: UserCog, color: '#0891b2' },
  ]

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Roles & Users</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Manage staff accounts, permissions, and ERP access
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>Add User</button>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {roleCards.map(card => {
          const Icon = card.icon
          return (
            <div className="stat-card" style={{ '--accent-color': card.color, '--accent-bg': `${card.color}18` }} key={card.label}>
              <div className="stat-icon"><Icon size={22} /></div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="form-input" value={roleFilter} onChange={event => setRoleFilter(event.target.value)} style={{ width: 160 }}>
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="FACULTY">Faculty</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-card-header">
          <div>
            <h3>Access Directory</h3>
            <p>{filteredUsers.length} of {users.length} users shown</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-red' : 'badge-blue'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-green' : 'badge-gray'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(user)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'form' && (
        <div className="overlay" onClick={event => event.target === event.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editing ? 'Edit User' : 'New User'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>x</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" value={form.username} onChange={f('username')} disabled={!!editing} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" value={form.password} onChange={f('password')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.fullName} onChange={f('fullName')} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={f('email')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={f('phone')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={f('role')}>
                  <option value="FACULTY">Faculty</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
