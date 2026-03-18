'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { teacherApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Select, Textarea, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const LEAVE_TYPES = ['casual', 'medical', 'earned', 'other']
const statusColor = (s: string) => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'

export default function TeacherLeaves() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' })

  const load = () => {
    setLoading(true)
    teacherApi.myLeaves()
      .then(({ data }) => setLeaves(data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await teacherApi.applyLeave(form)
      toast.success('Leave application submitted'); setShowModal(false)
      setForm({ leave_type: 'casual', from_date: '', to_date: '', reason: '' }); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="My Leaves" subtitle={`${leaves.filter(l => l.status === 'pending').length} pending requests`}
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Apply Leave</Button>}
      />
      <Card>
        {leaves.length === 0 ? <EmptyState message="No leave requests yet." /> : (
          <Table headers={['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Applied']}>
            {leaves.map(l => {
              const days = Math.ceil((new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000) + 1
              return (
                <tr key={l.id}>
                  <Td><Badge label={l.leave_type} color="blue" /></Td>
                  <Td>{format(new Date(l.from_date), 'dd MMM yyyy')}</Td>
                  <Td>{format(new Date(l.to_date), 'dd MMM yyyy')}</Td>
                  <Td>{days} day{days > 1 ? 's' : ''}</Td>
                  <Td className="max-w-xs truncate">{l.reason || '-'}</Td>
                  <Td><Badge label={l.status} color={statusColor(l.status) as any} /></Td>
                  <Td className="text-gray-400 text-xs">{format(new Date(l.applied_at), 'dd MMM')}</Td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Apply for Leave">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Leave Type" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}
            options={LEAVE_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">From Date</label>
              <input type="date" required value={form.from_date} min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm({ ...form, from_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">To Date</label>
              <input type="date" required value={form.to_date} min={form.from_date || format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm({ ...form, to_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <Textarea label="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Optional reason..." rows={3} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Submit Application</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
