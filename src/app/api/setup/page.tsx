'use client'
import { useState } from 'react'

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSetup = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupKey: process.env.NEXT_PUBLIC_SETUP_KEY,
          superadminEmail: 'admin@example.com',
          superadminPassword: 'securepassword123'
        })
      })
      const data = await res.json()
      setMessage(data.success ? data.message : data.error)
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">One Click Setup</h1>
      <button
        disabled={loading}
        onClick={handleSetup}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Setting up...' : 'Run Setup'}
      </button>
      {message && <p className="mt-4">{message}</p>}
    </div>
  )
}
