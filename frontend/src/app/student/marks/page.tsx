'use client'

import { useEffect, useState } from 'react'
import { studentApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

const MARK_ORDER = ['CIE1', 'CIE2', 'CIE3', 'CIE4', 'CIE5', 'SEE']

export default function StudentMarks() {
  const [marks, setMarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.marks()
      .then(({ data }) => setMarks(data))
      .catch(() => toast.error('Failed to load marks'))
      .finally(() => setLoading(false))
  }, [])

  // Group by course
  const byCourse: Record<number, any[]> = {}
  for (const m of marks) {
    if (!byCourse[m.course_id]) byCourse[m.course_id] = []
    byCourse[m.course_id].push(m)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="My Marks" subtitle="CIE and SEE scores for all enrolled courses" />
      {Object.keys(byCourse).length === 0 ? (
        <Card><div className="p-12 text-center text-gray-400">No marks entered yet.</div></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCourse).map(([courseId, courseMarks]) => {
            const sorted = MARK_ORDER.map(t => courseMarks.find(m => m.mark_type === t)).filter(Boolean)
            const cie = sorted.filter(m => m!.mark_type !== 'SEE')
            const see = sorted.find(m => m!.mark_type === 'SEE')
            const ciePcts = cie.map(m => (m!.marks_scored / m!.total_marks) * 100)
            const top3avg = ciePcts.sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / Math.max(ciePcts.slice(0, 3).length, 1)

            return (
              <Card key={courseId}>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">Course #{courseId}</h3>
                      <p className="text-xs text-gray-400">CIE avg (best 3): {top3avg.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {MARK_ORDER.map(type => {
                      const m = courseMarks.find(x => x.mark_type === type)
                      if (!m) return (
                        <div key={type} className="text-center p-3 bg-gray-50 rounded-xl opacity-40">
                          <p className="text-xs text-gray-400 font-medium">{type}</p>
                          <p className="text-sm text-gray-300 mt-1">N/A</p>
                        </div>
                      )
                      const pct = Math.round((m.marks_scored / m.total_marks) * 100)
                      return (
                        <div key={type} className="text-center p-3 bg-blue-50 rounded-xl">
                          <p className="text-xs text-blue-500 font-semibold">{type}</p>
                          <p className="text-lg font-bold text-gray-800 mt-0.5">{m.marks_scored}</p>
                          <p className="text-xs text-gray-400">/ {m.total_marks}</p>
                          <p className="text-xs font-medium text-blue-600 mt-1">{pct}%</p>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
