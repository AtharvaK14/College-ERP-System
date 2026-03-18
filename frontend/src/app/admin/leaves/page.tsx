'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Button, Card, Table, Td, PageHeader, EmptyState, Spinner, Badge } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const statusColor = (s: string) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.leaves()
      .then(({ data }) => setLeaves(data))
      .catch(() => toast.error('Failed to load leaves'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const updateStatus = async (id: number, status: string) => {
    setProcessing(id)
    try {
      await adminApi.updateLeave(id, status)
      toast.success(`Leave ${status}`)
      load()
    } catch { toast.error('Failed to update') }
    finally { setProcessing(null) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle={`${leaves.filter(l => l.status === 'pending').length} pending`} />
      <Card>
        {leaves.length === 0 ? <EmptyState message="No leave requests." /> : (
          <Table headers={['Teacher', 'Type', 'From', 'To', 'Reason', 'Status', 'Actions']}>
            {leaves.map(l => (
              <tr key={l.id}>
                <Td className="font-medium">{l.teacher?.name}</Td>
                <Td><Badge label={l.leave_type} color="blue" /></Td>
                <Td>{format(new Date(l.from_date), 'dd MMM yyyy')}</Td>
                <Td>{format(new Date(l.to_date), 'dd MMM yyyy')}</Td>
                <Td className="max-w-xs truncate">{l.reason || '-'}</Td>
                <Td><Badge label={l.status} color={statusColor(l.status) as any} /></Td>
                <Td>
                  {l.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" loading={processing === l.id} onClick={() => updateStatus(l.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="danger" loading={processing === l.id} onClick={() => updateStatus(l.id, 'rejected')}>Reject</Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
