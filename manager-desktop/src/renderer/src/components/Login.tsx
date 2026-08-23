import { useState } from 'react'

export function Login({ onLogin }: { onLogin: (role: string, token: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      if (isRegistering) {
        // Only managers can register publicly. Employees are created BY managers inside the app.
        const payload = {
          user: { email, password, role: 'MANAGER' },
          full_name: fullName,
        }
        
        const response = await fetch(`http://127.0.0.1:8000/api/v1/auth/register/manager`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.detail || 'Registration failed')
        }
        
        setIsRegistering(false)
        setError('Manager account created successfully! Please log in.')
        setLoading(false)
        return
      }
      
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
      <form onSubmit={handleSubmit} className="login-form">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
          <button type="button" className={`tabs ${!isRegistering ? 'active' : ''}`} onClick={() => { setIsRegistering(false); setError(''); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', color: !isRegistering ? 'var(--primary)' : 'inherit', cursor: 'pointer' }}>Login</button>
          <button type="button" className={`tabs ${isRegistering ? 'active' : ''}`} onClick={() => { setIsRegistering(true); setError(''); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', color: isRegistering ? 'var(--primary)' : 'inherit', cursor: 'pointer' }}>Register as Manager</button>
        </div>

        {isRegistering && (
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              required 
              placeholder="John Doe"
            />
          </div>
        )}

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
        
        {error && <div className="error" style={{ color: error.includes('successful') ? 'green' : 'red', marginBottom: '1rem' }}>{error}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : isRegistering ? 'Register' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
