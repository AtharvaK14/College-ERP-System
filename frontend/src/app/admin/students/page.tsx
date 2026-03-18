'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import {
  Button, Card, Table, Td, Modal, Input, Select,
  PageHeader, EmptyState, Spinner, Badge,
} from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    username: '', email: '', password: 'student123',
    class_id: '', usn: '', name: '', phone: '',
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([adminApi.students(), adminApi.classes()])
      setStudents(s.data)
      setClasses(c.data)
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.createStudent({ ...form, class_id: Number(form.class_id) })
      toast.success('Student created')
      setShowModal(false)
      setForm({ username: '', email: '', password: 'student123', class_id: '', usn: '', name: '', phone: '' })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create student')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete student ${name}? This cannot be undone.`)) return
    try {
      await adminApi.deleteStudent(id)
      toast.success('Student deleted')
      setStudents(students.filter(s => s.id !== id))
    } catch { toast.error('Failed to delete') }
  }

  const classOptions = classes.map(c => ({
    value: c.id,
    label: `${c.department?.name || ''} - Sem ${c.semester} Sec ${c.section}`,
  }))

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${students.length} total students`}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Student
          </Button>
        }
      />

      <Card>
        {students.length === 0 ? (
          <EmptyState message="No students found. Add your first student." />
        ) : (
          <Table headers={['USN', 'Name', 'Class', 'Department', 'Semester', 'Section', 'Actions']}>
            {students.map(s => (
              <tr key={s.id}>
                <Td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.usn}</code></Td>
                <Td className="font-medium">{s.name}</Td>
                <Td>{s.class_?.department?.name || 'N/A'}</Td>
                <Td><Badge label={s.class_?.department?.code || '?'} color="blue" /></Td>
                <Td>{s.class_?.semester}</Td>
                <Td>{s.class_?.section}</Td>
                <Td>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s.id, s.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Student">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Arjun Sharma" />
            <Input label="USN" required value={form.usn} onChange={e => setForm({...form, usn: e.target.value})} placeholder="1SI21CS001" />
            <Input label="Username" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="1si21cs001" />
            <Input label="Email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="student@sjce.edu" />
            <Input label="Password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="9876543210" />
          </div>
          <Select
            label="Class"
            required
            value={form.class_id}
            onChange={e => setForm({...form, class_id: e.target.value})}
            options={classOptions}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
