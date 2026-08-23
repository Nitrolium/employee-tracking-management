import { useState, useEffect } from 'react'

interface ManagerDashboardProps {
  onLogout: () => void
  token: string
}

interface EmployeeItem {
  id: number
  full_name: string
  user_id: number
  user: { email: string; role: string }
}

interface ShiftItem {
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

interface SubmissionItem {
  id: number
  task_id: number
  employee_id: number
  version: number
  comment?: string
  status: string
  manager_feedback?: string
}

interface ActivityItem {
  id: number
  employee_id: number
  timestamp: string
  duration_minutes: number
  active_duration_seconds: number
  idle_duration_seconds: number
  mouse_event_count: number
  keyboard_event_count: number
  app_usages?: Array<{ app_name: string; duration_seconds: number }>
}

interface EvaluationItem {
  id: number
  employee_id: number
  performance_score: number
  period_start: string
  period_end: string
  manager_comments?: string
}

export function ManagerDashboard({ onLogout, token }: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'SHIFTS' | 'TASKS' | 'SUBMISSIONS' | 'ACTIVITY' | 'EVALUATIONS'>('EMPLOYEES')
  
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Form states
  // Add Employee Form
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [empName, setEmpName] = useState('')
  const [empEmail, setEmpEmail] = useState('')
  const [empPassword, setEmpPassword] = useState('')

  // Create Shift Form
  const [showAddShift, setShowAddShift] = useState(false)
  const [shiftName, setShiftName] = useState('')
  const [shiftStart, setShiftStart] = useState('09:00')
  const [shiftEnd, setShiftEnd] = useState('17:00')
  const [shiftDays, setShiftDays] = useState('Monday - Friday')

  // Assign Shift Form
  const [showAssignShift, setShowAssignShift] = useState(false)
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [selectedEmpIdForShift, setSelectedEmpIdForShift] = useState<number | null>(null)

  // Create Task Form
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState('MEDIUM')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [assignEmpIdForTask, setAssignEmpIdForTask] = useState<number | ''>('')

  // Submission Review
  const [reviewFeedback, setReviewFeedback] = useState<{ [key: number]: string }>({})

  // Evaluation Form
  const [evalEmpId, setEvalEmpId] = useState<number | ''>('')
  const [evalStart, setEvalStart] = useState('')
  const [evalEnd, setEvalEnd] = useState('')
  const [evalScore, setEvalScore] = useState(4.5)
  const [evalComments, setEvalComments] = useState('')
  const [reportSummary, setReportSummary] = useState<any>(null)

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  const loadAll = async () => {
    try {
      setLoading(true)
      // 1. Employees
      const empRes = await fetch('http://127.0.0.1:8000/api/v1/managers/employees', { headers })
      if (empRes.ok) setEmployees(await empRes.json())

      // 2. Shifts
      const shiftsRes = await fetch('http://127.0.0.1:8000/api/v1/shifts/', { headers })
      if (shiftsRes.ok) setShifts(await shiftsRes.json())

      // 3. Tasks
      const tasksRes = await fetch('http://127.0.0.1:8000/api/v1/tasks/', { headers })
      if (tasksRes.ok) setTasks(await tasksRes.json())

      // 4. Submissions
      const subRes = await fetch('http://127.0.0.1:8000/api/v1/submissions/', { headers })
      if (subRes.ok) setSubmissions(await subRes.json())

      // 5. Activity
      const actRes = await fetch('http://127.0.0.1:8000/api/v1/activity/summaries', { headers })
      if (actRes.ok) setActivityLogs(await actRes.json())

      // 6. Evaluations
      const evalRes = await fetch('http://127.0.0.1:8000/api/v1/evaluations/', { headers })
      if (evalRes.ok) setEvaluations(await evalRes.json())
    } catch (err) {
      console.error('Error fetching manager data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [token])

  // Handlers
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/managers/employees', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user: { email: empEmail, password: empPassword, role: 'EMPLOYEE' },
          full_name: empName
        })
      })
      if (res.ok) {
        setMessage(`Employee ${empName} created successfully!`)
        setShowAddEmp(false)
        setEmpName('')
        setEmpEmail('')
        setEmpPassword('')
        loadAll()
      } else {
        const err = await res.json()
        setMessage(err.detail || 'Failed to add employee')
      }
    } catch (err: any) {
      setMessage(err.message || 'Error adding employee')
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/shifts/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: shiftName,
          start_time: shiftStart,
          end_time: shiftEnd,
          working_days: shiftDays,
          break_duration_minutes: 60
        })
      })
      if (res.ok) {
        setMessage(`Shift ${shiftName} created!`)
        setShowAddShift(false)
        setShiftName('')
        loadAll()
      }
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShiftId || !selectedEmpIdForShift) return
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/shifts/assign', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shift_id: selectedShiftId,
          employee_id: selectedEmpIdForShift
        })
      })
      if (res.ok) {
        setMessage('Shift assigned to employee!')
        setShowAssignShift(false)
        loadAll()
      }
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/tasks/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null,
          expected_duration: 120
        })
      })
      if (res.ok) {
        const createdTask = await res.json()
        if (assignEmpIdForTask) {
          await fetch('http://127.0.0.1:8000/api/v1/tasks/assign', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task_id: createdTask.id,
              employee_id: Number(assignEmpIdForTask)
            })
          })
        }
        setMessage(`Task "${taskTitle}" created!`)
        setShowAddTask(false)
        setTaskTitle('')
        setTaskDesc('')
        setTaskDeadline('')
        setAssignEmpIdForTask('')
        loadAll()
      }
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const handleReviewSubmission = async (submissionId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const feedback = reviewFeedback[submissionId] || ''
      const res = await fetch(`http://127.0.0.1:8000/api/v1/submissions/${submissionId}/review`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          manager_feedback: feedback
        })
      })
      if (res.ok) {
        setMessage(`Submission marked as ${status}`)
        loadAll()
      }
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const handleGenerateReport = async () => {
    if (!evalEmpId) return
    try {
      const query = new URLSearchParams()
      query.append('employee_id', String(evalEmpId))
      if (evalStart) query.append('start_date', new Date(evalStart).toISOString())
      if (evalEnd) query.append('end_date', new Date(evalEnd).toISOString())
      
      const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/summary?${query.toString()}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setReportSummary(data)
      }
    } catch (err: any) {
      setMessage('Error generating report')
    }
  }

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evalEmpId || !evalStart || !evalEnd) {
      setMessage('Please select employee and date range.')
      return
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/evaluations/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employee_id: Number(evalEmpId),
          period_start: new Date(evalStart).toISOString(),
          period_end: new Date(evalEnd).toISOString(),
          performance_score: Number(evalScore),
          manager_comments: evalComments
        })
      })
      if (res.ok) {
        setMessage('Evaluation saved and published to employee!')
        setEvalComments('')
        loadAll()
      }
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  return (
    <div className="dashboard manager-dashboard">
      <header>
        <h1>Manager Workspace</h1>
        <div className="header-actions">
          <nav className="tabs">
            <button className={activeTab === 'EMPLOYEES' ? 'active' : ''} onClick={() => setActiveTab('EMPLOYEES')}>Employees</button>
            <button className={activeTab === 'SHIFTS' ? 'active' : ''} onClick={() => setActiveTab('SHIFTS')}>Shifts</button>
            <button className={activeTab === 'TASKS' ? 'active' : ''} onClick={() => setActiveTab('TASKS')}>Tasks</button>
            <button className={activeTab === 'SUBMISSIONS' ? 'active' : ''} onClick={() => setActiveTab('SUBMISSIONS')}>Review Center</button>
            <button className={activeTab === 'ACTIVITY' ? 'active' : ''} onClick={() => setActiveTab('ACTIVITY')}>Activity Logs</button>
            <button className={activeTab === 'EVALUATIONS' ? 'active' : ''} onClick={() => setActiveTab('EVALUATIONS')}>Evaluations</button>
          </nav>
          <button onClick={loadAll} className="action-btn" title="Refresh">↻</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      
      <main>
        {message && (
          <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        {/* TAB 1: EMPLOYEES */}
        {activeTab === 'EMPLOYEES' && (
          <section className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Your Team Members ({employees.length})</h2>
              <button onClick={() => setShowAddEmp(!showAddEmp)}>
                {showAddEmp ? 'Cancel' : '+ Add New Employee'}
              </button>
            </div>

            {showAddEmp && (
              <form onSubmit={handleAddEmployee} style={{ marginTop: '1.5rem', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3>Create Employee Account</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Create credentials for an employee to log into the Employee Desktop app.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label>Full Name</label>
                    <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} required placeholder="Alice Smith" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input type="email" value={empEmail} onChange={e => setEmpEmail(e.target.value)} required placeholder="alice@company.com" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Initial Password</label>
                    <input type="password" value={empPassword} onChange={e => setEmpPassword(e.target.value)} required placeholder="securepassword" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '1rem' }}>Create Employee</button>
              </form>
            )}

            <table className="data-table" style={{ marginTop: '1.5rem' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center' }}>No employees added yet. Click "+ Add New Employee" above.</td></tr>
                ) : (
                  employees.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.id}</td>
                      <td><strong>{emp.full_name}</strong></td>
                      <td>{emp.user.email}</td>
                      <td><span className="status-badge approved">EMPLOYEE</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 2: SHIFTS */}
        {activeTab === 'SHIFTS' && (
          <section className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Shift Schedules</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowAssignShift(!showAssignShift)}>
                  {showAssignShift ? 'Cancel Assign' : 'Assign Shift to Employee'}
                </button>
                <button onClick={() => setShowAddShift(!showAddShift)}>
                  {showAddShift ? 'Cancel' : '+ Create Shift'}
                </button>
              </div>
            </div>

            {showAddShift && (
              <form onSubmit={handleCreateShift} style={{ marginTop: '1.5rem', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3>Create Shift Template</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label>Shift Name</label>
                    <input type="text" value={shiftName} onChange={e => setShiftName(e.target.value)} required placeholder="Morning Shift" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Start Time</label>
                    <input type="text" value={shiftStart} onChange={e => setShiftStart(e.target.value)} required placeholder="09:00" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>End Time</label>
                    <input type="text" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} required placeholder="17:00" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Working Days</label>
                    <input type="text" value={shiftDays} onChange={e => setShiftDays(e.target.value)} placeholder="Mon-Fri" style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '1rem' }}>Save Shift</button>
              </form>
            )}

            {showAssignShift && (
              <form onSubmit={handleAssignShift} style={{ marginTop: '1.5rem', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3>Assign Shift to Employee</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label>Select Shift</label>
                    <select onChange={e => setSelectedShiftId(Number(e.target.value))} required style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="">Select Shift...</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Select Employee</label>
                    <select onChange={e => setSelectedEmpIdForShift(Number(e.target.value))} required style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="">Select Employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.user.email})</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '1rem' }}>Assign Schedule</button>
              </form>
            )}

            <table className="data-table" style={{ marginTop: '1.5rem' }}>
              <thead>
                <tr>
                  <th>Shift Name</th>
                  <th>Hours</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center' }}>No shifts configured yet.</td></tr>
                ) : (
                  shifts.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.start_time} - {s.end_time}</td>
                      <td>{s.working_days || 'Standard'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 3: TASKS */}
        {activeTab === 'TASKS' && (
          <section className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Task Board ({tasks.length})</h2>
              <button onClick={() => setShowAddTask(!showAddTask)}>
                {showAddTask ? 'Cancel' : '+ Create Task'}
              </button>
            </div>

            {showAddTask && (
              <form onSubmit={handleCreateTask} style={{ marginTop: '1.5rem', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3>Assign New Task</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label>Task Title</label>
                    <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required placeholder="Implement API feature..." style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Priority</label>
                    <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label>Description &amp; Deliverable Guidelines</label>
                  <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Provide instructions, acceptance criteria..." style={{ width: '100%', padding: '0.5rem' }} rows={3} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label>Deadline (Optional)</label>
                    <input type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Assign To Employee</label>
                    <select value={assignEmpIdForTask} onChange={e => setAssignEmpIdForTask(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="">Select Employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '1rem' }}>Create &amp; Assign Task</button>
              </form>
            )}

            <table className="data-table" style={{ marginTop: '1.5rem' }}>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center' }}>No tasks created yet. Click "+ Create Task" above.</td></tr>
                ) : (
                  tasks.map(t => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.title}</strong>
                        {t.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.description}</div>}
                      </td>
                      <td><span className="status-badge" style={{ background: '#f3f4f6', color: '#374151' }}>{t.priority}</span></td>
                      <td>{t.deadline ? new Date(t.deadline).toLocaleDateString() : 'None'}</td>
                      <td><span className={`status-badge ${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 4: SUBMISSIONS / REVIEW CENTER */}
        {activeTab === 'SUBMISSIONS' && (
          <section className="card fade-in">
            <h2>Review Center ({submissions.length})</h2>
            <p style={{ color: 'var(--text-muted)' }}>Review deliverables submitted by employees and provide approvals or constructive feedback.</p>

            {submissions.length === 0 ? (
              <div className="empty-state" style={{ marginTop: '1.5rem' }}>No task submissions pending review.</div>
            ) : (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {submissions.map(sub => {
                  const task = tasks.find(t => t.id === sub.task_id)
                  const emp = employees.find(e => e.id === sub.employee_id)
                  return (
                    <div key={sub.id} style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0 }}>{task ? task.title : `Task #${sub.task_id}`}</h3>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Submitted by: <strong>{emp ? emp.full_name : `Employee #${sub.employee_id}`}</strong> &bull; Version: #{sub.version}
                          </div>
                        </div>
                        <span className={`status-badge ${sub.status.toLowerCase()}`}>
                          {sub.status}
                        </span>
                      </div>

                      <div style={{ marginTop: '1rem', background: '#fff', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <strong>Employee Comments:</strong>
                        <p style={{ margin: '0.25rem 0' }}>{sub.comment || 'No comments attached.'}</p>
                      </div>

                      {sub.status === 'PENDING' && (
                        <div style={{ marginTop: '1rem' }}>
                          <input 
                            type="text" 
                            placeholder="Add feedback for employee..." 
                            value={reviewFeedback[sub.id] || ''}
                            onChange={e => setReviewFeedback({ ...reviewFeedback, [sub.id]: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} 
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleReviewSubmission(sub.id, 'APPROVED')} style={{ background: '#10b981', color: 'white' }}>
                              ✓ Approve Submission
                            </button>
                            <button onClick={() => handleReviewSubmission(sub.id, 'REJECTED')} style={{ background: '#ef4444', color: 'white' }}>
                              ✕ Request Revisions
                            </button>
                          </div>
                        </div>
                      )}

                      {sub.manager_feedback && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <strong>Manager Feedback:</strong> {sub.manager_feedback}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 5: ACTIVITY LOGS */}
        {activeTab === 'ACTIVITY' && (
          <section className="card fade-in">
            <h2>Activity Logs ({activityLogs.length})</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Privacy-first activity metrics synced from the background tracking engine in 5-minute chunks.
              (No keystrokes, screenshots, or sensitive surveillance recorded).
            </p>

            <table className="data-table" style={{ marginTop: '1.5rem' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Timestamp</th>
                  <th>Active (min)</th>
                  <th>Idle (min)</th>
                  <th>Mouse Events</th>
                  <th>Key Events</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center' }}>No activity logged yet. When employees start their tracker, 5-minute chunks sync here.</td></tr>
                ) : (
                  activityLogs.map(log => {
                    const emp = employees.find(e => e.id === log.employee_id)
                    const activeM = Math.round(log.active_duration_seconds / 60)
                    const idleM = Math.round(log.idle_duration_seconds / 60)
                    return (
                      <tr key={log.id}>
                        <td><strong>{emp ? emp.full_name : `Employee #${log.employee_id}`}</strong></td>
                        <td>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td><span style={{ color: '#10b981', fontWeight: 600 }}>{activeM}m</span></td>
                        <td><span style={{ color: idleM > 0 ? '#f59e0b' : 'inherit' }}>{idleM}m</span></td>
                        <td>{log.mouse_event_count}</td>
                        <td>{log.keyboard_event_count}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 6: EVALUATIONS */}
        {activeTab === 'EVALUATIONS' && (
          <section className="card fade-in">
            <h2>Performance Evaluations &amp; Reports</h2>
            <p style={{ color: 'var(--text-muted)' }}>Aggregate task completion rates and activity data to generate holistic performance evaluations.</p>
            
            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
              {/* Form */}
              <div style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                <h3>Generate &amp; Publish Review</h3>
                <form onSubmit={handleSubmitEvaluation} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label>Employee</label>
                    <select value={evalEmpId} onChange={e => setEvalEmpId(e.target.value ? Number(e.target.value) : '')} required style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="">Select Employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label>Period Start</label>
                      <input type="date" value={evalStart} onChange={e => setEvalStart(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Period End</label>
                      <input type="date" value={evalEnd} onChange={e => setEvalEnd(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
                    </div>
                  </div>
                  <button type="button" onClick={handleGenerateReport} className="action-btn" style={{ alignSelf: 'flex-start' }}>
                    📈 Calculate Metrics
                  </button>

                  {reportSummary && (
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <strong>Performance Summary:</strong>
                      <div>Tasks Completed: {reportSummary.tasks_completed || 0}</div>
                      <div>Total Active Time: {Math.round((reportSummary.total_active_seconds || 0) / 60)} minutes</div>
                      <div>Approval Rate: {reportSummary.approval_rate ? `${reportSummary.approval_rate}%` : 'N/A'}</div>
                    </div>
                  )}

                  <div>
                    <label>Score (1.0 to 5.0)</label>
                    <input type="number" min="1" max="5" step="0.1" value={evalScore} onChange={e => setEvalScore(Number(e.target.value))} required style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <div>
                    <label>Manager Evaluation Feedback</label>
                    <textarea value={evalComments} onChange={e => setEvalComments(e.target.value)} required rows={3} placeholder="Write formal performance notes..." style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                  <button type="submit" style={{ marginTop: '0.5rem' }}>Publish Evaluation to Employee</button>
                </form>
              </div>

              {/* History */}
              <div>
                <h3>Published Evaluations ({evaluations.length})</h3>
                {evaluations.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: '1rem' }}>No evaluations recorded yet.</div>
                ) : (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {evaluations.map(ev => {
                      const emp = employees.find(e => e.id === ev.employee_id)
                      return (
                        <div key={ev.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>{emp ? emp.full_name : `Employee #${ev.employee_id}`}</strong>
                            <span className="status-badge approved">Score: {ev.performance_score}/5.0</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {new Date(ev.period_start).toLocaleDateString()} &mdash; {new Date(ev.period_end).toLocaleDateString()}
                          </div>
                          {ev.manager_comments && (
                            <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.5rem' }}>"{ev.manager_comments}"</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
