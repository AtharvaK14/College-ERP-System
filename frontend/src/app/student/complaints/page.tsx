'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { studentApi, adminApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Input, Textarea, Select, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const statusColor = (s: string) => s === 'resolved' ? 'green' : s === 'closed' ? 'gray' : 'yellow'

export default function StudentComplaints() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ teacher_id: '', subject: '', message: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [c, t] = await Promise.all([studentApi.complaints(), adminApi.teachers()])
      setComplaints(c.data); setTeachers(t.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await studentApi.fileComplaint({ ...form, teacher_id: Number(form.teacher_id) })
      toast.success('Complaint submitted'); setShowModal(false)
      setForm({ teacher_id: '', subject: '', message: '' }); load()
    } catch { toast.error('Failed to submit') }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="My Complaints" subtitle="Submit queries or feedback to your teachers"
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />New Complaint</Button>}
      />
      <Card>
        {complaints.length === 0 ? <EmptyState message="No complaints submitted yet." /> : (
          <Table headers={['Subject', 'Status', 'Response', 'Date']}>
            {complaints.map(c => (
              <tr key={c.id}>
                <Td className="font-medium">{c.subject}</Td>
                <Td><Badge label={c.status} color={statusColor(c.status) as any} /></Td>
                <Td className="max-w-xs">{c.response || <span className="text-gray-300 italic">Awaiting response</span>}</Td>
                <Td className="text-xs text-gray-400">{format(new Date(c.created_at), 'dd MMM yyyy')}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Submit Complaint / Query">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Teacher" required value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}
            options={teachers.map(t => ({ value: t.id, label: t.name }))} />
          <Input label="Subject" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Doubt in DBMS normalization" />
          <Textarea label="Message" required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Describe your query..." rows={4} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
