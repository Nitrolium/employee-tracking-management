import { useState } from 'react'

export function EmployeeDashboard({ onLogout }: { onLogout: () => void }) {
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isTracking, setIsTracking] = useState(false)

  const toggleTracking = () => {
    if (isTracking) {
      if ((window as any).api) {
        (window as any).api.stopTracking()
      }
      setIsTracking(false)
    } else {
      if ((window as any).api) {
        // Pass dummy token for now, in a real app this is the actual JWT
        (window as any).api.startTracking('dummy-jwt-token')
      }
      setIsTracking(true)
    }
  }

  const tasks = [
    { id: 1, title: 'Fix UI Bug', description: 'Resolve the CSS alignment issue on the dashboard.', deadline: 'Today, 5:00 PM', status: 'ASSIGNED' },
    { id: 2, title: 'Update Documentation', description: 'Write usage instructions for the new API endpoint.', deadline: 'Tomorrow', status: 'IN_PROGRESS' }
  ]

  return (
    <div className="dashboard employee-dashboard">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>Employee Dashboard</h1>
          {isTracking && (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: '#dcfce7', 
              color: '#166534', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 600,
              animation: 'pulse 2s infinite'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }}></span>
              Tracking Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={toggleTracking}
            style={{ 
              background: isTracking ? '#ef4444' : '#10b981', 
              color: 'white',
              border: 'none'
            }}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
          <button className="action-btn" onClick={() => setSelectedTask(selectedTask === 'EVALS' ? null : 'EVALS')}>
            {selectedTask === 'EVALS' ? 'Back to Dashboard' : 'My Evaluations'}
          </button>
          <button onClick={onLogout}>Logout</button>
        </div>
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
        ) : selectedTask === 'EVALS' ? (
          <section className="card fade-in">
            <h2>My Performance Evaluations</h2>
            <p>Formal feedback and performance reports from your manager.</p>
            
            <div style={{ marginTop: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>October 2023 Review</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Period: Oct 1 - Oct 31, 2023</div>
                </div>
                <div className="status-badge approved" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                  Score: 4.5 / 5.0
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <strong>Manager Comments:</strong>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  "Great work this month. Your task submissions were consistently high quality and delivered on time. Activity logs reflect a solid balance of focused deep work and communication."
                </p>
              </div>
            </div>
          </section>
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
