'use client'

import { useEffect, useState } from 'react'
import { Bell, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { studentApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader, Badge } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.dashboard()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data) return null

  const belowThreshold = data.attendance_summaries.filter((s: any) => s.below_threshold)

  return (
    <div>
      <PageHeader
        title={`Welcome, ${data.student.name}`}
        subtitle={`${data.student.usn} · ${data.student.class_?.department?.name}`}
      />

      {belowThreshold.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Low Attendance Warning</p>
            <p className="text-sm text-red-600 mt-0.5">
              You are below 75% in: {belowThreshold.map((s: any) => s.course_shortname).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendance summary */}
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Attendance Overview
            </h3>
            <div className="space-y-3">
              {data.attendance_summaries.map((s: any) => (
                <div key={s.course_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.course_shortname}</span>
                    <span className={clsx('text-sm font-semibold', s.below_threshold ? 'text-red-600' : 'text-green-600')}>
                      {s.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', s.below_threshold ? 'bg-red-500' : 'bg-green-500')}
                      style={{ width: `${Math.min(s.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.attended} / {s.total} classes</p>
                </div>
              ))}
              {data.attendance_summaries.length === 0 && (
                <p className="text-sm text-gray-400">No attendance data available yet.</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Notices */}
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4" /> Recent Notices
            </h3>
            {data.recent_notices.length === 0 ? (
              <p className="text-sm text-gray-400">No notices.</p>
            ) : (
              <div className="space-y-3">
                {data.recent_notices.map((n: any) => (
                  <div key={n.id} className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-sm font-semibold text-blue-900">{n.title}</p>
                    <p className="text-xs text-blue-700 mt-0.5 line-clamp-2">{n.content}</p>
                    <p className="text-xs text-blue-400 mt-1">{format(new Date(n.created_at), 'dd MMM yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
