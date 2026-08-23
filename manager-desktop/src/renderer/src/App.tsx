import { useState } from 'react'
import { Login } from './components/Login'
import { ManagerDashboard } from './components/ManagerDashboard'

function App(): JSX.Element {
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const handleLogin = (userRole: string, userToken: string) => {
    setRole(userRole)
    setToken(userToken)
  }

  const handleLogout = () => {
    setRole(null)
    setToken(null)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-container fade-in">
      {role === 'MANAGER' ? (
        <ManagerDashboard onLogout={handleLogout} token={token} />
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>This is the Manager application. Please use the Employee application for staff accounts.</p>
          <button onClick={handleLogout} style={{ marginTop: '1rem' }}>Log Out</button>
        </div>
      )}
    </div>
  )
}

export default App
