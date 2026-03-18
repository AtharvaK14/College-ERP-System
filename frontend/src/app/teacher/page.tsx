'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Calendar, MessageSquare, Clock } from 'lucide-react'
import { teacherApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teacherApi.dashboard()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data) return null

  const stats = [
    { label: 'Courses Assigned', value: data.assigned_courses.length, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Leaves', value: data.pending_leaves, icon: Calendar, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Open Complaints', value: data.unresolved_complaints, icon: MessageSquare, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div>
      <PageHeader
        title={`Welcome, ${data.teacher.name}`}
        subtitle={`${data.teacher.department?.name || 'Faculty'} Department`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> My Courses &amp; Timetable
            </h3>
            {data.assigned_courses.length === 0 ? (
              <p className="text-sm text-gray-400">No courses assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {data.assigned_courses.map((tc: any) => (
                  <div key={tc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tc.course?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {tc.class_?.department?.code} · Sem {tc.class_?.semester} · Sec {tc.class_?.section}
                      </p>
                    </div>
                    {tc.day && (
                      <div className="text-right">
                        <Badge label={tc.day} color="blue" />
                        {tc.time_slot && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {tc.time_slot}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mark Attendance', href: '/teacher/attendance' },
                { label: 'Enter Marks', href: '/teacher/marks' },
                { label: 'Apply for Leave', href: '/teacher/leaves' },
                { label: 'View Complaints', href: '/teacher/complaints' },
              ].map(({ label, href }) => (
                <a key={href} href={href}
                  className="px-4 py-3 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors text-center">
                  {label}
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
