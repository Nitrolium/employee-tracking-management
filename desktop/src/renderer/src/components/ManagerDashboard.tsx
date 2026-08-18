import { useState } from 'react'

export function ManagerDashboard({ onLogout }: { onLogout: () => void }) {
  const [employees, setEmployees] = useState([
    { id: 1, name: 'Alice Smith', email: 'alice@test.com' },
    { id: 2, name: 'Bob Johnson', email: 'bob@test.com' }
  ])

  return (
    <div className="dashboard manager-dashboard">
      <header>
        <h1>Manager Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </header>
      
      <main>
        <section className="card">
          <h2>Your Employees</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.id}</td>
                  <td>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td>
                    <button className="action-btn">View Profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button style={{ marginTop: '1rem' }}>+ Add Employee</button>
        </section>

        <section className="card">
          <h2>Your Teams</h2>
          <div className="empty-state">No teams created yet.</div>
          <button style={{ marginTop: '1rem' }}>+ Create Team</button>
        </section>
      </main>
    </div>
  )
}
