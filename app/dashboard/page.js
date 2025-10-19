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
  const [events, setEvents] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState('upcoming')
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

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (eventsError) console.error('Error fetching events:', eventsError);
      else setEvents(eventsData);
    }

    checkUserSession();

    // Set up a timer to update the current time every second for the countdown
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Clean up the timer when the component unmounts
    return () => clearInterval(timer)
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

  const getEventStatus = (event) => {
    if (!event.event_date || !event.start_time || !event.end_time) {
      return { status: 'Info Missing', timeLeft: null, color: 'text-gray-500' };
    }

    const eventStart = new Date(`${event.event_date}T${event.start_time}`);
    const eventEnd = new Date(`${event.event_date}T${event.end_time}`);

    if (currentTime < eventStart) {
      return { status: 'Upcoming', timeLeft: null, color: 'text-blue-500' };
    }

    if (currentTime >= eventStart && currentTime <= eventEnd) {
      const diff = eventEnd.getTime() - currentTime.getTime();
      if (diff <= 0) {
        return { status: 'Finished', timeLeft: null, color: 'text-red-500' };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
      
      return { 
        status: 'Ongoing', 
        timeLeft: `${hours}:${minutes}:${seconds} left`, 
        color: 'text-green-600 animate-pulse' 
      };
    }

    return { status: 'Finished', timeLeft: null, color: 'text-red-500' };
  };

  const upcomingEvents = events.filter(
    (event) => getEventStatus(event).status !== 'Finished'
  );
  const finishedEvents = events.filter(
    (event) => getEventStatus(event).status === 'Finished'
  ).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const eventsToDisplay = activeTab === 'upcoming' ? upcomingEvents : finishedEvents;

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

        <div className="mt-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <nav className="flex space-x-2 bg-gray-100 p-1 rounded-lg" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                    activeTab === 'upcoming'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Upcoming Events
                </button>
                <button
                  onClick={() => setActiveTab('finished')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                    activeTab === 'finished'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Finished Events
                </button>
              </nav>
            </div>
            {profile.can_create_events && (
              <Link href="/events/create" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                Create Event
              </Link>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {eventsToDisplay.length > 0 ? (
                    eventsToDisplay.map(event => {
                      const { status, timeLeft, color } = getEventStatus(event);
                      return (
                        <tr key={event.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.start_time}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.end_time}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.location}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${color}`}>
                            {status} {timeLeft && <span className="font-normal text-gray-500">({timeLeft})</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {user.id === event.created_by && (
                              <Link href={`/events/edit/${event.id}`} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                Edit
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No events found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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