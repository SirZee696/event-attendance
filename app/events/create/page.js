'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateEvent() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState(null)
  const [targetRoles, setTargetRoles] = useState([])
  const [targetUnits, setTargetUnits] = useState([])
  const [targetYearLevels, setTargetYearLevels] = useState([])
  const [targetSections, setTargetSections] = useState([])
  const [syncedTime, setSyncedTime] = useState(null)
  const router = useRouter()

  useEffect(() => {
    let timer;
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('can_create_events')
        .eq('id', user.id)
        .single()

      if (error || !profile?.can_create_events) {
        setMessage({ text: 'You do not have permission to create events. Redirecting...', type: 'error' })
        setTimeout(() => router.push('/dashboard'), 3000)
      } else {
        setLoading(false)
      }

      // Fetch server time to sync a local clock
      try {
        const { data: now, error: timeError } = await supabase.rpc('now')
        if (timeError) throw timeError

        const serverTime = new Date(now)
        const offset = serverTime.getTime() - new Date().getTime()

        timer = setInterval(() => {
          setSyncedTime(new Date(new Date().getTime() + offset))
        }, 1000)
      } catch (error) {
        console.error('Could not sync with server time, using client time as fallback.', error)
        // Fallback to client time if server time is unavailable
        timer = setInterval(() => setSyncedTime(new Date()), 1000)
      }
    }
    checkPermission()

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [router])

  async function handleCreateEvent(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const startISO = startTime ? new Date(`${eventDate}T${startTime}`).toISOString() : null
    const endISO = endTime ? new Date(`${eventDate}T${endTime}`).toISOString() : null

    const { error } = await supabase.from('events').insert({
      title,
      description,
      start_time: startISO,
      end_time: endISO,
      location,
      target_roles: targetRoles.length > 0 ? targetRoles : null,
      target_units: targetUnits.length > 0 ? targetUnits : null,
      target_year_levels: targetYearLevels.length > 0 ? targetYearLevels : null,
      target_sections: targetSections.length > 0 ? targetSections : null,
      created_by: user.id,
    })

    if (error) {
      setMessage({ text: `Error creating event: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Event created successfully! Redirecting...', type: 'success' })
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  const handleCheckboxChange = (setter, value) => {
    setter((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  const roles = ['student', 'faculty', 'staff', 'guest'];
  const units = ['CA', 'CAS', 'CCHAMS', 'CCS', 'CE', 'CF', 'CGS', 'CM'];
  const yearLevels = ['1', '2', '3', '4'];
  const sections = ['Irregular', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

  if (loading && !message) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Create New Event</h1>
        {message && (
          <p className={`text-center ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
        {!message?.text.includes('permission') && (
          <form className="space-y-4" onSubmit={handleCreateEvent}>
            <div>
              <label htmlFor="title" className="text-sm font-medium text-gray-700">Event Title</label>
              <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="eventDate" className="text-sm font-medium text-gray-700">Date</label>
              <input id="eventDate" type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <div className="flex justify-between items-baseline">
                <label htmlFor="startTime" className="text-sm font-medium text-gray-700">Starting Time</label>
                {syncedTime && (
                  <span className="text-xs text-gray-500">Server Time: {syncedTime.toLocaleTimeString()}</span>
                )}
              </div>
              <input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="endTime" className="text-sm font-medium text-gray-700">Closing Time</label>
              <input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="location" className="text-sm font-medium text-gray-700">Location</label>
              <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="space-y-4 border-t pt-4 mt-4">
              <h2 className="text-lg font-semibold text-gray-800">Target Audience</h2>
              <p className="text-sm text-gray-500 -mt-2">Leave all checkboxes unchecked to make the event visible to everyone.</p>
              <div className="space-y-2">
                <label htmlFor="targetRole" className="text-sm font-medium text-gray-700">Target Role</label>
                <div className="flex flex-wrap gap-y-2">
                  {roles.map(role => (
                    <label key={role} className="flex items-center space-x-2 mr-1 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer">
                      <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => handleCheckboxChange(setTargetRoles, role)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm capitalize text-gray-700">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              {targetRoles.some(role => ['student', 'faculty', 'staff'].includes(role)) && (
                <div className="space-y-2">
                  <label htmlFor="targetUnit" className="text-sm font-medium text-gray-700">Target Unit</label>
                  <div className="flex flex-wrap gap-y-2">
                  {units.map(unit => (
                      <label key={unit} className="flex items-center space-x-2 mr-1 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" checked={targetUnits.includes(unit)} onChange={() => handleCheckboxChange(setTargetUnits, unit)} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">{unit}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetRoles.includes('student') && (
                <div className="space-y-2">
                  <label htmlFor="targetYearLevel" className="text-sm font-medium text-gray-700">Target Year Level</label>
                  <div className="flex flex-wrap gap-y-2">
                    {yearLevels.map(year => (
                     <label key={year} className="flex items-center space-x-2 mr-1 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" checked={targetYearLevels.includes(year)} onChange={() => handleCheckboxChange(setTargetYearLevels, year)} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">{year}{year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetRoles.includes('student') && (
                <div className="space-y-2">
                  <label htmlFor="targetSection" className="text-sm font-medium text-gray-700">Target Section</label>
                  <div className="flex flex-wrap gap-y-2">
                    {sections.map(section => (
                     <label key={section} className="flex items-center space-x-2 mr-1 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" checked={targetSections.includes(section)} onChange={() => handleCheckboxChange(setTargetSections, section)} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">{section}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="pt-4 space-y-2">
              <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
              <Link href="/dashboard" className="block w-full px-4 py-2 text-center text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}