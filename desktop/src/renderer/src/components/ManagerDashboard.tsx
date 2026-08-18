import { useState } from 'react'

export function ManagerDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'SHIFTS' | 'TASKS' | 'SUBMISSIONS' | 'ACTIVITY' | 'EVALUATIONS'>('EMPLOYEES')
  
  const employees = [
    { id: 1, name: 'Alice Smith', email: 'alice@test.com' },
    { id: 2, name: 'Bob Johnson', email: 'bob@test.com' }
  ]

  const tasks = [
    { id: 1, title: 'Build Database Schema', assignedTo: 'Alice Smith', status: 'IN_PROGRESS', deadline: '2023-11-01' },
    { id: 2, title: 'Write API Documentation', assignedTo: 'Bob Johnson', status: 'SUBMITTED', deadline: '2023-10-25' }
  ]

  const activityLogs = [
    { id: 1, employee: 'Alice Smith', time: '10:00 - 10:05 AM', activeMin: 4, idleMin: 1, mouseEvents: 345, keyEvents: 1200, app: 'VS Code' },
    { id: 2, employee: 'Alice Smith', time: '10:05 - 10:10 AM', activeMin: 5, idleMin: 0, mouseEvents: 412, keyEvents: 1540, app: 'Chrome' },
    { id: 3, employee: 'Bob Johnson', time: '09:00 - 09:05 AM', activeMin: 2, idleMin: 3, mouseEvents: 50, keyEvents: 0, app: 'Slack' }
  ]

  return (
    <div className="dashboard manager-dashboard">
      <header>
        <h1>Manager Dashboard</h1>
        <div className="header-actions">
          <nav className="tabs">
            <button className={activeTab === 'EMPLOYEES' ? 'active' : ''} onClick={() => setActiveTab('EMPLOYEES')}>Employees</button>
            <button className={activeTab === 'SHIFTS' ? 'active' : ''} onClick={() => setActiveTab('SHIFTS')}>Shifts</button>
            <button className={activeTab === 'TASKS' ? 'active' : ''} onClick={() => setActiveTab('TASKS')}>Tasks</button>
            <button className={activeTab === 'SUBMISSIONS' ? 'active' : ''} onClick={() => setActiveTab('SUBMISSIONS')}>Review Center</button>
            <button className={activeTab === 'ACTIVITY' ? 'active' : ''} onClick={() => setActiveTab('ACTIVITY')}>Activity Logs</button>
            <button className={activeTab === 'EVALUATIONS' ? 'active' : ''} onClick={() => setActiveTab('EVALUATIONS')}>Evaluations</button>
          </nav>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      
      <main>
        {activeTab === 'EMPLOYEES' && (
          <section className="card fade-in">
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
                    <td><button className="action-btn">View Profile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ marginTop: '1rem' }}>+ Add Employee</button>
          </section>
        )}

        {activeTab === 'SHIFTS' && (
          <section className="card fade-in">
            <h2>Shift Management</h2>
            <div className="empty-state">No shifts configured yet.</div>
            <button style={{ marginTop: '1rem' }}>+ Create Shift</button>
          </section>
        )}

        {activeTab === 'TASKS' && (
          <section className="card fade-in">
            <h2>Task Board</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Assigned To</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.assignedTo}</td>
                    <td>{task.deadline}</td>
                    <td><span className={`status-badge ${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</span></td>
                    <td><button className="action-btn">Edit Task</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ marginTop: '1rem' }}>+ Create Task</button>
          </section>
        )}

        {activeTab === 'SUBMISSIONS' && (
          <section className="card fade-in">
            <h2>Review Center</h2>
            <p>Review completed tasks and provide feedback.</p>
            <div className="review-list" style={{ marginTop: '1rem' }}>
              <div className="review-item" style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                <h3>Write API Documentation</h3>
                <p>Submitted by: <strong>Bob Johnson</strong></p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="action-btn">Download Files</button>
                  <button className="action-btn" style={{ background: '#10b981', color: 'white' }}>Approve</button>
                  <button className="action-btn" style={{ background: '#ef4444', color: 'white' }}>Reject</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'ACTIVITY' && (
          <section className="card fade-in">
            <h2>Activity Logs</h2>
            <p style={{ color: 'var(--text-muted)' }}>Aggregated 5-minute activity chunks for privacy-preserving monitoring.</p>
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Time Chunk</th>
                  <th>Active (min)</th>
                  <th>Idle (min)</th>
                  <th>Mouse Evts</th>
                  <th>Key Evts</th>
                  <th>Top App</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map(log => (
                  <tr key={log.id}>
                    <td><strong>{log.employee}</strong></td>
                    <td>{log.time}</td>
                    <td><span style={{ color: log.activeMin > 0 ? '#10b981' : 'inherit' }}>{log.activeMin}m</span></td>
                    <td><span style={{ color: log.idleMin > 0 ? '#f59e0b' : 'inherit' }}>{log.idleMin}m</span></td>
                    <td>{log.mouseEvents}</td>
                    <td>{log.keyEvents}</td>
                    <td>{log.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'EVALUATIONS' && (
          <section className="card fade-in">
            <h2>Performance Evaluations</h2>
            <p>Generate reports combining Task Submissions and Activity Data to evaluate employees.</p>
            
            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
              <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                <h3>Generate Report</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <select style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <option>Select Employee...</option>
                    <option>Alice Smith</option>
                    <option>Bob Johnson</option>
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="date" style={{ padding: '0.5rem', flex: 1 }} title="Start Date" />
                    <input type="date" style={{ padding: '0.5rem', flex: 1 }} title="End Date" />
                  </div>
                  <button className="action-btn">Generate Comprehensive Report</button>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                <h3>Recent Evaluations</h3>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                  <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Alice Smith</strong>
                      <span className="status-badge approved">Score: 4.5/5</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Oct 1 - Oct 31, 2023</div>
                  </li>
                  <li style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Bob Johnson</strong>
                      <span className="status-badge in_progress">Score: 3.2/5</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Oct 1 - Oct 31, 2023</div>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
