'use client'
import { ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/layout/Sidebar'
import { Spinner } from '@/components/ui'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }

    // Enforce role-based routing -- prevent a student from visiting /admin, etc.
    const segment = pathname.split('/')[1]  // 'admin' | 'teacher' | 'student'
    const allowedSegment = user.role        // 'admin' | 'teacher' | 'student'
    if (segment && segment !== allowedSegment) {
      router.replace(`/${allowedSegment}`)
    }
  }, [user, loading, pathname, router])

  if (loading) return <Spinner size="lg" />
  if (!user) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
