'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { Button, Card, Table, Td, Modal, Input, PageHeader, EmptyState, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminDepartments() {
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', code: '' })

  const load = () => {
    setLoading(true)
    adminApi.departments()
      .then(({ data }) => setDepts(data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setEditTarget(null); setForm({ name: '', code: '' }); setShowModal(true) }
  const openEdit = (d: any) => { setEditTarget(d); setForm({ name: d.name, code: d.code }); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editTarget) {
        await adminApi.updateDept(editTarget.id, form)
        toast.success('Department updated')
      } else {
        await adminApi.createDept(form)
        toast.success('Department created')
      }
      setShowModal(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete department "${name}"? This will affect all associated data.`)) return
    try { await adminApi.deleteDept(id); setDepts(depts.filter(d => d.id !== id)); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Departments" subtitle={`${depts.length} departments`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Department</Button>}
      />
      <Card>
        {depts.length === 0 ? <EmptyState message="No departments yet." /> : (
          <Table headers={['Code', 'Name', 'Actions']}>
            {depts.map(d => (
              <tr key={d.id}>
                <Td><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{d.code}</code></Td>
                <Td className="font-medium">{d.name}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(d.id, d.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Department Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Computer Science & Engineering" />
          <Input label="Code" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CSE" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editTarget ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
