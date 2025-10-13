// app/dashboard/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const Navbar = ({ user, profile, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className="w-full bg-white shadow-md p-4 flex justify-between items-center">
      <Link href="/dashboard" className="text-xl font-bold text-gray-900">
        Event Attendance
      </Link>
      <div className="flex items-center gap-4">
        {profile && (
          <span className="text-gray-700 font-medium hidden sm:block">
            {profile.first_name} {profile.last_name}
          </span>
        )}
        <div className="relative" ref={triggerRef}>
          <button
            ref={triggerRef}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                <p className="font-semibold">Signed in as</p>
                <p className="truncate">{user.email}</p>
              </div>
              <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Account Settings
              </Link>
              <button
                onClick={() => {
                  onLogout()
                  setDropdownOpen(false)
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function checkUserSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check if the user's profile is complete
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, user_role')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      if (error && error.code !== 'PGRST116') { // PGRST116: row not found
        console.error('Error fetching profile:', error);
      } else if (!profileData || !profileData.first_name || !profileData.last_name || !profileData.user_role) {
        // If profile is incomplete, redirect to the account page
        router.push('/account');
      }
    }

    checkUserSession();
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} onLogout={handleLogout} />
      <main className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">
          Welcome back, {profile?.first_name || user.email}!
        </p>
      </main>
    </div>
  )
}