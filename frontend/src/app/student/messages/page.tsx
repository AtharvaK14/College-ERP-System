'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { studentApi, sharedApi } from '@/lib/api'
import { Card, CardBody, Select, PageHeader, Spinner } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StudentMessages() {
  const [messages, setMessages] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [receiverId, setReceiverId] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const load = async () => {
    try {
      const [m, t] = await Promise.all([studentApi.messages(), sharedApi.teachers()])
      setMessages(m.data); setTeachers(t.data)
    } catch { toast.error('Failed to load messages') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !receiverId) return
    setSending(true)
    try {
      await studentApi.sendMessage({ receiver_id: Number(receiverId), content, is_forum: false })
      setContent(''); load()
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Direct Messages" subtitle="Send messages to your teachers" />

      <Card className="mb-6">
        <CardBody>
          <h3 className="font-semibold text-gray-800 mb-3">New Message</h3>
          <form onSubmit={handleSend} className="space-y-3">
            <Select
              label="To (Teacher)"
              value={receiverId}
              onChange={e => setReceiverId(e.target.value)}
              options={teachers.map(t => ({ value: t.user_id, label: t.name }))}
            />
            <div className="flex gap-3">
              <input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={sending || !content.trim() || !receiverId}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {messages.length === 0 ? (
          <Card><div className="p-8 text-center text-gray-400">No messages yet.</div></Card>
        ) : (
          messages.map(m => (
            <Card key={m.id} className="p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-600">
                    {m.sender?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{m.sender?.username}</span>
                    <span className="text-xs text-gray-400">{format(new Date(m.sent_at), 'dd MMM, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{m.content}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
