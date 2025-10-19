'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function UserRow({ profile, onUpdate }) {
  const [canCreate, setCanCreate] = useState(profile.can_create_events)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: 'idle' })

  const handleToggle = async (e) => {
    setLoading(true)
    setMessage({ text: 'Updating...', type: 'idle' })
    const newStatus = e.target.checked

    const { error } = await supabase
      .from('profiles')
      .update({ can_create_events: newStatus })
      .eq('id', profile.id)

    if (error) {
      console.error('Error updating user permission:', error)
      setMessage({ text: 'Error!', type: 'error' })
      // Revert UI on error
      setCanCreate(!newStatus)
    } else {
      setMessage({ text: 'Saved!', type: 'success' })
      setCanCreate(newStatus)
      onUpdate(profile.id, newStatus)
    }
    setLoading(false)
    setTimeout(() => setMessage({ text: '', type: 'idle' }), 2000)
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{profile.last_name}, {profile.first_name}</td>
      <td className="px-6 py-4 text-sm text-gray-500">{profile.username}</td>
      <td className="px-6 py-4 text-sm text-gray-500 capitalize">{profile.user_role}</td>
      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <input
            type="checkbox"
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={canCreate}
            onChange={handleToggle}
            disabled={loading}
            id={`user-${profile.id}`}
          />
          <label htmlFor={`user-${profile.id}`} className={`text-sm ${
            message.type === 'success' ? 'text-green-600' : 
            message.type === 'error' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {message.text}
          </label>
        </div>
      </td>
    </tr>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState([])
  const router = useRouter()

  useEffect(() => {
    async function checkAdminAndFetchProfiles() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if the current user is an admin
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (adminError || !adminProfile?.is_admin) {
        // If not an admin, redirect to the main dashboard
        router.push('/dashboard')
        return
      }

      // If admin, fetch all user profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, user_role, can_create_events')
        .order('last_name', { ascending: true })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else {
        setProfiles(allProfiles)
      }
      setLoading(false)
    }

    checkAdminAndFetchProfiles()
  }, [router])

  const handleProfileUpdate = (id, newStatus) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, can_create_events: newStatus } : p))
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Manage Event Creators</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Can Create Events</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profiles.map(profile => <UserRow key={profile.id} profile={profile} onUpdate={handleProfileUpdate} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}