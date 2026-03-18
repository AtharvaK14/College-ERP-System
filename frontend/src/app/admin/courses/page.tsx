'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Input, Select, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', shortname: '', department_id: '', credits: '4' })

  const load = async () => {
    setLoading(true)
    try {
      const [c, d] = await Promise.all([adminApi.courses(), adminApi.departments()])
      setCourses(c.data); setDepts(d.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditTarget(null); setForm({ name: '', shortname: '', department_id: '', credits: '4' }); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditTarget(c)
    setForm({ name: c.name, shortname: c.shortname, department_id: String(c.department_id), credits: String(c.credits) })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, department_id: Number(form.department_id), credits: Number(form.credits) }
    try {
      if (editTarget) { await adminApi.updateCourse(editTarget.id, payload); toast.success('Course updated') }
      else { await adminApi.createCourse(payload); toast.success('Course created') }
      setShowModal(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete course "${name}"?`)) return
    try { await adminApi.deleteCourse(id); setCourses(courses.filter(c => c.id !== id)); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Courses" subtitle={`${courses.length} courses`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Course</Button>}
      />
      <Card>
        {courses.length === 0 ? <EmptyState message="No courses found." /> : (
          <Table headers={['Code', 'Name', 'Department', 'Credits', 'Actions']}>
            {courses.map(c => (
              <tr key={c.id}>
                <Td><Badge label={c.shortname} color="blue" /></Td>
                <Td className="font-medium">{c.name}</Td>
                <Td>Dept #{c.department_id}</Td>
                <Td>{c.credits}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(c.id, c.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Course Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Database Management Systems" />
          <Input label="Short Name" required value={form.shortname} onChange={e => setForm({ ...form, shortname: e.target.value.toUpperCase() })} placeholder="DBMS" />
          <Select label="Department" required value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
            options={depts.map(d => ({ value: d.id, label: d.name }))} />
          <Input label="Credits" type="number" required value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} min="1" max="10" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editTarget ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
