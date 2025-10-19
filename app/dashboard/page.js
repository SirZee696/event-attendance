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
              {profile.is_admin && (
                <Link href="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100">
                  Admin Dashboard
                </Link>
              )}
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
        .select('username, first_name, last_name, user_role, agency, address, sex, photo_consent, social_media_consent, signature_url, is_admin, can_create_events, year, section')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      if (error && error.code !== 'PGRST116') { // PGRST116: row not found
        console.error('Error fetching profile:', error);
      } else if (
        !profileData || !profileData.username || !profileData.first_name || !profileData.last_name || 
        !profileData.user_role || !profileData.address || !profileData.sex || 
        profileData.photo_consent === null || profileData.social_media_consent === null || 
        !profileData.signature_url || (profileData.user_role !== 'guest' && !profileData.agency) ||
        (profileData.user_role === 'student' && (!profileData.year || !profileData.section))
      ) {
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
        <div className="flex items-center gap-2 mt-2">
          <p className="text-lg text-gray-600">
            Welcome back, {profile?.username || user.email}!
          </p>
          {profile.is_admin && (
            <span className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
              Admin
            </span>
          )}
          {profile.can_create_events && !profile.is_admin && (
            <span className="px-2.5 py-1 text-xs font-semibold text-white bg-green-600 rounded-full">
              Event Creator
            </span>
          )}
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Here is what your attendance detail looks like
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sex</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consent for Picture</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consent for Social Media</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.last_name}, {profile.first_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{profile.user_role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.agency}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{profile.sex}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.photo_consent ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.social_media_consent ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img 
                      src={profile.signature_url} 
                      alt="User signature" 
                      className="h-12 border border-gray-300 rounded-md bg-white" 
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
        </div>
      </main>
    </div>
  )
}