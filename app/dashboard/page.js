// app/dashboard/page.js
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="w-full bg-white shadow-md p-4 flex justify-between items-center">
      <Link href="/dashboard" className="text-xl font-bold text-gray-900">
        Event Attendance
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-gray-600 hidden sm:block">{user.email}</span>
        <button
          onClick={onLogout}
          className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
         router.push('/login');
      }
    })

    // Check initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
      else setUser(user);
    });

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">Welcome back, {user.email}!</p>
      </main>
    </div>
  )
}