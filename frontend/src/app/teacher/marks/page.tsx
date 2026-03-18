'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { teacherApi } from '@/lib/api'
import { Button, Card, CardBody, Select, PageHeader, Spinner, Input } from '@/components/ui'
import toast from 'react-hot-toast'

const MARK_TYPES = ['CIE1', 'CIE2', 'CIE3', 'CIE4', 'CIE5', 'SEE']
const DEFAULT_TOTALS: Record<string, number> = {
  CIE1: 50, CIE2: 50, CIE3: 50, CIE4: 50, CIE5: 50, SEE: 100,
}

export default function TeacherMarks() {
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [existingMarks, setExistingMarks] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [markType, setMarkType] = useState('CIE1')
  const [totalMarks, setTotalMarks] = useState(50)
  const [scores, setScores] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    teacherApi.myCourses()
      .then(({ data }) => setCourses(data))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse || !selectedClass) { setStudents([]); return }
    const cId = Number(selectedCourse), clId = Number(selectedClass)
    Promise.all([teacherApi.students(cId, clId), teacherApi.getMarks(cId, clId)])
      .then(([sRes, mRes]) => {
        setStudents(sRes.data)
        setExistingMarks(mRes.data)
      }).catch(() => toast.error('Failed to load'))
  }, [selectedCourse, selectedClass])

  // Pre-fill scores when markType changes
  useEffect(() => {
    const newScores: Record<number, string> = {}
    for (const s of students) {
      const existing = existingMarks.find(m => m.student_id === s.id && m.mark_type === markType)
      newScores[s.id] = existing ? String(existing.marks_scored) : ''
    }
    setScores(newScores)
    setTotalMarks(DEFAULT_TOTALS[markType] || 50)
  }, [markType, students, existingMarks])

  const courseOptions = Array.from(new Map(courses.map(tc => [tc.course_id, tc])).values())
    .map(tc => ({ value: tc.course_id, label: tc.course?.name }))

  const classOptions = courses
    .filter(tc => String(tc.course_id) === selectedCourse)
    .map(tc => ({
      value: tc.class_id,
      label: `${tc.class_?.department?.code} Sem${tc.class_?.semester} Sec${tc.class_?.section}`,
    }))

  const handleSave = async () => {
    const records = students.map(s => ({
      student_id: s.id,
      marks_scored: Number(scores[s.id] || 0),
    }))
    // Validate
    for (const r of records) {
      if (r.marks_scored > totalMarks) {
        toast.error(`Score cannot exceed ${totalMarks}`)
        return
      }
    }
    setSaving(true)
    try {
      await teacherApi.enterMarks({
        course_id: Number(selectedCourse),
        mark_type: markType,
        total_marks: totalMarks,
        records,
      })
      toast.success('Marks saved successfully')
    } catch { toast.error('Failed to save marks') }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Marks Entry" subtitle="Enter or update exam marks for your students" />

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Select label="Course" value={selectedCourse}
              onChange={e => { setSelectedCourse(e.target.value); setSelectedClass('') }}
              options={courseOptions} />
            <Select label="Class" value={selectedClass} disabled={!selectedCourse}
              onChange={e => setSelectedClass(e.target.value)}
              options={classOptions} />
            <Select label="Exam Type" value={markType}
              onChange={e => setMarkType(e.target.value)}
              options={MARK_TYPES.map(t => ({ value: t, label: t }))} />
            <Input label={`Total Marks (max)`} type="number" value={totalMarks}
              onChange={e => setTotalMarks(Number(e.target.value))} min={1} max={200} />
          </div>
        </CardBody>
      </Card>

      {students.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                {markType} — Out of {totalMarks}
              </h3>
              <Button loading={saving} onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Save Marks
              </Button>
            </div>

            <div className="space-y-2">
              {students.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-4 py-2 px-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.usn}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={totalMarks}
                      value={scores[s.id] ?? ''}
                      onChange={e => setScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-400">/ {totalMarks}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button loading={saving} onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Save Marks
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {(!selectedCourse || !selectedClass) && (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-8">Select a course and class above to enter marks.</p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
