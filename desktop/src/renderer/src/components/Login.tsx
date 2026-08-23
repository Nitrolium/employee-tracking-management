import { useState } from 'react'

export function Login({ onLogin }: { onLogin: (role: string, token: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [role, setRole] = useState('EMPLOYEE')
  
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
        const endpoint = role === 'MANAGER' ? '/api/v1/auth/register/manager' : '/api/v1/auth/register/employee'
        const payload = {
          user: { email, password, role },
          full_name: fullName,
          // manager_id or department could be added here later if needed
        }
        
        const response = await fetch(`http://localhost:8000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.detail || 'Registration failed')
        }
        
        // Auto-login after registration by switching to login mode
        setIsRegistering(false)
        setError('Registration successful! Please log in.')
        setLoading(false)
        return
      }
      
      // Login mode
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password })
      })
      
      if (!response.ok) {
        throw new Error('Invalid email or password')
      }
      
      const data = await response.json()
      
      // Decode JWT to get role (simple base64 decode for frontend)
      try {
        const payloadBase64 = data.access_token.split('.')[1]
        const decodedPayload = JSON.parse(atob(payloadBase64))
        onLogin(decodedPayload.role || (email.includes('manager') ? 'MANAGER' : 'EMPLOYEE'), data.access_token)
      } catch (e) {
        // Fallback for testing if JWT structure isn't perfect
        onLogin(email.includes('manager') ? 'MANAGER' : 'EMPLOYEE', data.access_token)
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
          <button type="button" className={`tabs ${isRegistering ? 'active' : ''}`} onClick={() => { setIsRegistering(true); setError(''); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', color: isRegistering ? 'var(--primary)' : 'inherit', cursor: 'pointer' }}>Register</button>
        </div>

        {isRegistering && (
          <>
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} required>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
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
          </>
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
