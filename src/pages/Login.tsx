import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LoginProps {
  onSuccess: () => void
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      if (errorMessage.includes('auth/invalid-credential')) {
        setError('Invalid email or password')
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        setError('Email already in use')
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('Password should be at least 6 characters')
      } else if (errorMessage.includes('auth/invalid-email')) {
        setError('Invalid email address')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f7f9f8]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[#1e293b] text-center mb-8">Tiny Study</h1>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#64748b] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#64748b] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143]"
                placeholder="Enter password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-[#BF3143] text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              className="text-sm text-[#64748b] hover:text-[#1e293b]"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        <p className="text-center text-[#64748b] text-sm mt-8">
          Tiny Study by TinyWins
        </p>
      </div>
    </div>
  )
}
