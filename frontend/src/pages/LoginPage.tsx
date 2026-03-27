import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'login' | 'signup' | 'forgot'

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email)
        if (error) setError(error)
        else setMessage('Check your email for a password reset link.')
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, name)
        if (error) setError(error)
        else setMessage('Check your email to confirm your account.')
      } else {
        const { error } = await signIn(email, password)
        if (error) setError(error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-text-primary tracking-tight">
            Donna
          </h1>
          <p className="text-sm text-text-muted mt-1">
            AI-powered time tracking for lawyers
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-[var(--radius-md)] p-6">
          <h2 className="font-display font-semibold text-lg text-text-primary mb-4">
            {mode === 'login' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'forgot' && 'Reset password'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-link"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-link"
            />

            {mode !== 'forgot' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-link"
              />
            )}

            {error && (
              <p className="text-xs text-semantic-error">{error}</p>
            )}
            {message && (
              <p className="text-xs text-semantic-success">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-accent-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {loading ? 'Loading...' : (
                mode === 'login' ? 'Sign in' :
                mode === 'signup' ? 'Create account' :
                'Send reset link'
              )}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-muted">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full py-2 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-surface border border-border text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Continue with Google
              </button>
            </>
          )}

          {/* Mode switcher */}
          <div className="mt-4 text-center text-xs text-text-muted">
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(null); setMessage(null) }} className="text-accent-link hover:underline cursor-pointer">
                  Forgot password?
                </button>
                <span className="mx-2">·</span>
                <button onClick={() => { setMode('signup'); setError(null); setMessage(null) }} className="text-accent-link hover:underline cursor-pointer">
                  Create account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => { setMode('login'); setError(null); setMessage(null) }} className="text-accent-link hover:underline cursor-pointer">
                Already have an account? Sign in
              </button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('login'); setError(null); setMessage(null) }} className="text-accent-link hover:underline cursor-pointer">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
