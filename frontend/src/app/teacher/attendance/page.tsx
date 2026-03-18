'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Save } from 'lucide-react'
import { teacherApi } from '@/lib/api'
import { Button, Card, CardBody, Select, PageHeader, Spinner, Badge } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function TeacherAttendance() {
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({})
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    teacherApi.myCourses()
      .then(({ data }) => setCourses(data))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false))
  }, [])

  // When course+class selected, load students and existing attendance
  useEffect(() => {
    if (!selectedCourse || !selectedClass) { setStudents([]); return }
    setLoadingStudents(true)
    const cId = Number(selectedCourse), clId = Number(selectedClass)
    Promise.all([
      teacherApi.students(cId, clId),
      teacherApi.getAttendance(cId, clId, date),
    ]).then(([sRes, aRes]) => {
      setStudents(sRes.data)
      // Pre-fill from existing records
      const existing: Record<number, 'present' | 'absent'> = {}
      for (const rec of aRes.data) existing[rec.student_id] = rec.status
      // Default to present for students without a record
      for (const s of sRes.data) if (!existing[s.id]) existing[s.id] = 'present'
      setAttendance(existing)
    }).catch(() => toast.error('Failed to load students'))
    .finally(() => setLoadingStudents(false))
  }, [selectedCourse, selectedClass, date])

  // Unique classes for selected course
  const classOptions = courses
    .filter(tc => String(tc.course_id) === selectedCourse)
    .map(tc => ({
      value: tc.class_id,
      label: `${tc.class_?.department?.code} Sem${tc.class_?.semester} Sec${tc.class_?.section}`,
    }))

  const courseOptions = Array.from(
    new Map(courses.map(tc => [tc.course_id, tc])).values()
  ).map(tc => ({ value: tc.course_id, label: tc.course?.name }))

  const toggle = (id: number) =>
    setAttendance(prev => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }))

  const markAll = (status: 'present' | 'absent') =>
    setAttendance(Object.fromEntries(students.map(s => [s.id, status])))

  const handleSave = async () => {
    if (!selectedCourse || !selectedClass) return
    setSaving(true)
    try {
      await teacherApi.markAttendance({
        course_id: Number(selectedCourse),
        date,
        records: students.map(s => ({ student_id: s.id, status: attendance[s.id] || 'absent' })),
      })
      toast.success('Attendance saved successfully')
    } catch { toast.error('Failed to save attendance') }
    finally { setSaving(false) }
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Mark Attendance" subtitle="Select course, class, and date to get started" />

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Course"
              value={selectedCourse}
              onChange={e => { setSelectedCourse(e.target.value); setSelectedClass('') }}
              options={courseOptions}
            />
            <Select
              label="Class"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              options={classOptions}
              disabled={!selectedCourse}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {loadingStudents && <Spinner />}

      {students.length > 0 && !loadingStudents && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-800">
                  {students.length} Students
                </h3>
                <Badge label={`${presentCount} Present`} color="green" />
                <Badge label={`${students.length - presentCount} Absent`} color="red" />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => markAll('present')}>All Present</Button>
                <Button variant="secondary" size="sm" onClick={() => markAll('absent')}>All Absent</Button>
                <Button size="sm" loading={saving} onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1.5" /> Save
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {students.map((s, idx) => {
                const isPresent = attendance[s.id] === 'present'
                return (
                  <div
                    key={s.id}
                    className={clsx(
                      'flex items-center justify-between py-3 px-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors',
                    )}
                    onClick={() => toggle(s.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-6 text-right">{idx + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.usn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPresent ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                      <span className={clsx('text-sm font-medium w-14 text-right', isPresent ? 'text-green-600' : 'text-red-500')}>
                        {isPresent ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button loading={saving} onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Save Attendance
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {!selectedCourse || !selectedClass ? (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-8">Select a course and class above to mark attendance.</p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
