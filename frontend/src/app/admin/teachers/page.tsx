'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Input, Select, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: 'teacher123', department_id: '', name: '', phone: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [t, d] = await Promise.all([adminApi.teachers(), adminApi.departments()])
      setTeachers(t.data); setDepts(d.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createTeacher({ ...form, department_id: Number(form.department_id) })
      toast.success('Teacher created'); setShowModal(false)
      setForm({ username: '', email: '', password: 'teacher123', department_id: '', name: '', phone: '' })
      load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete teacher ${name}?`)) return
    try { await adminApi.deleteTeacher(id); setTeachers(teachers.filter(t => t.id !== id)); toast.success('Deleted') }
    catch { toast.error('Failed') }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Teachers" subtitle={`${teachers.length} faculty members`}
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Teacher</Button>}
      />
      <Card>
        {teachers.length === 0 ? <EmptyState message="No teachers found." /> : (
          <Table headers={['Name', 'Department', 'Phone', 'Actions']}>
            {teachers.map(t => (
              <tr key={t.id}>
                <Td className="font-medium">{t.name}</Td>
                <Td><Badge label={t.department?.code || '?'} color="emerald" /></Td>
                <Td>{t.phone || '-'}</Td>
                <Td><Button variant="danger" size="sm" onClick={() => handleDelete(t.id, t.name)}><Trash2 className="h-3.5 w-3.5" /></Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Teacher">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <Input label="Username" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            <Input label="Email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <Input label="Password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <Select label="Department" required value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}
            options={depts.map(d => ({ value: d.id, label: d.name }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Teacher</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
