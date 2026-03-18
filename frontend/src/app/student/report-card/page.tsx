'use client'

import { useEffect, useState } from 'react'
import { studentApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader, Badge } from '@/components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const gradeLabel = (gp: number) => {
  if (gp >= 10) return { grade: 'O', color: 'green' }
  if (gp >= 9) return { grade: 'A+', color: 'green' }
  if (gp >= 8) return { grade: 'A', color: 'blue' }
  if (gp >= 7) return { grade: 'B+', color: 'blue' }
  if (gp >= 6) return { grade: 'B', color: 'blue' }
  if (gp >= 5) return { grade: 'C', color: 'yellow' }
  return { grade: 'F', color: 'red' }
}

export default function StudentReportCard() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.reportCard()
      .then(({ data }) => setReport(data))
      .catch(() => toast.error('Failed to load report card'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!report) return null

  const { grade: cgpaGrade, color: cgpaColor } = gradeLabel(report.cgpa)

  return (
    <div>
      <PageHeader title="Report Card" subtitle={`${report.student.name} · ${report.student.usn}`} />

      {/* CGPA banner */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white flex items-center justify-between">
        <div>
          <p className="text-blue-200 text-sm font-medium">Cumulative Grade Point Average</p>
          <p className="text-5xl font-bold mt-1">{report.cgpa}</p>
          <p className="text-blue-200 text-sm mt-1">Out of 10.0</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-3xl font-bold">{cgpaGrade}</span>
          </div>
          <p className="text-xs text-blue-200 mt-1">Overall Grade</p>
        </div>
      </div>

      {/* Per-course breakdown */}
      <div className="space-y-4">
        {report.courses.map((c: any) => {
          const { grade, color } = gradeLabel(c.grade_point)
          return (
            <Card key={c.course.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.course.name}</h3>
                    <p className="text-xs text-gray-400">{c.course.shortname} · {c.course.credits} Credits</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Final</p>
                      <p className="text-xl font-bold text-gray-800">{c.final_pct}%</p>
                    </div>
                    <Badge label={grade} color={color as any} />
                    <div className="text-right">
                      <p className="text-xs text-gray-400">GP</p>
                      <p className="font-bold text-gray-800">{c.grade_point}</p>
                    </div>
                  </div>
                </div>

                {/* Marks breakdown */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                  {c.marks.map((m: any) => (
                    <div key={m.mark_type} className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 font-medium">{m.mark_type}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{m.marks_scored}/{m.total_marks}</p>
                    </div>
                  ))}
                </div>

                {/* Attendance bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Attendance: {c.attendance.attended}/{c.attendance.total}</span>
                    <span className={clsx('font-medium', c.attendance.percentage < 75 ? 'text-red-600' : 'text-green-600')}>
                      {c.attendance.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full', c.attendance.percentage < 75 ? 'bg-red-500' : 'bg-green-500')}
                      style={{ width: `${Math.min(c.attendance.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
