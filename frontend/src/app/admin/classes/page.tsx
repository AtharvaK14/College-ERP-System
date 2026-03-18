'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Select, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminClasses() {
  const [classes, setClasses] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ department_id: '', semester: '', section: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [c, d] = await Promise.all([adminApi.classes(), adminApi.departments()])
      setClasses(c.data); setDepts(d.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createClass({ department_id: Number(form.department_id), semester: Number(form.semester), section: form.section })
      toast.success('Class created'); setShowModal(false)
      setForm({ department_id: '', semester: '', section: '' }); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const semesterOptions = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }))
  const sectionOptions = ['A', 'B', 'C', 'D'].map(s => ({ value: s, label: `Section ${s}` }))

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Classes" subtitle={`${classes.length} classes`}
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Class</Button>}
      />
      <Card>
        {classes.length === 0 ? <EmptyState message="No classes found." /> : (
          <Table headers={['Department', 'Semester', 'Section', 'Class ID']}>
            {classes.map(c => (
              <tr key={c.id}>
                <Td>{c.department?.name}</Td>
                <Td><Badge label={`Sem ${c.semester}`} color="blue" /></Td>
                <Td><Badge label={`Sec ${c.section}`} color="gray" /></Td>
                <Td><code className="text-xs text-gray-500">#{c.id}</code></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Class">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Department" required value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
            options={depts.map(d => ({ value: d.id, label: d.name }))} />
          <Select label="Semester" required value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} options={semesterOptions} />
          <Select label="Section" required value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} options={sectionOptions} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Class</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
