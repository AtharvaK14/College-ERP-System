'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { studentApi } from '@/lib/api'
import { Card, CardBody, Spinner, PageHeader } from '@/components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function StudentForum() {
  const [posts, setPosts] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const load = () => {
    studentApi.forum()
      .then(({ data }) => setPosts(data))
      .catch(() => toast.error('Failed to load forum'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      await studentApi.postForum(content)
      setContent(''); load()
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Student Forum" subtitle="Discuss with your fellow students" />

      <Card className="mb-6">
        <CardBody>
          <form onSubmit={handlePost} className="flex gap-3">
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share something with your classmates..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <Card><div className="p-8 text-center text-gray-400">No posts yet. Be the first!</div></Card>
        ) : (
          posts.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">
                    {p.sender?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{p.sender?.username}</span>
                    <span className="text-xs text-gray-400">{format(new Date(p.sent_at), 'dd MMM, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{p.content}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
