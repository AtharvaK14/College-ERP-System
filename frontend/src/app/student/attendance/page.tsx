'use client'

import { useEffect, useState } from 'react'
import { studentApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader, Badge } from '@/components/ui'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StudentAttendance() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [detail, setDetail] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [currentMonth] = useState(new Date())

  useEffect(() => {
    studentApi.attendance()
      .then(({ data }) => setSummaries(data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const loadDetail = async (course: any) => {
    setSelectedCourse(course)
    setLoadingDetail(true)
    try {
      const { data } = await studentApi.attendanceDetail(course.course_id)
      setDetail(data)
    } catch { toast.error('Failed to load detail') }
    finally { setLoadingDetail(false) }
  }

  // Build calendar
  const calendarDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOffset = getDay(calendarDays[0]) // 0=Sun
  const attendanceMap = Object.fromEntries(detail.map(d => [d.date, d.status]))

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Click a course to see day-by-day breakdown" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {summaries.map(s => (
          <Card
            key={s.course_id}
            className={clsx('p-5 cursor-pointer transition-all hover:shadow-md', selectedCourse?.course_id === s.course_id && 'ring-2 ring-primary-500')}
            onClick={() => loadDetail(s)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800">{s.course_shortname}</p>
                <p className="text-xs text-gray-400">{s.course_name}</p>
              </div>
              <Badge
                label={`${s.percentage}%`}
                color={s.below_threshold ? 'red' : 'green'}
              />
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={clsx('h-full rounded-full', s.below_threshold ? 'bg-red-500' : 'bg-green-500')}
                style={{ width: `${Math.min(s.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{s.attended} attended / {s.total} total</p>
            {s.below_threshold && (
              <p className="text-xs text-red-500 mt-1 font-medium">Below 75% threshold</p>
            )}
          </Card>
        ))}
      </div>

      {selectedCourse && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-800 mb-4">
              {selectedCourse.course_name} — {format(currentMonth, 'MMMM yyyy')}
            </h3>
            {loadingDetail ? <Spinner size="sm" /> : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                  ))}
                </div>
                {/* Calendar */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`pad-${i}`} />)}
                  {calendarDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const status = attendanceMap[dateStr]
                    return (
                      <div
                        key={dateStr}
                        className={clsx(
                          'aspect-square flex items-center justify-center text-xs rounded-lg font-medium',
                          status === 'present' && 'bg-green-100 text-green-700',
                          status === 'absent' && 'bg-red-100 text-red-700',
                          !status && 'text-gray-300',
                        )}
                        title={status ? `${dateStr}: ${status}` : dateStr}
                      >
                        {format(day, 'd')}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block" />Present</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block" />Absent</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block" />No class</span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
