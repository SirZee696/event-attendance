'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SignatureCanvas from 'react-signature-canvas'

export default function Account() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [firstName, setFirstName] = useState(null)
  const [lastName, setLastName] = useState(null)
  const [agency, setAgency] = useState(null)
  const [address, setAddress] = useState(null)
  const [sex, setSex] = useState(null)
  const [year, setYear] = useState(null)
  const [section, setSection] = useState(null)
  const [position, setPosition] = useState(null)
  const [unit, setUnit] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [photoConsent, setPhotoConsent] = useState(false)
  const [socialMediaConsent, setSocialMediaConsent] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState(null)
  const [message, setMessage] = useState(null)
  const router = useRouter()
  const sigPad = useRef(null)

  useEffect(() => {
    async function getProfile() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`username, first_name, last_name, user_role, agency, avatar_url, address, sex, photo_consent, social_media_consent, signature_url, year, section, position, unit`)
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }

      const isStudent = user.email.endsWith('@student.dmmmsu.edu.ph')
      const isEmployee = user.email.endsWith('@dmmmsu.edu.ph')

      if (isStudent) {
        setUserRole('student')
      } else if (isEmployee) {
        // For employees, the role is set from the database below.
      } else {
        // If not a student or employee, they are a guest.
        setUserRole('guest')
        setAgency('GUEST')
      }

      if (data) {
        setUsername(data.username)
        // Only load role from DB for employees, as student/guest roles are auto-determined
        if (isEmployee) {
          setUserRole(data.user_role)
        }
        setFirstName(data.first_name)
        setLastName(data.last_name)
        setAgency(data.agency)
        setAddress(data.address)
        setSex(data.sex)
        setPhotoConsent(data.photo_consent)
        setSocialMediaConsent(data.social_media_consent)
        setSignatureUrl(data.signature_url)
        setYear(data.year)
        setSection(data.section)
        setPosition(data.position)
        setUnit(data.unit)
        setAvatarUrl(data.avatar_url)
      }

      setUser(user)
      setLoading(false)
    }

    getProfile()
  }, [router])

  async function updateProfile(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Get signature data URL if the pad is not empty
    const newSignatureUrl = sigPad.current && !sigPad.current.isEmpty()
      ? sigPad.current.toDataURL('image/png')
      : signatureUrl; // Keep the old one if the pad is not touched

    const updates = {
      id: user.id,
      username,
      user_role: userRole,
      first_name: firstName,
      last_name: lastName,
      agency: agency,
      address: address,
      sex: sex,
      photo_consent: photoConsent,
      social_media_consent: socialMediaConsent,
      year: userRole === 'student' ? year : null,
      section: userRole === 'student' ? section : null,
      unit: (userRole === 'faculty' || userRole === 'staff' || userRole === 'student') ? unit : null,
      position: userRole === 'faculty' ? position : null,
      signature_url: newSignatureUrl,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    }

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      if (error.message.includes('profiles_username_key')) {
        setMessage({ text: 'This username is already taken. Please choose another one.', type: 'error' })
      } else {
        setMessage({ text: error.message, type: 'error' })
      }
      setLoading(false)
    } else {
      setMessage({ text: 'Profile updated successfully! Redirecting to dashboard...', type: 'success' })
      setSignatureUrl(newSignatureUrl); // Update local state to show new signature if saved
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000); // 2-second delay before redirecting
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Account Settings</h1>
        {message && (
          <p className={`text-center ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
        <form className="space-y-4" onSubmit={updateProfile}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="text" value={user?.email || ''} disabled className="w-full px-4 py-2 mt-1 text-gray-500 bg-gray-200 border rounded-lg cursor-not-allowed" />
          </div>
          <div>
            <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
            <input id="username" type="text" value={username || ''} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</label>
            <input id="firstName" type="text" value={firstName || ''} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</label>
            <input id="lastName" type="text" value={lastName || ''} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="address" className="text-sm font-medium text-gray-700">Address</label>
            <input id="address" type="text" value={address || ''} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="sex" className="text-sm font-medium text-gray-700">Sex</label>
            <select id="sex" value={sex ?? ''} onChange={(e) => setSex(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Select your sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="role" className="text-sm font-medium text-gray-700">Role</label>
            <select
              id="role"
              value={userRole ?? ''}
              onChange={(e) => {
                const newRole = e.target.value;
                setUserRole(newRole);
                if (newRole !== 'student') {
                  setYear(null);
                  setSection(null);
                }
                if (newRole !== 'faculty') {
                  setPosition(null);
                }
                if (newRole !== 'faculty' && newRole !== 'staff' && newRole !== 'student') {
                  setUnit(null);
                }
              }}
              className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
              disabled={user?.email?.endsWith('@student.dmmmsu.edu.ph') || !user?.email?.endsWith('@dmmmsu.edu.ph')}
            >
              {user?.email?.endsWith('@student.dmmmsu.edu.ph') ? (
                <option value="student">Student</option>
              ) : user?.email?.endsWith('@dmmmsu.edu.ph') ? (
                <>
                  <option value="" disabled>Select a role</option>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>
                </>
              ) : (
                <>
                  <option value="guest">Guest</option>
                </>
              )}
            </select>
          </div>
          {userRole === 'student' && (
            <>
              <div>
                <label htmlFor="year" className="text-sm font-medium text-gray-700">Year Level</label>
                <select
                  id="year"
                  value={year || ''}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select a year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div>
                <label htmlFor="section" className="text-sm font-medium text-gray-700">Section</label>
                <select
                  id="section"
                  value={section || ''}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select a section</option>
                  <option value="Irregular">Irregular</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                </select>
              </div>
            </>
          )}
          {userRole === 'faculty' && (
            <div>
              <label htmlFor="position" className="text-sm font-medium text-gray-700">Position</label>
              <select
                id="position"
                value={position || ''}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a position</option>
                <option value="Inst1">Instructor I</option>
                <option value="Inst2">Instructor II</option>
                <option value="Inst3">Instructor III</option>
                <option value="AsstProf1">Assistant Professor I</option>
                <option value="AsstProf2">Assistant Professor II</option>
                <option value="AsstProf3">Assistant Professor III</option>
                <option value="AsstProf4">Assistant Professor IV</option>
                <option value="AssocProf1">Associate Professor I</option>
                <option value="AssocProf2">Associate Professor II</option>
                <option value="AssocProf3">Associate Professor III</option>
                <option value="AssocProf4">Associate Professor IV</option>
                <option value="AssocProf5">Associate Professor V</option>
                <option value="Prof1">Professor I</option>
                <option value="Prof2">Professor II</option>
                <option value="Prof3">Professor III</option>
                <option value="Prof4">Professor IV</option>
                <option value="Prof5">Professor V</option>
                <option value="Prof6">Professor VI</option>
              </select>
            </div>
          )}
          {(userRole === 'faculty' || userRole === 'staff' || userRole === 'student') && (
            <div>
              <label htmlFor="unit" className="text-sm font-medium text-gray-700">Unit</label>
              <select
                id="unit"
                value={unit || ''}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a unit</option>
                {(userRole === 'faculty' || userRole === 'staff') && <option value="ADMIN">ADMIN</option>}
                <option value="CA">CA</option>
                <option value="CAS">CAS</option>
                <option value="CCHAMS">CCHAMS</option>
                <option value="CCS">CCS</option>
                <option value="CE">CE</option>
                <option value="CF">CF</option>
                <option value="CGS">CGS</option>
                <option value="CM">CM</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="agency" className="text-sm font-medium text-gray-700">Agency</label>
            <select
              id="agency"
              value={agency ?? ''}
              onChange={(e) => setAgency(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
              disabled={userRole === 'guest'}
            >
              {userRole === 'guest' ? (
                <option value="GUEST">Guest</option>
              ) : (
                <>
                  <option value="" disabled>Select an institution</option>
                  <option value="SLUC">South La Union Campus</option>
                  <option value="NLUC" disabled>North La Union Campus</option>
                  <option value="MLUC" disabled>Mid La Union Campus</option>
                  <option value="CA" disabled>Central Administration</option>
                </>
                )}
            </select>
          </div>
          <div className="flex items-start pt-2">
            <div className="flex items-center h-5">
              <input id="photoConsent" type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="photoConsent" className="font-medium text-gray-700">I allow to have my picture taken for official documentation purpose</label>
            </div>
          </div>
          <div className="flex items-start pt-2">
            <div className="flex items-center h-5">
              <input id="socialMediaConsent" type="checkbox" checked={socialMediaConsent} onChange={(e) => setSocialMediaConsent(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="socialMediaConsent" className="font-medium text-gray-700">I allow my photo to be shared on social media and email for official documentation purpose only.</label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Digital Signature</label>
            <div className="mt-1 border border-gray-300 rounded-lg">
              <SignatureCanvas
                ref={sigPad}
                penColor='black'
                canvasProps={{ className: 'w-full h-32 rounded-lg' }}
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => sigPad.current.clear()}
                className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Clear Signature
              </button>
            </div>
            {signatureUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Current Signature:</p>
                <img src={signatureUrl} alt="User signature" className="mt-1 border border-gray-300 rounded-lg" />
              </div>
            )}
          </div>

          <div className="pt-4 space-y-2">
            <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : 'Update Profile'}
            </button>
            <Link href="/dashboard" className="block w-full px-4 py-2 text-center text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300">
              Back to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}