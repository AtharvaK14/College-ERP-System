'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Bell } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Button, Card, Modal, Input, Textarea, PageHeader, EmptyState, Spinner } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminNotices() {
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  const load = () => {
    setLoading(true)
    adminApi.notices()
      .then(({ data }) => setNotices(data))
      .catch(() => toast.error('Failed to load notices'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.createNotice(form)
      toast.success('Notice posted')
      setShowModal(false)
      setForm({ title: '', content: '' })
      load()
    } catch { toast.error('Failed to post notice') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notice?')) return
    try {
      await adminApi.deleteNotice(id)
      setNotices(notices.filter(n => n.id !== id))
      toast.success('Notice deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Notices"
        subtitle="Broadcast announcements to all students"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Post Notice
          </Button>
        }
      />

      <div className="space-y-4">
        {notices.length === 0 ? (
          <Card><EmptyState message="No notices posted yet." /></Card>
        ) : (
          notices.map(n => (
            <Card key={n.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg mt-0.5">
                    <Bell className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{n.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Posted {format(new Date(n.created_at), 'dd MMM yyyy, h:mm a')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(n.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Post New Notice">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Mid-semester exam schedule"
          />
          <Textarea
            label="Content"
            required
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Notice details..."
            rows={5}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Post Notice</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
