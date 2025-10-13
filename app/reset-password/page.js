'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [isRecovery, setIsRecovery] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()

  // Supabase's client library handles the password recovery token from the URL automatically.
  // When the user lands on this page, the session is updated.

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })

    // In case the event has already fired before the listener was attached
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true)
    }

    return () => subscription?.unsubscribe()
  }, [])

  async function handleResetPassword(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    // The user's session is already updated from the recovery link,
    // so we can just call updateUser to set the new password.
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Your password has been reset successfully! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Reset Your Password</h1>
        {message && <p className="text-center text-green-500">{message}</p>}
        {!isRecovery && !message && (
          <p className="text-center text-gray-600">
            This page is only accessible via a password reset link sent to your email.
          </p>
        )}
        {isRecovery && !message && (
          <>
            {error && <p className="text-center text-red-500">{error}</p>}
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <input
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="password"
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}