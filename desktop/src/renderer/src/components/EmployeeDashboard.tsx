import { useState } from 'react'

export function EmployeeDashboard({ onLogout }: { onLogout: () => void }) {
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const tasks = [
    { id: 1, title: 'Fix UI Bug', description: 'Resolve the CSS alignment issue on the dashboard.', deadline: 'Today, 5:00 PM', status: 'ASSIGNED' },
    { id: 2, title: 'Update Documentation', description: 'Write usage instructions for the new API endpoint.', deadline: 'Tomorrow', status: 'IN_PROGRESS' }
  ]

  return (
    <div className="dashboard employee-dashboard">
      <header>
        <h1>Employee Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </header>
      
      <main>
        {!selectedTask ? (
          <>
            <div className="grid-2">
              <section className="card">
                <h3>Today's Shift</h3>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>09:00 - 17:00</div>
                  <p style={{ color: 'var(--text-muted)' }}>Status: <strong style={{ color: '#10b981' }}>Active</strong></p>
                </div>
              </section>
              
              <section className="card">
                <h3>My Tasks</h3>
                <ul className="task-list" style={{ listStyle: 'none', padding: 0 }}>
                  {tasks.map(task => (
                    <li key={task.id} style={{ padding: '1rem', border: '1px solid var(--border)', marginBottom: '0.5rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{task.title}</strong>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Due: {task.deadline}</div>
                      </div>
                      <button className="action-btn" onClick={() => setSelectedTask(task)}>View</button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : (
          <section className="card fade-in">
            <button className="action-btn" onClick={() => setSelectedTask(null)} style={{ marginBottom: '1rem' }}>&larr; Back to Dashboard</button>
            <h2>{selectedTask.title}</h2>
            <p className="status-badge" style={{ display: 'inline-block', marginBottom: '1rem' }}>{selectedTask.status}</p>
            
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
              <strong>Instructions:</strong>
              <p>{selectedTask.description}</p>
            </div>

            <div className="grid-2">
              <div>
                <h3>Task Resources</h3>
                <div className="empty-state">No files attached by manager.</div>
              </div>
              
              <div>
                <h3>Submit Work</h3>
                <div style={{ border: '1px dashed var(--border)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                  <p>Drag and drop files here, or click to browse.</p>
                  <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
                  <label htmlFor="file-upload" className="action-btn" style={{ display: 'inline-block', marginTop: '1rem', cursor: 'pointer' }}>Select Files</label>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <textarea placeholder="Add a comment to your submission..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} rows={3}></textarea>
                  <button style={{ marginTop: '0.5rem' }}>Submit for Review</button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
