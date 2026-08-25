import { useState, useEffect } from 'react'

interface EmployeeDashboardProps {
  onLogout: () => void
  token: string
}

interface FileItem {
  id: number
  filename: string
  mime_type: string
  size: number
  filepath?: string
}

interface EmployeeProfile {
  id: number
  full_name: string
  user_id: number
  manager_id?: number
  user: { email: string; role: string }
}

interface TeamItem {
  id: number
  name: string
  manager_id: number
  created_at: string
}

interface Shift {
  id: number
  name: string
  start_time: string
  end_time: string
  working_days?: any
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
  files?: FileItem[]
  assigned_to_name?: string
}

interface EvaluationItem {
  id: number
  performance_score: number
  period_start: string
  period_end: string
  manager_comments?: string
}

export function EmployeeDashboard({ onLogout, token }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'EVALUATIONS'>('TASKS')
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([])
  
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [submissionComment, setSubmissionComment] = useState('')
  const [submissionFiles, setSubmissionFiles] = useState<FileItem[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  
  // Shift & Break Tracking State
  const [shiftStatus, setShiftStatus] = useState<'OFF_SHIFT' | 'ON_SHIFT' | 'ON_BREAK' | 'SHIFT_ENDED'>('OFF_SHIFT')
  const [shiftTimerSeconds, setShiftTimerSeconds] = useState(0)
  const [breakTimerSeconds, setBreakTimerSeconds] = useState(0)
  const [showShiftWarningModal, setShowShiftWarningModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [profileRes, shiftsRes, teamsRes, tasksRes, evalsRes] = await Promise.allSettled([
        fetch('http://127.0.0.1:8000/api/v1/employees/me', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/shifts/me', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/teams/me', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/tasks/', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/evaluations/', { headers })
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) setProfile(await profileRes.value.json())
      if (shiftsRes.status === 'fulfilled' && shiftsRes.value.ok) setShifts(await shiftsRes.value.json())
      if (teamsRes.status === 'fulfilled' && teamsRes.value.ok) setTeams(await teamsRes.value.json())
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) setTasks(await tasksRes.value.json())
      if (evalsRes.status === 'fulfilled' && evalsRes.value.ok) setEvaluations(await evalsRes.value.json())
    } catch (err) {
      console.error('Error fetching employee data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  // Timer and Heartbeat Management
  useEffect(() => {
    let timer: any = null
    let heartbeatInterval: any = null

    if (shiftStatus === 'ON_SHIFT') {
      timer = setInterval(() => {
        setShiftTimerSeconds(prev => prev + 1)
      }, 1000)

      // 15s Heartbeat for Active Shift
      heartbeatInterval = setInterval(() => {
        fetch('http://127.0.0.1:8000/api/v1/activity/heartbeat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            status: 'ACTIVE',
            active_seconds: 15,
            idle_seconds: 0,
            current_app: document.title || 'Employee Desktop App',
            window_title: 'Active Shift Session'
          })
        }).catch(() => {})
      }, 15000)
    } else if (shiftStatus === 'ON_BREAK') {
      timer = setInterval(() => {
        setBreakTimerSeconds(prev => prev + 1)
      }, 1000)

      // 15s Heartbeat for Break Status
      heartbeatInterval = setInterval(() => {
        fetch('http://127.0.0.1:8000/api/v1/activity/heartbeat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            status: 'ON_BREAK',
            active_seconds: 0,
            idle_seconds: 15,
            current_app: 'Break Mode',
            window_title: 'Employee On Break ☕'
          })
        }).catch(() => {})
      }, 15000)
    }

    return () => {
      if (timer) clearInterval(timer)
      if (heartbeatInterval) clearInterval(heartbeatInterval)
    }
  }, [shiftStatus, token])

  const isWithinShiftWindow = (shift: Shift): boolean => {
    if (!shift || !shift.start_time || !shift.end_time) return true
    try {
      const now = new Date()
      const [startH, startM] = shift.start_time.split(':').map(Number)
      const [endH, endM] = shift.end_time.split(':').map(Number)

      const startMinutes = startH * 60 + (startM || 0)
      const endMinutes = endH * 60 + (endM || 0)
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      if (endMinutes > startMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes
      } else {
        // Overnight shift (e.g. 22:00 to 06:00)
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes
      }
    } catch {
      return true
    }
  }

  const handleStartShift = (force = false) => {
    const activeShift = shifts.length > 0 ? shifts[0] : null

    // Check shift schedule constraint
    if (activeShift && !force && !isWithinShiftWindow(activeShift)) {
      setShowShiftWarningModal(true)
      return
    }

    setShowShiftWarningModal(false)
    setShiftStatus('ON_SHIFT')
    if ((window as any).api) {
      (window as any).api.startTracking(token)
    }

    fetch('http://127.0.0.1:8000/api/v1/activity/heartbeat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: 'ACTIVE',
        active_seconds: 1,
        idle_seconds: 0,
        current_app: 'Shift Started',
        window_title: 'Shift Clock-In'
      })
    }).catch(() => {})

    showNotification('Shift Clocked-In! Productivity tracker is active.')
  }

  const handleTakeBreak = () => {
    setShiftStatus('ON_BREAK')
    if ((window as any).api) {
      (window as any).api.stopTracking()
    }

    fetch('http://127.0.0.1:8000/api/v1/activity/heartbeat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: 'ON_BREAK',
        active_seconds: 0,
        idle_seconds: 1,
        current_app: 'Break Mode',
        window_title: 'Employee On Break'
      })
    }).catch(() => {})

    showNotification('Break Mode active. Work tracker is paused.')
  }

  const handleResumeShift = () => {
    setShiftStatus('ON_SHIFT')
    if ((window as any).api) {
      (window as any).api.startTracking(token)
    }

    fetch('http://127.0.0.1:8000/api/v1/activity/heartbeat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: 'ACTIVE',
        active_seconds: 1,
        idle_seconds: 0,
        current_app: 'Shift Resumed',
        window_title: 'Shift Resumed'
      })
    }).catch(() => {})

    showNotification('Shift resumed! Productivity tracker active.')
  }

  const handleEndShift = () => {
    if (!confirm('Are you sure you want to end your shift and clock out for today?')) return
    setShiftStatus('SHIFT_ENDED')
    if ((window as any).api) {
      (window as any).api.stopTracking()
    }

    fetch('http://127.0.0.1:8000/api/v1/activity/heartbeat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: 'TRACKING_STOPPED',
        active_seconds: 0,
        idle_seconds: 0,
        current_app: 'Shift Ended',
        window_title: 'Clocked Out'
      })
    }).catch(() => {})

    showNotification('Shift ended successfully. Great job today!')
  }

  const showNotification = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(''), 4000)
  }

  const downloadFile = async (fileId: number, filename: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/files/${fileId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('File download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      showNotification(`Download error: ${err.message}`)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    setUploadingFile(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'File upload failed')
      }
      const uploadedFile: FileItem = await res.json()
      setSubmissionFiles(prev => [...prev, uploadedFile])
      showNotification(`Attached file: ${uploadedFile.filename}`)
    } catch (err: any) {
      showNotification(`Upload error: ${err.message}`)
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Status update failed')
      showNotification(`Task marked as ${newStatus}`)
      loadData()
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handleSubmitWork = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault()
    if (!submissionComment.trim() && submissionFiles.length === 0) {
      showNotification('Please add deliverable comments or attach completed work files.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('http://127.0.0.1:8000/api/v1/submissions/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task_id: taskId,
          comment: submissionComment,
          file_ids: submissionFiles.map(f => f.id)
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Submission failed')
      }

      showNotification('Work & deliverable submitted to manager for review!')
      setSubmissionComment('')
      setSubmissionFiles([])
      setSelectedTask(null)
      loadData()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const activeShift = shifts.length > 0 ? shifts[0] : null
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'APPROVED')

  return (
    <div className="dashboard">
      {/* APP HEADER */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-icon">💻</div>
          <div>
            <div className="brand-title">{profile ? profile.full_name : 'Employee Workspace'}</div>
            <div className="brand-subtitle">{profile ? profile.user.email : 'Staff Desktop App'}</div>
          </div>
        </div>

        <nav className="header-nav">
          <button className={activeTab === 'TASKS' ? 'active' : ''} onClick={() => { setActiveTab('TASKS'); setSelectedTask(null) }}>
            Tasks ({tasks.length})
          </button>
          <button className={activeTab === 'EVALUATIONS' ? 'active' : ''} onClick={() => { setActiveTab('EVALUATIONS'); setSelectedTask(null) }}>
            My Evaluations ({evaluations.length})
          </button>
        </nav>

        <div className="header-actions">
          <button onClick={loadData} className="btn-outline btn-sm" title="Refresh Dashboard Data">
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <button onClick={onLogout} className="btn-secondary btn-sm">Log Out</button>
        </div>
      </header>

      <main>
        {/* TOAST / ACTION MESSAGE */}
        {actionMessage && (
          <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #bae6fd' }} className="fade-in">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage('')} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* SHIFT & BREAK CONTROL BAR */}
        <div className="tracker-card">
          <div className="tracker-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className={`status-badge ${shiftStatus === 'ON_SHIFT' ? 'active' : shiftStatus === 'ON_BREAK' ? 'in_progress' : shiftStatus === 'SHIFT_ENDED' ? 'approved' : 'offline'}`} style={{ fontSize: '0.85rem' }}>
                  {shiftStatus === 'ON_SHIFT' && <span className="pulse-dot"></span>}
                  {shiftStatus === 'ON_SHIFT' ? '● Shift Active (Tracking)' : shiftStatus === 'ON_BREAK' ? '☕ On Break (Paused)' : shiftStatus === 'SHIFT_ENDED' ? '🏁 Shift Completed' : '🔴 Not Clocked In'}
                </span>

                {activeShift && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Assigned Shift: <strong>{activeShift.name}</strong> ({activeShift.start_time} - {activeShift.end_time}, ☕ {activeShift.break_duration_minutes || 60}m break)
                  </span>
                )}

                {teams.length > 0 && (
                  <span style={{ fontSize: '0.8125rem', color: '#4f46e5', background: '#e0e7ff', padding: '0.2rem 0.6rem', borderRadius: 9999 }}>
                    🏢 {teams.map(t => t.name).join(', ')}
                  </span>
                )}
              </div>

              {/* TIMERS */}
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work Session Time</span>
                  <div className="timer-display" style={{ fontSize: '2rem' }}>{formatTimer(shiftTimerSeconds)}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Break Time Taken</span>
                  <div className="timer-display" style={{ fontSize: '2rem', color: shiftStatus === 'ON_BREAK' ? '#f59e0b' : 'var(--text-muted)' }}>
                    {formatTimer(breakTimerSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {shiftStatus === 'OFF_SHIFT' && (
                <button className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }} onClick={() => handleStartShift(false)}>
                  ▶ Start Shift
                </button>
              )}

              {shiftStatus === 'ON_SHIFT' && (
                <>
                  <button className="btn-secondary" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', padding: '0.75rem 1.25rem' }} onClick={handleTakeBreak}>
                    ☕ Take a Break
                  </button>
                  <button className="btn-danger" style={{ padding: '0.75rem 1.25rem' }} onClick={handleEndShift}>
                    ■ End Shift
                  </button>
                </>
              )}

              {shiftStatus === 'ON_BREAK' && (
                <>
                  <button className="btn-primary" style={{ padding: '0.75rem 1.5rem' }} onClick={handleResumeShift}>
                    ▶ Resume Shift
                  </button>
                  <button className="btn-danger" style={{ padding: '0.75rem 1.25rem' }} onClick={handleEndShift}>
                    ■ End Shift
                  </button>
                </>
              )}

              {shiftStatus === 'SHIFT_ENDED' && (
                <button className="btn-outline" style={{ padding: '0.75rem 1.5rem' }} onClick={() => handleStartShift(true)}>
                  ↺ Clock In New Shift
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ==================== TAB 1: MY TASKS ==================== */}
        {activeTab === 'TASKS' && !selectedTask && (
          <div className="fade-in">
            <div className="grid-2">
              {/* Assigned Tasks List */}
              <div className="card">
                <div className="card-header-flex">
                  <div>
                    <h2>Pending &amp; Active Tasks ({pendingTasks.length})</h2>
                    <p className="card-desc" style={{ marginBottom: 0 }}>Tasks assigned to you or your team.</p>
                  </div>
                </div>

                {pendingTasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🎉</div>
                    <div className="empty-state-title">You're all caught up!</div>
                    <p>No active or pending tasks assigned right now.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pendingTasks.map(task => (
                      <div key={task.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className="status-badge" style={{ 
                              background: task.priority === 'High' ? '#fee2e2' : task.priority === 'Medium' ? '#fef3c7' : '#f1f5f9',
                              color: task.priority === 'High' ? '#991b1b' : task.priority === 'Medium' ? '#92400e' : '#334155',
                              fontSize: '0.7rem'
                            }}>
                              {task.priority}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{task.title}</span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {task.deadline ? `Deadline: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
                            {task.expected_duration && ` • ${task.expected_duration} mins`}
                          </div>
                          {task.files && task.files.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                              📎 {task.files.length} attached brief file(s)
                            </div>
                          )}
                          <div style={{ marginTop: '0.4rem' }}>
                            <span className={`status-badge ${task.status.toLowerCase()}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <button className="btn-primary btn-sm" onClick={() => setSelectedTask(task)}>View &amp; Submit &rarr;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed / Reviewed Tasks */}
              <div className="card">
                <div className="card-header-flex">
                  <div>
                    <h2>Completed Tasks ({tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length})</h2>
                    <p className="card-desc" style={{ marginBottom: 0 }}>Approved deliverables &amp; finished work.</p>
                  </div>
                </div>

                {tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>No finished tasks yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').map(task => (
                      <div key={task.id} style={{ border: '1px solid var(--border-light)', padding: '1rem', borderRadius: 'var(--radius)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{task.title}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Priority: {task.priority}
                          </div>
                          {task.files && task.files.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                              📎 {task.files.length} attached file(s)
                            </div>
                          )}
                          <div style={{ marginTop: '0.4rem' }}>
                            <span className={`status-badge ${task.status.toLowerCase()}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <button className="btn-outline btn-sm" onClick={() => setSelectedTask(task)}>View Details &rarr;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SELECTED TASK DETAIL & SUBMISSION ==================== */}
        {activeTab === 'TASKS' && selectedTask && (
          <div className="card fade-in">
            <button className="btn-outline btn-sm" onClick={() => setSelectedTask(null)} style={{ marginBottom: '1.25rem' }}>
              &larr; Back to Task List
            </button>

            <div className="card-header-flex">
              <div>
                <h2>{selectedTask.title}</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span className={`status-badge ${selectedTask.status.toLowerCase()}`}>
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Priority: <strong>{selectedTask.priority}</strong> &bull; Deadline: {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'No deadline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Task Description */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Instructions &amp; Requirements:</div>
              <div style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {selectedTask.description || 'No specific written instructions provided.'}
              </div>
            </div>

            {/* Attached Specification Files from Manager */}
            {selectedTask.files && selectedTask.files.length > 0 && (
              <div style={{ marginBottom: '1.5rem', background: '#eef2ff', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--primary-border)' }}>
                <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Reference / Brief Files From Manager ({selectedTask.files.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedTask.files.map(f => (
                    <button key={f.id} onClick={() => downloadFile(f.id, f.filename)} className="file-download-btn" style={{ padding: '0.45rem 0.85rem' }}>
                      📥 Download {f.filename} ({formatFileSize(f.size)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid-2">
              {/* Quick Status Updater */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3>Update Task Status</h3>
                <p className="card-desc" style={{ marginTop: '0.25rem' }}>Keep your manager in the loop on your progress.</p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn-secondary" onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS')}>
                    Mark In Progress
                  </button>
                  <button className="btn-outline" onClick={() => handleUpdateStatus(selectedTask.id, 'BLOCKED')}>
                    Mark Blocked
                  </button>
                </div>
              </div>

              {/* Submit Deliverable with File Uploads */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3>Submit Work &amp; Deliverables</h3>
                <p className="card-desc" style={{ marginTop: '0.25rem' }}>Upload your completed work and deliverable notes for review.</p>
                
                <form onSubmit={(e) => handleSubmitWork(e, selectedTask.id)} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Deliverable Notes &amp; PR Links</label>
                    <textarea 
                      rows={3} 
                      placeholder="Explain what was accomplished, repository links, or testing details..." 
                      value={submissionComment} 
                      onChange={(e) => setSubmissionComment(e.target.value)} 
                      required 
                    />
                  </div>

                  {/* File Uploader */}
                  <div className="form-group">
                    <label>Attach Deliverable Files (Code, Document, Zip, Image)</label>
                    <div className="file-dropzone">
                      <input type="file" id="submission-file-input" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploadingFile} />
                      <label htmlFor="submission-file-input" style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
                        <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>📁</div>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.85rem' }}>
                          {uploadingFile ? 'Uploading...' : '+ Attach Deliverable File'}
                        </div>
                      </label>
                    </div>

                    {submissionFiles.length > 0 && (
                      <div className="file-chip-container">
                        {submissionFiles.map(f => (
                          <span key={f.id} className="file-chip">
                            📎 {f.filename} ({formatFileSize(f.size)})
                            <span className="file-chip-remove" onClick={() => setSubmissionFiles(prev => prev.filter(x => x.id !== f.id))}>✕</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn-primary" disabled={submitting || uploadingFile} style={{ width: '100%', marginTop: '0.5rem' }}>
                    {submitting ? 'Submitting Deliverable...' : '✓ Submit for Manager Review'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: MY EVALUATIONS ==================== */}
        {activeTab === 'EVALUATIONS' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>My Performance Evaluations ({evaluations.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Formal performance reviews and constructive feedback from your manager.</p>
              </div>
            </div>

            {evaluations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⭐</div>
                <div className="empty-state-title">No evaluations published yet</div>
                <p>When your manager publishes a performance evaluation, it will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {evaluations.map(ev => (
                  <div key={ev.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', background: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Performance Review</h3>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Period: {new Date(ev.period_start).toLocaleDateString()} &mdash; {new Date(ev.period_end).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="status-badge approved" style={{ fontSize: '1.05rem', padding: '0.4rem 0.9rem' }}>
                        ★ {ev.performance_score} / 5.0
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Manager Comments:</div>
                      <div style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>"{ev.manager_comments || 'No written comments provided.'}"</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* OUT-OF-SHIFT HOURS WARNING MODAL */}
      {showShiftWarningModal && activeShift && (
        <div className="modal-backdrop" onClick={() => setShowShiftWarningModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⏰ Outside Scheduled Shift Hours</h3>
              <button className="modal-close-btn" onClick={() => setShowShiftWarningModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                Your assigned shift <strong>"{activeShift.name}"</strong> is scheduled for:
              </p>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '1rem', borderRadius: 'var(--radius)', margin: '1rem 0', color: '#92400e' }}>
                <strong>Scheduled Hours:</strong> {activeShift.start_time} &mdash; {activeShift.end_time}<br />
                <strong>Break Allowance:</strong> {activeShift.break_duration_minutes || 60} minutes
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                You are currently clocking in outside these hours. Would you like to clock in anyway with overtime tracking enabled?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowShiftWarningModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleStartShift(true)}>Clock In Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
