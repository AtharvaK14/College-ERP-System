'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, School, ClipboardList,
  Calendar, FileText, Bell, MessageSquare, LogOut,
  Layers, UserCheck, GraduationCap, Award, TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth-context'

const navConfig = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/departments', label: 'Departments', icon: School },
    { href: '/admin/classes', label: 'Classes', icon: Layers },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/students', label: 'Students', icon: GraduationCap },
    { href: '/admin/assignments', label: 'Assignments', icon: UserCheck },
    { href: '/admin/leaves', label: 'Leave Requests', icon: Calendar },
    { href: '/admin/notices', label: 'Notices', icon: Bell },
  ],
  teacher: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/attendance', label: 'Attendance', icon: ClipboardList },
    { href: '/teacher/marks', label: 'Marks Entry', icon: FileText },
    { href: '/teacher/leaves', label: 'My Leaves', icon: Calendar },
    { href: '/teacher/complaints', label: 'Complaints', icon: MessageSquare },
  ],
  student: [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/attendance', label: 'Attendance', icon: ClipboardList },
    { href: '/student/marks', label: 'My Marks', icon: TrendingUp },
    { href: '/student/report-card', label: 'Report Card', icon: Award },
    { href: '/student/notices', label: 'Notices', icon: Bell },
    { href: '/student/complaints', label: 'Complaints', icon: MessageSquare },
    { href: '/student/messages', label: 'Messages', icon: MessageSquare },
    { href: '/student/forum', label: 'Forum', icon: Users },
  ],
}

const roleColors: Record<string, string> = {
  admin: 'from-indigo-900 to-indigo-700',
  teacher: 'from-emerald-900 to-emerald-700',
  student: 'from-blue-900 to-blue-700',
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Faculty',
  student: 'Student',
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  if (!user) return null

  const role = user.role
  const nav = navConfig[role] || []
  const gradient = roleColors[role] || 'from-gray-900 to-gray-700'

  return (
    <aside className={`w-64 min-h-screen bg-gradient-to-b ${gradient} flex flex-col text-white`}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold">College ERP</h2>
        <p className="text-xs text-white/60 mt-0.5">{roleLabels[role]} Portal</p>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-sm font-medium truncate">{user.username}</p>
        <p className="text-xs text-white/50 truncate">{user.email}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== `/${role}` && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
