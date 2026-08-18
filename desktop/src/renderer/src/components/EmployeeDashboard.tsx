export function EmployeeDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="dashboard employee-dashboard">
      <header>
        <h1>Employee Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </header>
      
      <main>
        <section className="card">
          <h2>Welcome, Employee</h2>
          <p>This is your personal workspace. From here, you will be able to view your scheduled shifts, assigned tasks, and track your active working time.</p>
        </section>
        
        <div className="grid-2">
          <section className="card">
            <h3>Current Shift</h3>
            <div className="empty-state">No active shift today.</div>
          </section>
          
          <section className="card">
            <h3>My Tasks</h3>
            <div className="empty-state">You have no tasks assigned right now.</div>
          </section>
        </div>
      </main>
    </div>
  )
}
