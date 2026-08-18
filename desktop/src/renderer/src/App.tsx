import { useState } from 'react'
import { Login } from './components/Login'
import { ManagerDashboard } from './components/ManagerDashboard'
import { EmployeeDashboard } from './components/EmployeeDashboard'

function App() {
  const [role, setRole] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const handleLogin = (newRole: string, newToken: string) => {
    setRole(newRole)
    setToken(newToken)
  }

  const handleLogout = () => {
    setRole(null)
    setToken(null)
  }

  if (!token) {
    return (
      <div className="app-layout centered">
        <Login onLogin={handleLogin} />
      </div>
    )
  }

  return (
    <div className="app-layout">
      {role === 'MANAGER' ? (
        <ManagerDashboard onLogout={handleLogout} />
      ) : (
        <EmployeeDashboard onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
