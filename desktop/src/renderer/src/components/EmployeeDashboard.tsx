import { useState, useEffect } from 'react'

interface EmployeeDashboardProps {
  onLogout: () => void
  token: string
}

interface EmployeeProfile {
  id: number
  full_name: string
  user_id: number
  manager_id?: number
  user: { email: string; role: string }
}

interface Shift {
  id: number
  name: string
  start_time: string
  end_time: string
  working_days?: string
  break_duration_minutes?: number
}

interface TaskItem {
  id: number
  title: string
  description?: string
  priority: string
  status: string
  deadline?: string
  expected_duration?: number
}

interface EvaluationItem {
  id: number
  performance_score: number
  period_start: string
  period_end: string
  manager_comments?: string
}

export function EmployeeDashboard({ onLogout, token }: EmployeeDashboardProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([])
  
  const [selectedTask, setSelectedTask] = useState<TaskItem | 'EVALS' | null>(null)
  const [submissionComment, setSubmissionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  
  const [isTracking, setIsTracking] = useState(false)
  const [loading, setLoading] = useState(true)

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  const loadData = async () => {
    try {
      setLoading(true)
      // 1. Fetch Profile
      const profileRes = await fetch('http://127.0.0.1:8000/api/v1/employees/me', { headers })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
      }

      // 2. Fetch Shifts
      const shiftsRes = await fetch('http://127.0.0.1:8000/api/v1/shifts/me', { headers })
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json()
        setShifts(shiftsData)
      }

      // 3. Fetch Tasks
      const tasksRes = await fetch('http://127.0.0.1:8000/api/v1/tasks/', { headers })
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }

      // 4. Fetch Evaluations
      const evalsRes = await fetch('http://127.0.0.1:8000/api/v1/evaluations/', { headers })
      if (evalsRes.ok) {
        const evalsData = await evalsRes.json()
        setEvaluations(evalsData)
      }
    } catch (err) {
      console.error('Error fetching employee data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const toggleTracking = () => {
    if (isTracking) {
      if ((window as any).api) {
        (window as any).api.stopTracking()
      }
      setIsTracking(false)
    } else {
      if ((window as any).api) {
        (window as any).api.startTracking(token)
      }
      setIsTracking(true)
    }
  }

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setActionMessage(`Task updated to ${newStatus}`)
        loadData()
        if (selectedTask && typeof selectedTask !== 'string' && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus })
        }
      }
    } catch (err) {
      console.error('Error updating task status:', err)
    }
  }

  const handleSubmitWork = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault()
    setSubmitting(true)
    setActionMessage('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/submissions/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task_id: taskId,
          comment: submissionComment
        })
      })
      if (res.ok) {
        setActionMessage('Work submitted successfully! Status changed to SUBMITTED.')
        setSubmissionComment('')
        loadData()
        if (selectedTask && typeof selectedTask !== 'string' && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, status: 'SUBMITTED' })
        }
      } else {
        const err = await res.json()
        setActionMessage(err.detail || 'Submission failed')
      }
    } catch (err: any) {
      setActionMessage(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard employee-dashboard">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1>Employee Portal</h1>
            {profile && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Welcome, <strong>{profile.full_name}</strong> ({profile.user.email})</div>}
          </div>
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
              Tracker Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={toggleTracking}
            style={{ 
              background: isTracking ? '#ef4444' : '#10b981', 
              color: 'white',
              border: 'none',
              fontWeight: 'bold'
            }}
          >
            {isTracking ? '■ Stop Tracker' : '▶ Start Tracker'}
          </button>
          <button className="action-btn" onClick={() => setSelectedTask(selectedTask === 'EVALS' ? null : 'EVALS')}>
            {selectedTask === 'EVALS' ? 'My Tasks' : 'My Evaluations'}
          </button>
          <button onClick={loadData} className="action-btn" title="Refresh data">↻</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      
      <main>
        {actionMessage && (
          <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
            {actionMessage}
          </div>
        )}

        {!selectedTask ? (
          <div className="grid-2">
            <section className="card">
              <h3>My Assigned Shift</h3>
              {shifts.length > 0 ? (
                <div style={{ marginTop: '1rem' }}>
                  {shifts.map(s => (
                    <div key={s.id} style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {s.start_time} - {s.end_time}
                      </div>
                      <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0' }}>Shift: <strong>{s.name}</strong></p>
                      {s.working_days && <p style={{ fontSize: '0.85rem' }}>Days: {s.working_days}</p>}
                      <p style={{ color: 'var(--text-muted)' }}>Status: <strong style={{ color: '#10b981' }}>Active Schedule</strong></p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ marginTop: '1rem' }}>
                  No shift assigned yet by manager.
                </div>
              )}
            </section>
            
            <section className="card">
              <h3>My Assigned Tasks ({tasks.length})</h3>
              {loading ? (
                <p>Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <div className="empty-state">No tasks assigned to you currently.</div>
              ) : (
                <ul className="task-list" style={{ listStyle: 'none', padding: 0 }}>
                  {tasks.map(task => (
                    <li key={task.id} style={{ padding: '1rem', border: '1px solid var(--border)', marginBottom: '0.75rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{task.title}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Priority: {task.priority} | Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                        </div>
                        <span className={`status-badge ${task.status.toLowerCase()}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      <button className="action-btn" onClick={() => setSelectedTask(task)}>Open</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : selectedTask === 'EVALS' ? (
          <section className="card fade-in">
            <h2>My Performance Evaluations</h2>
            <p>Formal feedback, aggregated productivity metrics, and performance scores from your manager.</p>
            
            {evaluations.length === 0 ? (
              <div className="empty-state" style={{ marginTop: '1.5rem' }}>No evaluations recorded yet.</div>
            ) : (
              evaluations.map(ev => (
                <div key={ev.id} style={{ marginTop: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Review Period</h3>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.period_start).toLocaleDateString()} &mdash; {new Date(ev.period_end).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="status-badge approved" style={{ fontSize: '1.1rem', padding: '0.5rem 1rem' }}>
                      Score: {ev.performance_score} / 5.0
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Manager Comments &amp; Review:</strong>
                    <p style={{ marginTop: '0.5rem', fontStyle: 'italic', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                      "{ev.manager_comments || 'No written comments provided.'}"
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className="card fade-in">
            <button className="action-btn" onClick={() => setSelectedTask(null)} style={{ marginBottom: '1rem' }}>&larr; Back to Task List</button>
            <h2>{selectedTask.title}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.5rem 0 1rem 0' }}>
              <span className={`status-badge ${selectedTask.status.toLowerCase()}`}>
                {selectedTask.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Priority: {selectedTask.priority}</span>
            </div>
            
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
              <strong>Task Description / Instructions:</strong>
              <p style={{ marginTop: '0.5rem' }}>{selectedTask.description || 'No description provided.'}</p>
            </div>

            <div className="grid-2">
              <div>
                <h3>Update Task Status</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mark your progress for your manager:</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="action-btn" onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS')}>
                    Mark In Progress
                  </button>
                  <button className="action-btn" onClick={() => handleUpdateStatus(selectedTask.id, 'BLOCKED')}>
                    Mark Blocked
                  </button>
                </div>
              </div>
              
              <div>
                <h3>Submit Work / Deliverables</h3>
                <form onSubmit={(e) => handleSubmitWork(e, selectedTask.id)} style={{ marginTop: '0.5rem' }}>
                  <textarea 
                    placeholder="Describe what was accomplished, deliverables link, PRs, or notes..." 
                    value={submissionComment}
                    onChange={(e) => setSubmissionComment(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} 
                    rows={4}
                  />
                  <button type="submit" disabled={submitting} style={{ marginTop: '0.5rem' }}>
                    {submitting ? 'Submitting...' : 'Submit for Manager Review'}
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
