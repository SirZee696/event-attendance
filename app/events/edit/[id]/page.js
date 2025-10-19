'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditEvent({ params }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState(null)
  const router = useRouter()
  const { id: eventId } = use(params)

  const fetchEvent = useCallback(async (user) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error || !data) {
      setMessage({ text: 'Event not found or you do not have permission to edit it.', type: 'error' })
      setTimeout(() => router.push('/dashboard'), 3000)
      return
    }

    if (data.created_by !== user.id) {
      setMessage({ text: 'You do not have permission to edit this event.', type: 'error' })
      setTimeout(() => router.push('/dashboard'), 3000)
      return
    }

    setEvent(data)
    setTitle(data.title)
    setDescription(data.description || '')
    setEventDate(data.event_date)
    setStartTime(data.start_time || '')
    setEndTime(data.end_time || '')
    setLocation(data.location || '')
    setLoading(false)
  }, [eventId, router])

  useEffect(() => {
    async function checkUserAndFetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await fetchEvent(user)
    }
    checkUserAndFetch()
  }, [router, fetchEvent])

  async function handleUpdateEvent(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase
      .from('events')
      .update({
        title,
        description,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location,
      })
      .eq('id', eventId)

    if (error) {
      setMessage({ text: `Error updating event: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Event updated successfully! Redirecting...', type: 'success' })
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  if (loading && !message) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Edit Event</h1>
        {message && (
          <p className={`text-center ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
        {event && (
          <form className="space-y-4" onSubmit={handleUpdateEvent}>
            <div>
              <label htmlFor="title" className="text-sm font-medium text-gray-700">Event Title</label>
              <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventDate" className="text-sm font-medium text-gray-700">Date</label>
                <input id="eventDate" type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="startTime" className="text-sm font-medium text-gray-700">Starting Time</label>
                <input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="endTime" className="text-sm font-medium text-gray-700">Closing Time</label>
                <input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label htmlFor="location" className="text-sm font-medium text-gray-700">Location</label>
              <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="pt-4 space-y-2">
              <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                {loading ? 'Updating...' : 'Update Event'}
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