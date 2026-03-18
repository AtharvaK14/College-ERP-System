'use client'

import { useEffect, useState } from 'react'
import { teacherApi } from '@/lib/api'
import { Button, Card, Modal, Textarea, Select, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import { format } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const statusColor = (s: string) => s === 'resolved' ? 'green' : s === 'closed' ? 'gray' : 'yellow'

export default function TeacherComplaints() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState('resolved')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    teacherApi.myComplaints()
      .then(({ data }) => setComplaints(data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await teacherApi.respondComplaint(selected.id, { response, status })
      toast.success('Response sent'); setSelected(null); setResponse(''); load()
    } catch { toast.error('Failed to respond') }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Student Complaints" subtitle={`${complaints.filter(c => c.status === 'open').length} open`} />
      <div className="space-y-4">
        {complaints.length === 0 ? (
          <Card><EmptyState message="No complaints received." /></Card>
        ) : (
          complaints.map(c => (
            <Card key={c.id} className={clsx('p-5', c.status === 'open' && 'border-l-4 border-l-yellow-400')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg mt-0.5">
                    <MessageSquare className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{c.subject}</h3>
                      <Badge label={c.status} color={statusColor(c.status) as any} />
                    </div>
                    <p className="text-sm text-gray-600">{c.message}</p>
                    {c.response && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-700 font-medium mb-1">Your response:</p>
                        <p className="text-sm text-green-800">{c.response}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(c.created_at), 'dd MMM yyyy, h:mm a')}
                    </p>
                  </div>
                </div>
                {c.status === 'open' && (
                  <Button size="sm" onClick={() => { setSelected(c); setResponse(''); setStatus('resolved') }}>
                    Respond
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Respond to Complaint">
        {selected && (
          <form onSubmit={handleRespond} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">{selected.subject}</p>
              <p className="text-sm text-gray-500 mt-1">{selected.message}</p>
            </div>
            <Textarea label="Your Response" required value={response}
              onChange={e => setResponse(e.target.value)} placeholder="Type your response..." rows={4} />
            <Select label="Mark as" value={status} onChange={e => setStatus(e.target.value)}
              options={[{ value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }]} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setSelected(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Send Response</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
