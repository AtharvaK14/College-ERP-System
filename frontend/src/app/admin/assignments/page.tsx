'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Select, Input, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ teacher_id: '', course_id: '', class_id: '', day: '', time_slot: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [a, t, c, cl] = await Promise.all([
        adminApi.assignments(), adminApi.teachers(), adminApi.courses(), adminApi.classes()
      ])
      setAssignments(a.data); setTeachers(t.data); setCourses(c.data); setClasses(cl.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createAssign({
        teacher_id: Number(form.teacher_id),
        course_id: Number(form.course_id),
        class_id: Number(form.class_id),
        day: form.day || null,
        time_slot: form.time_slot || null,
      })
      toast.success('Assignment created'); setShowModal(false)
      setForm({ teacher_id: '', course_id: '', class_id: '', day: '', time_slot: '' }); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Already assigned') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this assignment?')) return
    try { await adminApi.deleteAssign(id); setAssignments(assignments.filter(a => a.id !== id)); toast.success('Removed') }
    catch { toast.error('Failed') }
  }

  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => ({ value: d, label: d }))

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Course Assignments" subtitle="Assign teachers to courses and classes"
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Assign</Button>}
      />
      <Card>
        {assignments.length === 0 ? <EmptyState message="No assignments found." /> : (
          <Table headers={['Teacher', 'Course', 'Class', 'Day', 'Time Slot', 'Actions']}>
            {assignments.map(a => (
              <tr key={a.id}>
                <Td className="font-medium">{a.teacher?.name}</Td>
                <Td><Badge label={a.course?.shortname || a.course?.name} color="blue" /></Td>
                <Td>{a.class_?.department?.code} Sem{a.class_?.semester} {a.class_?.section}</Td>
                <Td>{a.day || '-'}</Td>
                <Td><code className="text-xs">{a.time_slot || '-'}</code></Td>
                <Td><Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Assign Teacher to Course">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Teacher" required value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}
            options={teachers.map(t => ({ value: t.id, label: t.name }))} />
          <Select label="Course" required value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}
            options={courses.map(c => ({ value: c.id, label: `${c.shortname} - ${c.name}` }))} />
          <Select label="Class" required value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}
            options={classes.map(c => ({ value: c.id, label: `${c.department?.name} Sem${c.semester} Sec${c.section}` }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Day (optional)" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} options={dayOptions} />
            <Input label="Time Slot (optional)" value={form.time_slot} onChange={e => setForm({ ...form, time_slot: e.target.value })} placeholder="09:00-10:00" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
