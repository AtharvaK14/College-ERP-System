'use client'

import { useEffect, useState } from 'react'
import { Users, BookOpen, School, GraduationCap, Calendar } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader } from '@/components/ui'
import toast from 'react-hot-toast'

interface Stats {
  total_students: number
  total_teachers: number
  total_departments: number
  total_courses: number
  pending_leaves: number
}

const statCards = [
  { key: 'total_students', label: 'Students', icon: GraduationCap, color: 'blue' },
  { key: 'total_teachers', label: 'Teachers', icon: Users, color: 'emerald' },
  { key: 'total_departments', label: 'Departments', icon: School, color: 'violet' },
  { key: 'total_courses', label: 'Courses', icon: BookOpen, color: 'orange' },
  { key: 'pending_leaves', label: 'Pending Leaves', icon: Calendar, color: 'red' },
] as const

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.stats()
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Overview of the college ERP system" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colorMap[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.[key] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Student', href: '/admin/students' },
                { label: 'Add Teacher', href: '/admin/teachers' },
                { label: 'Manage Leaves', href: '/admin/leaves' },
                { label: 'Post Notice', href: '/admin/notices' },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="px-4 py-3 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors text-center"
                >
                  {label}
                </a>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-3">System Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Attendance threshold</dt>
                <dd className="font-medium">75%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">CIE exams per course</dt>
                <dd className="font-medium">5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">SEE exams per course</dt>
                <dd className="font-medium">1</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">API documentation</dt>
                <dd>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/docs`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    /docs
                  </a>
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
