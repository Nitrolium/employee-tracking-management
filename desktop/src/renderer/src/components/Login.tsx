import { useState } from 'react'

export function Login({ onLogin }: { onLogin: (role: string, token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // In a real implementation, this would call the FastAPI backend
      // const response = await fetch('http://localhost:8000/api/v1/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      //   body: new URLSearchParams({ username: email, password })
      // })
      // if (!response.ok) throw new Error('Invalid credentials')
      // const data = await response.json()
      
      // For Phase 1 mockup behavior before backend is fully wired:
      if (email.includes('manager')) {
        onLogin('MANAGER', 'dummy-token')
      } else {
        onLogin('EMPLOYEE', 'dummy-token')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="login-container">
      <h2>Employee Tracking System</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            placeholder="manager@test.com"
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
        {error && <div className="error">{error}</div>}
        <button type="submit">Log In</button>
      </form>
    </div>
  )
}
