import { useState } from 'react'

export function Login({ onLogin }: { onLogin: (role: string, token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password })
      })
      
      if (!response.ok) {
        throw new Error('Invalid email or password')
      }
      
      const data = await response.json()
      
      try {
        const payloadBase64 = data.access_token.split('.')[1]
        const decodedPayload = JSON.parse(atob(payloadBase64))
        onLogin(decodedPayload.role, data.access_token)
      } catch (e) {
        throw new Error('Invalid token received from server')
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <h2>Employee Tracking System</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>Employee Login</p>
      
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            placeholder="user@example.com"
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            placeholder="password"
          />
        </div>
        
        {error && <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
