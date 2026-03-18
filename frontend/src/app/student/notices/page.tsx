'use client'

import { useEffect, useState } from 'react'
import { studentApi } from '@/lib/api'
import { Card, Spinner, PageHeader, EmptyState } from '@/components/ui'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function StudentNotices() {
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.notices()
      .then(({ data }) => setNotices(data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements from the college administration" />
      {notices.length === 0 ? (
        <Card><EmptyState message="No notices posted yet." /></Card>
      ) : (
        <div className="space-y-4">
          {notices.map(n => (
            <Card key={n.id} className="p-5">
              <div className="flex gap-3">
                <div className="p-2 bg-blue-50 rounded-lg mt-0.5 flex-shrink-0">
                  <Bell className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{n.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{format(new Date(n.created_at), 'dd MMM yyyy, h:mm a')}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
