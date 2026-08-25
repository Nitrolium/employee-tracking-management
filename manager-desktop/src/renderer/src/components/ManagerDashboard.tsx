import { useState, useEffect } from 'react'

interface ManagerDashboardProps {
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

interface EmployeeItem {
  id: number
  full_name: string
  user_id: number
  user: { email: string; role: string }
}

interface TeamItem {
  id: number
  name: string
  manager_id: number
  created_at: string
  members: EmployeeItem[]
  member_count?: number
}

interface ShiftItem {
  id: number
  name: string
  start_time: string
  end_time: string
  working_days?: any
  break_duration_minutes?: number
  assignment_count?: number
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
  assignments?: Array<{ id: number; employee_id?: number; team_id?: number; employee_name?: string; team_name?: string }>
}

interface SubmissionItem {
  id: number
  task_id: number
  employee_id: number
  version: number
  comment?: string
  status: string
  manager_feedback?: string
  submitted_at: string
  files?: FileItem[]
  employee_name?: string
  task_title?: string
}

interface LiveEmployeeItem {
  employee_id: number
  employee_name: string
  email: string
  status: string
  current_app?: string
  window_title?: string
  is_online: boolean
  is_tracking: boolean
  last_heartbeat?: string
  today_active_seconds: number
  today_idle_seconds: number
  focus_score_today?: number
  keystrokes_today?: number
  mouse_clicks_today?: number
  activity_intensity?: string
  app_category?: string
  assigned_shift_name?: string
  shift_start_time?: string
  shift_end_time?: string
  shift_progress_percent?: number
}

interface AppBreakdownItem {
  app_name: string
  duration_seconds: number
  percentage: number
  category: string
}

interface TimelineBucket {
  time_label: string
  active_seconds: number
  idle_seconds: number
}

interface PastShiftActivityItem {
  id: number
  employee_id: number
  employee_name: string
  employee_email: string
  shift_id?: number
  shift_name?: string
  date: string
  clock_in_time: string
  clock_out_time?: string
  is_ongoing: boolean
  total_duration_seconds: number
  active_duration_seconds: number
  idle_duration_seconds: number
  break_duration_seconds: number
  focus_score: number
  mouse_event_count: number
  keyboard_event_count: number
  punctuality_status: string
  top_applications: AppBreakdownItem[]
  timeline: TimelineBucket[]
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EMPLOYEES' | 'TEAMS' | 'SHIFTS' | 'TASKS' | 'SUBMISSIONS' | 'ACTIVITY' | 'EVALUATIONS'>('OVERVIEW')
  
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [liveTeamStatus, setLiveTeamStatus] = useState<LiveEmployeeItem[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([])

  // Live Activity & Past Shifts state
  const [activitySubTab, setActivitySubTab] = useState<'LIVE' | 'PAST_SHIFTS'>('LIVE')
  const [liveFilterStatus, setLiveFilterStatus] = useState<'ALL' | 'ACTIVE' | 'ON_BREAK' | 'IDLE' | 'OFFLINE'>('ALL')
  const [liveSearchQuery, setLiveSearchQuery] = useState('')
  
  const [pastShiftHistory, setPastShiftHistory] = useState<PastShiftActivityItem[]>([])
  const [pastShiftEmpId, setPastShiftEmpId] = useState<number | ''>('')
  const [pastShiftStartDate, setPastShiftStartDate] = useState(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [pastShiftEndDate, setPastShiftEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [pastShiftLoading, setPastShiftLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  // Modals state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [addingMembersToTeam, setAddingMembersToTeam] = useState<TeamItem | null>(null)
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{ teamId: number; teamName: string; memberId: number; memberName: string } | null>(null)
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<TeamItem | null>(null)

  const [showAddShiftModal, setShowAddShiftModal] = useState(false)
  const [showAssignShiftModal, setShowAssignShiftModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [reviewingSubmission, setReviewingSubmission] = useState<SubmissionItem | null>(null)

  // Add Employee Form
  const [empName, setEmpName] = useState('')
  const [empEmail, setEmpEmail] = useState('')
  const [empPassword, setEmpPassword] = useState('')

  // Create Team Form
  const [teamName, setTeamName] = useState('')
  const [selectedInitialMembers, setSelectedInitialMembers] = useState<number[]>([])
  const [teamSearchQuery, setTeamSearchQuery] = useState('')

  // Add Members to Team Form
  const [newMemberIds, setNewMemberIds] = useState<number[]>([])
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('')

  // Create Shift Form
  const [shiftName, setShiftName] = useState('')
  const [shiftStart, setShiftStart] = useState('09:00')
  const [shiftEnd, setShiftEnd] = useState('17:00')
  const [shiftBreakMins, setShiftBreakMins] = useState(60)
  const [shiftDays, setShiftDays] = useState('Mon - Fri')

  // Assign Shift Form
  const [shiftAssignType, setShiftAssignType] = useState<'EMPLOYEE' | 'TEAM'>('EMPLOYEE')
  const [selectedShiftId, setSelectedShiftId] = useState<number | ''>('')
  const [selectedEmpIdForShift, setSelectedEmpIdForShift] = useState<number | ''>('')
  const [selectedTeamIdForShift, setSelectedTeamIdForShift] = useState<number | ''>('')

  // Create Task Form
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState('Medium')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskDuration, setTaskDuration] = useState(60)
  const [taskAssignType, setTaskAssignType] = useState<'EMPLOYEE' | 'TEAM'>('EMPLOYEE')
  const [taskAssignedEmpId, setTaskAssignedEmpId] = useState<number | ''>('')
  const [taskAssignedTeamId, setTaskAssignedTeamId] = useState<number | ''>('')
  const [taskAttachedFiles, setTaskAttachedFiles] = useState<FileItem[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  // Review Submission State
  const [reviewFeedbackText, setReviewFeedbackText] = useState('')

  // Create Evaluation Form
  const [evalEmpId, setEvalEmpId] = useState<number | ''>('')
  const [evalScore, setEvalScore] = useState(4.5)
  const [evalComments, setEvalComments] = useState('')
  const [evalStart, setEvalStart] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [evalEnd, setEvalEnd] = useState(new Date().toISOString().split('T')[0])

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  const extractErrorMessage = (errData: any, fallback: string): string => {
    if (!errData) return fallback
    if (typeof errData === 'string') return errData
    if (typeof errData.detail === 'string') return errData.detail
    if (Array.isArray(errData.detail)) {
      return errData.detail.map((e: any) => `${e.loc ? e.loc.filter((x: any) => x !== 'body').join('.') + ': ' : ''}${e.msg}`).join(', ')
    }
    if (errData.message) return errData.message
    return fallback
  }

  const loadAll = async () => {
    try {
      setLoading(true)
      const [empRes, teamRes, shiftRes, taskRes, subRes, liveRes, evalRes] = await Promise.allSettled([
        fetch('http://127.0.0.1:8000/api/v1/managers/employees', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/teams/', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/shifts/', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/tasks/', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/submissions/', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/activity/live', { headers }),
        fetch('http://127.0.0.1:8000/api/v1/evaluations/', { headers })
      ])

      if (empRes.status === 'fulfilled' && empRes.value.ok) setEmployees(await empRes.value.json())
      if (teamRes.status === 'fulfilled' && teamRes.value.ok) setTeams(await teamRes.value.json())
      if (shiftRes.status === 'fulfilled' && shiftRes.value.ok) setShifts(await shiftRes.value.json())
      if (taskRes.status === 'fulfilled' && taskRes.value.ok) setTasks(await taskRes.value.json())
      if (subRes.status === 'fulfilled' && subRes.value.ok) setSubmissions(await subRes.value.json())
      if (liveRes.status === 'fulfilled' && liveRes.value.ok) setLiveTeamStatus(await liveRes.value.json())
      if (evalRes.status === 'fulfilled' && evalRes.value.ok) setEvaluations(await evalRes.value.json())

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPastShifts = async () => {
    try {
      setPastShiftLoading(true)
      let url = `http://127.0.0.1:8000/api/v1/activity/shifts/history?start_date=${pastShiftStartDate}&end_date=${pastShiftEndDate}`
      if (pastShiftEmpId) {
        url += `&employee_id=${pastShiftEmpId}`
      }
      const res = await fetch(url, { headers })
      if (res.ok) {
        const data = await res.json()
        setPastShiftHistory(data)
      }
    } catch (err) {
      console.error('Error fetching past shift history:', err)
    } finally {
      setPastShiftLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    const interval = setInterval(() => {
      fetch('http://127.0.0.1:8000/api/v1/activity/live', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setLiveTeamStatus(data))
        .catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [token])

  useEffect(() => {
    if (activeTab === 'ACTIVITY' && activitySubTab === 'PAST_SHIFTS') {
      fetchPastShifts()
    }
  }, [activeTab, activitySubTab, pastShiftEmpId, pastShiftStartDate, pastShiftEndDate])

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
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
      showNotification(`Download error: ${err.message}`, 'error')
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
        throw new Error(extractErrorMessage(err, 'File upload failed'))
      }
      const uploadedFile: FileItem = await res.json()
      setTaskAttachedFiles(prev => [...prev, uploadedFile])
      showNotification(`Attached file: ${uploadedFile.filename}`)
    } catch (err: any) {
      showNotification(`Upload error: ${err.message}`, 'error')
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/managers/employees', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: empName,
          user: { email: empEmail, password: empPassword, role: 'EMPLOYEE' }
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to add employee'))
      }
      showNotification(`Employee "${empName}" registered successfully!`)
      setEmpName('')
      setEmpEmail('')
      setEmpPassword('')
      setShowAddEmpModal(false)
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/teams/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: teamName.trim(),
          member_employee_ids: selectedInitialMembers
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to create team'))
      }
      showNotification(`Team "${teamName}" created with ${selectedInitialMembers.length} members!`)
      setTeamName('')
      setSelectedInitialMembers([])
      setShowAddTeamModal(false)
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleAddMembersToTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addingMembersToTeam || newMemberIds.length === 0) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/teams/${addingMembersToTeam.id}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_ids: newMemberIds })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to add members'))
      }
      showNotification(`Added ${newMemberIds.length} members to "${addingMembersToTeam.name}"!`)
      setAddingMembersToTeam(null)
      setNewMemberIds([])
      setAddMemberSearchQuery('')
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleConfirmRemoveMember = async () => {
    if (!confirmRemoveMember) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/teams/${confirmRemoveMember.teamId}/members/${confirmRemoveMember.memberId}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to remove member'))
      }
      showNotification(`Removed ${confirmRemoveMember.memberName} from "${confirmRemoveMember.teamName}".`)
      setConfirmRemoveMember(null)
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleConfirmDeleteTeam = async () => {
    if (!confirmDeleteTeam) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/teams/${confirmDeleteTeam.id}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to delete team'))
      }
      showNotification(`Team "${confirmDeleteTeam.name}" deleted successfully.`)
      setConfirmDeleteTeam(null)
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/shifts/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: shiftName.trim(),
          start_time: shiftStart.trim(),
          end_time: shiftEnd.trim(),
          break_duration_minutes: Number(shiftBreakMins),
          working_days: [1, 2, 3, 4, 5],
          effective_date: new Date().toISOString().split('T')[0]
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to create shift template'))
      }
      showNotification(`Shift template "${shiftName}" created successfully!`)
      setShiftName('')
      setShowAddShiftModal(false)
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShiftId) return

    const payload: any = {
      shift_id: Number(selectedShiftId)
    }
    if (shiftAssignType === 'EMPLOYEE') {
      if (!selectedEmpIdForShift) return
      payload.employee_id = Number(selectedEmpIdForShift)
    } else {
      if (!selectedTeamIdForShift) return
      payload.team_id = Number(selectedTeamIdForShift)
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/shifts/assign', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to assign shift'))
      }
      showNotification(`Shift assigned to ${shiftAssignType === 'EMPLOYEE' ? 'Staff member' : 'Team'}!`)
      setShowAssignShiftModal(false)
      setSelectedShiftId('')
      setSelectedEmpIdForShift('')
      setSelectedTeamIdForShift('')
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        expected_duration: Number(taskDuration),
        file_ids: taskAttachedFiles.map(f => f.id)
      }
      if (taskDeadline) payload.deadline = new Date(taskDeadline).toISOString()
      
      if (taskAssignType === 'EMPLOYEE' && taskAssignedEmpId) {
        payload.assigned_employee_ids = [Number(taskAssignedEmpId)]
      } else if (taskAssignType === 'TEAM' && taskAssignedTeamId) {
        payload.assigned_team_ids = [Number(taskAssignedTeamId)]
      }

      const res = await fetch('http://127.0.0.1:8000/api/v1/tasks/', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to create task'))
      }
      showNotification('Task created and assigned successfully!')
      setTaskTitle('')
      setTaskDesc('')
      setTaskDeadline('')
      setTaskAssignedEmpId('')
      setTaskAssignedTeamId('')
      setTaskAttachedFiles([])
      setShowCreateTaskModal(false)
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleReviewSubmission = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingSubmission) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/submissions/${reviewingSubmission.id}/review`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          manager_feedback: reviewFeedbackText
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Review submission failed'))
      }
      showNotification(`Submission ${status === 'APPROVED' ? 'Approved' : 'Marked for Revisions'}!`)
      setReviewingSubmission(null)
      setReviewFeedbackText('')
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evalEmpId) return
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/evaluations/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employee_id: Number(evalEmpId),
          performance_score: Number(evalScore),
          period_start: `${evalStart}T00:00:00Z`,
          period_end: `${evalEnd}T23:59:59Z`,
          manager_comments: evalComments
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(extractErrorMessage(err, 'Failed to record evaluation'))
      }
      showNotification('Performance evaluation published successfully!')
      setShowEvalModal(false)
      setEvalComments('')
      setEvalEmpId('')
      loadAll()
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const activeTrackersCount = liveTeamStatus.filter(s => s.is_online).length
  const pendingReviewsCount = submissions.filter(s => s.status === 'PENDING').length
  const inProgressTasksCount = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length

  // Filtered employees for Add Members Modal
  const availableEmployeesForTeam = addingMembersToTeam 
    ? employees.filter(emp => !addingMembersToTeam.members?.some(m => m.id === emp.id))
    : []
  const filteredAvailableEmployees = availableEmployeesForTeam.filter(emp =>
    emp.full_name.toLowerCase().includes(addMemberSearchQuery.toLowerCase()) ||
    emp.user.email.toLowerCase().includes(addMemberSearchQuery.toLowerCase())
  )

  // Filtered employees for Create Team Modal
  const filteredInitialEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    emp.user.email.toLowerCase().includes(teamSearchQuery.toLowerCase())
  )

  // Filtered Live Team Status based on status pill and search
  const filteredLiveStatus = liveTeamStatus.filter(emp => {
    const matchesSearch = emp.employee_name.toLowerCase().includes(liveSearchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(liveSearchQuery.toLowerCase()) ||
      (emp.current_app && emp.current_app.toLowerCase().includes(liveSearchQuery.toLowerCase()))
    
    if (!matchesSearch) return false

    if (liveFilterStatus === 'ACTIVE') return emp.is_online && emp.status !== 'ON_BREAK' && emp.status !== 'IDLE'
    if (liveFilterStatus === 'ON_BREAK') return emp.status === 'ON_BREAK'
    if (liveFilterStatus === 'IDLE') return emp.status === 'IDLE'
    if (liveFilterStatus === 'OFFLINE') return !emp.is_online
    return true
  })

  // Aggregated KPI metrics for Past Shifts
  const totalPastShiftHours = (pastShiftHistory.reduce((acc, s) => acc + s.active_duration_seconds, 0) / 3600).toFixed(1)
  const avgPastFocusScore = pastShiftHistory.length > 0
    ? (pastShiftHistory.reduce((acc, s) => acc + s.focus_score, 0) / pastShiftHistory.length).toFixed(1)
    : '100.0'
  const onTimePastCount = pastShiftHistory.filter(s => s.punctuality_status === 'ON_TIME').length
  const punctualityRate = pastShiftHistory.length > 0
    ? Math.round((onTimePastCount / pastShiftHistory.length) * 100)
    : 100

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-icon">🏢</div>
          <div>
            <div className="brand-title">Manager Workspace</div>
            <div className="brand-subtitle">Team Performance, Shift &amp; Activity Portal</div>
          </div>
        </div>

        <nav className="header-nav">
          <button className={activeTab === 'OVERVIEW' ? 'active' : ''} onClick={() => setActiveTab('OVERVIEW')}>Overview</button>
          <button className={activeTab === 'EMPLOYEES' ? 'active' : ''} onClick={() => setActiveTab('EMPLOYEES')}>Employees ({employees.length})</button>
          <button className={activeTab === 'TEAMS' ? 'active' : ''} onClick={() => setActiveTab('TEAMS')}>Teams ({teams.length})</button>
          <button className={activeTab === 'SHIFTS' ? 'active' : ''} onClick={() => setActiveTab('SHIFTS')}>Shifts ({shifts.length})</button>
          <button className={activeTab === 'TASKS' ? 'active' : ''} onClick={() => setActiveTab('TASKS')}>Tasks ({tasks.length})</button>
          <button className={activeTab === 'SUBMISSIONS' ? 'active' : ''} onClick={() => setActiveTab('SUBMISSIONS')}>
            Reviews {pendingReviewsCount > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 9999, marginLeft: 4 }}>{pendingReviewsCount}</span>}
          </button>
          <button className={activeTab === 'ACTIVITY' ? 'active' : ''} onClick={() => setActiveTab('ACTIVITY')}>Activity &amp; Shifts</button>
          <button className={activeTab === 'EVALUATIONS' ? 'active' : ''} onClick={() => setActiveTab('EVALUATIONS')}>Evaluations</button>
        </nav>

        <div className="header-actions">
          <button onClick={loadAll} className="btn-outline btn-sm" title="Refresh Dashboard Data">
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <button onClick={onLogout} className="btn-secondary btn-sm">Log Out</button>
        </div>
      </header>

      <main>
        {/* TOAST / STATUS MESSAGE */}
        {message && (
          <div 
            style={{ 
              background: messageType === 'error' ? '#fef2f2' : '#e0f2fe', 
              color: messageType === 'error' ? '#991b1b' : '#0369a1', 
              padding: '0.85rem 1.25rem', 
              borderRadius: 'var(--radius)', 
              marginBottom: '1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              border: `1px solid ${messageType === 'error' ? '#fecaca' : '#bae6fd'}` 
            }} 
            className="fade-in"
          >
            <span>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'transparent', border: 'none', color: messageType === 'error' ? '#991b1b' : '#0369a1', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* OVERVIEW STATS BANNER */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-label">Total Staff / Teams</span>
              <span className="stat-value">{employees.length} / {teams.length}</span>
            </div>
            <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>👥</div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-label">Live Active Online</span>
              <span className="stat-value" style={{ color: activeTrackersCount > 0 ? '#10b981' : 'inherit' }}>
                {activeTrackersCount}
              </span>
            </div>
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>🟢</div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-label">Active Tasks</span>
              <span className="stat-value">{inProgressTasksCount}</span>
            </div>
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>📋</div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-label">Pending Reviews</span>
              <span className="stat-value" style={{ color: pendingReviewsCount > 0 ? '#ef4444' : 'inherit' }}>
                {pendingReviewsCount}
              </span>
            </div>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>📥</div>
          </div>
        </div>

        {/* ==================== TAB 0: OVERVIEW ==================== */}
        {activeTab === 'OVERVIEW' && (
          <div className="fade-in">
            <div className="card">
              <div className="card-header-flex">
                <div>
                  <h2>Live Team Presence &amp; Shift Status</h2>
                  <p className="card-desc" style={{ marginBottom: 0 }}>Real-time employee online state, current active applications, and break status.</p>
                </div>
                <button className="btn-outline btn-sm" onClick={() => { setActiveTab('ACTIVITY'); setActivitySubTab('LIVE'); }}>
                  View Full Activity Portal &rarr;
                </button>
              </div>

              {liveTeamStatus.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📡</div>
                  <div className="empty-state-title">No employees registered yet</div>
                  <p>Click "Add Employee" to register team members and begin tracking.</p>
                  <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAddEmpModal(true)}>+ Add First Employee</button>
                </div>
              ) : (
                <div className="presence-grid">
                  {liveTeamStatus.map(emp => (
                    <div key={emp.employee_id} className="presence-card">
                      <div className="presence-card-header">
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div className="user-avatar">{emp.employee_name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.employee_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                          </div>
                        </div>
                        <span className={`status-badge ${emp.is_online ? (emp.status === 'ON_BREAK' ? 'in_progress' : emp.status === 'IDLE' ? 'idle' : 'active') : 'offline'}`}>
                          {emp.is_online && <span className="pulse-dot"></span>}
                          {emp.is_online ? (emp.status === 'ON_BREAK' ? 'On Break ☕' : emp.status === 'IDLE' ? 'Idle' : 'Shift Active') : 'Offline'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                        <div><strong>Active Window:</strong> {emp.window_title || emp.current_app || (emp.is_online ? 'In Application' : 'None')}</div>
                        <div style={{ marginTop: '0.25rem' }}>
                          <strong>Today:</strong> <span style={{ color: '#10b981' }}>{formatSeconds(emp.today_active_seconds)} active</span> &bull; <span style={{ color: '#f59e0b' }}>{formatSeconds(emp.today_idle_seconds)} idle</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-header-flex">
                  <h2>Active Tasks ({tasks.slice(0, 4).length})</h2>
                  <button className="btn-primary btn-sm" onClick={() => setShowCreateTaskModal(true)}>+ New Task</button>
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>No tasks assigned yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tasks.slice(0, 4).map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Priority: {t.priority} {t.assigned_to_name && `• Assigned to: ${t.assigned_to_name}`}
                          </div>
                        </div>
                        <span className={`status-badge ${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-header-flex">
                  <h2>Pending Reviews ({pendingReviewsCount})</h2>
                  <button className="btn-outline btn-sm" onClick={() => setActiveTab('SUBMISSIONS')}>Review All</button>
                </div>
                {submissions.filter(s => s.status === 'PENDING').length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>All deliverables reviewed! No pending submissions.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {submissions.filter(s => s.status === 'PENDING').slice(0, 4).map(sub => (
                      <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{sub.task_title || `Task #${sub.task_id}`}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            By: {sub.employee_name || `Employee #${sub.employee_id}`} &bull; Version #{sub.version}
                          </div>
                        </div>
                        <button className="btn-primary btn-sm" onClick={() => setReviewingSubmission(sub)}>Review</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 1: EMPLOYEES ==================== */}
        {activeTab === 'EMPLOYEES' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Your Team Members ({employees.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Manage staff accounts and view credentials.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddEmpModal(true)}>+ Add New Employee</button>
            </div>

            {employees.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">No employees registered</div>
                <p>Add staff accounts so they can log into the Employee Desktop app.</p>
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAddEmpModal(true)}>+ Add New Employee</button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Account ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const live = liveTeamStatus.find(l => l.employee_id === emp.id)
                      return (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="user-avatar">{emp.full_name.charAt(0)}</div>
                              <span style={{ fontWeight: 600 }}>{emp.full_name}</span>
                            </div>
                          </td>
                          <td>{emp.user.email}</td>
                          <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>EMPLOYEE</span></td>
                          <td>#{emp.id}</td>
                          <td>
                            <span className={`status-badge ${live?.is_online ? (live.status === 'ON_BREAK' ? 'in_progress' : 'active') : 'offline'}`}>
                              {live?.is_online && <span className="pulse-dot"></span>}
                              {live?.is_online ? (live.status === 'ON_BREAK' ? 'On Break ☕' : 'Online') : 'Offline'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 2: TEAMS ==================== */}
        {activeTab === 'TEAMS' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Teams &amp; Workgroups ({teams.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Organize employees into collaborative units to assign shifts and tasks seamlessly.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddTeamModal(true)}>+ Create New Team</button>
            </div>

            {teams.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <div className="empty-state-title">No teams created yet</div>
                <p>Create teams like "Frontend Devs", "Design", or "Support" to distribute work and schedules collectively.</p>
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAddTeamModal(true)}>+ Create First Team</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                {teams.map(t => (
                  <div 
                    key={t.id} 
                    style={{ 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-lg)', 
                      background: '#ffffff', 
                      boxShadow: 'var(--shadow-sm)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border-light)', background: '#fafbfc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ background: '#e0e7ff', color: '#4338ca', width: 36, height: 36, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                            🏢
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>{t.name}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created {new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => setConfirmDeleteTeam(t)} 
                          className="btn-outline btn-sm"
                          style={{ borderColor: '#fecaca', color: '#dc2626', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                          title="Delete Team"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '1.25rem', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Members ({t.members ? t.members.length : 0})
                        </span>
                        <button 
                          onClick={() => { setAddingMembersToTeam(t); setNewMemberIds([]); setAddMemberSearchQuery(''); }} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                        >
                          + Add Staff
                        </button>
                      </div>

                      {t.members && t.members.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {t.members.map(m => (
                            <div 
                              key={m.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '0.5rem 0.75rem', 
                                background: '#f8fafc', 
                                borderRadius: 'var(--radius)', 
                                border: '1px solid var(--border-light)' 
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                  {m.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{m.full_name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.user.email}</div>
                                </div>
                              </div>

                              <button 
                                onClick={() => setConfirmRemoveMember({ teamId: t.id, teamName: t.name, memberId: m.id, memberName: m.full_name })} 
                                style={{ 
                                  background: 'transparent', 
                                  border: '1px solid #fee2e2', 
                                  color: '#dc2626', 
                                  borderRadius: 'var(--radius-sm)', 
                                  padding: '0.2rem 0.5rem', 
                                  fontSize: '0.75rem', 
                                  cursor: 'pointer' 
                                }}
                                title={`Remove ${m.full_name} from ${t.name}`}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                          No members in this team yet.<br />
                          <button 
                            className="btn-outline btn-sm" 
                            style={{ marginTop: '0.5rem' }} 
                            onClick={() => { setAddingMembersToTeam(t); setNewMemberIds([]); setAddMemberSearchQuery(''); }}
                          >
                            + Add First Member
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '0.75rem 1.25rem', background: '#fafbfc', borderTop: '1px solid var(--border-light)' }}>
                      <button 
                        className="btn-outline btn-sm" 
                        style={{ width: '100%', fontWeight: 600 }} 
                        onClick={() => { setAddingMembersToTeam(t); setNewMemberIds([]); setAddMemberSearchQuery(''); }}
                      >
                        + Manage / Add Members
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 3: SHIFTS ==================== */}
        {activeTab === 'SHIFTS' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Work Shifts &amp; Scheduling ({shifts.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Configure shift time templates and assign employees or entire teams to schedules.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-secondary" onClick={() => setShowAssignShiftModal(true)}>Assign Shift to Staff/Team</button>
                <button className="btn-primary" onClick={() => setShowAddShiftModal(true)}>+ Create Shift Template</button>
              </div>
            </div>

            {shifts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⏰</div>
                <div className="empty-state-title">No shifts configured</div>
                <p>Create morning, evening, or standard shift templates with break allowances.</p>
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAddShiftModal(true)}>+ Create Shift Template</button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Shift Name</th>
                      <th>Working Hours</th>
                      <th>Break Allowance</th>
                      <th>Scheduled Days</th>
                      <th>Active Assignments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map(s => (
                      <tr key={s.id}>
                        <td><strong style={{ color: 'var(--primary)' }}>{s.name}</strong></td>
                        <td>{s.start_time} &mdash; {s.end_time}</td>
                        <td><span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>☕ {s.break_duration_minutes || 60} mins</span></td>
                        <td>{Array.isArray(s.working_days) ? 'Mon - Fri' : (s.working_days || 'Mon - Fri')}</td>
                        <td>{s.assignment_count || 0} assigned</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 4: TASKS ==================== */}
        {activeTab === 'TASKS' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Task Management ({tasks.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Assign tasks to individual staff or entire teams, attach brief files, and set deadlines.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowCreateTaskModal(true)}>+ Create New Task</button>
            </div>

            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">No tasks created yet</div>
                <p>Create tasks with instructions and attached specification files for your team.</p>
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowCreateTaskModal(true)}>+ Create New Task</button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task Title &amp; Description</th>
                      <th>Priority</th>
                      <th>Assigned To</th>
                      <th>Attached Files</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => (
                      <tr key={t.id}>
                        <td style={{ maxWidth: '280px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.title}</div>
                          {t.description && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.description}</div>}
                        </td>
                        <td>
                          <span className="status-badge" style={{ 
                            background: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fef3c7' : '#f1f5f9',
                            color: t.priority === 'High' ? '#991b1b' : t.priority === 'Medium' ? '#92400e' : '#334155'
                          }}>
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          {t.assigned_to_name ? (
                            <span style={{ fontWeight: 500 }}>{t.assigned_to_name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          {t.files && t.files.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {t.files.map(f => (
                                <button key={f.id} onClick={() => downloadFile(f.id, f.filename)} className="file-download-btn" title={`Download ${f.filename}`}>
                                  📎 {f.filename} ({formatFileSize(f.size)})
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>
                        <td>{t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline'}</td>
                        <td>
                          <span className={`status-badge ${t.status.toLowerCase()}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 5: SUBMISSIONS ==================== */}
        {activeTab === 'SUBMISSIONS' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Deliverable Review Center ({submissions.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Inspect employee deliverables, download attached files, and approve or request revisions.</p>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📥</div>
                <div className="empty-state-title">No submissions yet</div>
                <p>Deliverables submitted by employees will appear here for your review.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {submissions.map(sub => (
                  <div key={sub.id} style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', background: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                          {sub.task_title || `Task #${sub.task_id}`}
                        </h3>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Submitted by <strong>{sub.employee_name || `Employee #${sub.employee_id}`}</strong> &bull; Version #{sub.version} &bull; {new Date(sub.submitted_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`status-badge ${sub.status.toLowerCase()}`}>
                        {sub.status}
                      </span>
                    </div>

                    <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Employee Deliverable Notes:</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{sub.comment || 'No written notes provided.'}</div>
                    </div>

                    {sub.files && sub.files.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Attached Deliverable Files ({sub.files.length}):</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {sub.files.map(f => (
                            <button key={f.id} onClick={() => downloadFile(f.id, f.filename)} className="file-download-btn" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}>
                              📥 Download {f.filename} ({formatFileSize(f.size)})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {sub.manager_feedback && (
                      <div style={{ marginTop: '1rem', background: '#fef3c7', color: '#92400e', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                        <strong>Your Feedback:</strong> {sub.manager_feedback}
                      </div>
                    )}

                    {sub.status === 'PENDING' && (
                      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <button className="btn-primary" onClick={() => setReviewingSubmission(sub)}>
                          Review &amp; Decide &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 6: ACTIVITY & PAST SHIFTS PORTAL ==================== */}
        {activeTab === 'ACTIVITY' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Activity &amp; Shift Intelligence Portal</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>
                  Real-time live presence telemetry, interaction velocity, and historical shift activity explorer.
                </p>
              </div>

              {/* Sub-tab Navigation Switch */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.3rem', borderRadius: 'var(--radius)', gap: '0.3rem' }}>
                <button 
                  onClick={() => setActivitySubTab('LIVE')}
                  style={{ 
                    border: 'none', 
                    padding: '0.45rem 1rem', 
                    borderRadius: 'var(--radius-sm)', 
                    fontWeight: 600, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    background: activitySubTab === 'LIVE' ? '#ffffff' : 'transparent',
                    color: activitySubTab === 'LIVE' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: activitySubTab === 'LIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  📡 Real-Time Live Presence ({liveTeamStatus.filter(s => s.is_online).length} online)
                </button>
                <button 
                  onClick={() => setActivitySubTab('PAST_SHIFTS')}
                  style={{ 
                    border: 'none', 
                    padding: '0.45rem 1rem', 
                    borderRadius: 'var(--radius-sm)', 
                    fontWeight: 600, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    background: activitySubTab === 'PAST_SHIFTS' ? '#ffffff' : 'transparent',
                    color: activitySubTab === 'PAST_SHIFTS' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: activitySubTab === 'PAST_SHIFTS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  📅 Past Shifts &amp; Historical Activity
                </button>
              </div>
            </div>

            {/* ================= SUB-TAB 1: REAL-TIME LIVE PRESENCE ================= */}
            {activitySubTab === 'LIVE' && (
              <div className="fade-in" style={{ marginTop: '1.25rem' }}>
                {/* Search & Filter Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#fafbfc', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  {/* Status Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setLiveFilterStatus('ALL')} 
                      className={`btn-sm ${liveFilterStatus === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      All ({liveTeamStatus.length})
                    </button>
                    <button 
                      onClick={() => setLiveFilterStatus('ACTIVE')} 
                      className={`btn-sm ${liveFilterStatus === 'ACTIVE' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      🟢 Active ({liveTeamStatus.filter(s => s.is_online && s.status !== 'ON_BREAK' && s.status !== 'IDLE').length})
                    </button>
                    <button 
                      onClick={() => setLiveFilterStatus('ON_BREAK')} 
                      className={`btn-sm ${liveFilterStatus === 'ON_BREAK' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      ☕ On Break ({liveTeamStatus.filter(s => s.status === 'ON_BREAK').length})
                    </button>
                    <button 
                      onClick={() => setLiveFilterStatus('IDLE')} 
                      className={`btn-sm ${liveFilterStatus === 'IDLE' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      🟡 Idle ({liveTeamStatus.filter(s => s.status === 'IDLE').length})
                    </button>
                    <button 
                      onClick={() => setLiveFilterStatus('OFFLINE')} 
                      className={`btn-sm ${liveFilterStatus === 'OFFLINE' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      ⚪ Offline ({liveTeamStatus.filter(s => !s.is_online).length})
                    </button>
                  </div>

                  {/* Search Box */}
                  <div style={{ minWidth: '240px' }}>
                    <input 
                      type="text" 
                      placeholder="🔍 Search staff or active app..." 
                      value={liveSearchQuery} 
                      onChange={e => setLiveSearchQuery(e.target.value)} 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: '100%' }}
                    />
                  </div>
                </div>

                {filteredLiveStatus.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                    <div className="empty-state-icon">📡</div>
                    <div className="empty-state-title">No employees match the selected filter</div>
                    <p>Try switching filter tabs or clearing your search query.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
                    {filteredLiveStatus.map(emp => (
                      <div 
                        key={emp.employee_id} 
                        style={{ 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-lg)', 
                          background: '#ffffff', 
                          boxShadow: 'var(--shadow-sm)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          {/* Card Top */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <div className="user-avatar">{emp.employee_name.charAt(0)}</div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{emp.employee_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                              </div>
                            </div>

                            <span className={`status-badge ${emp.is_online ? (emp.status === 'ON_BREAK' ? 'in_progress' : emp.status === 'IDLE' ? 'idle' : 'active') : 'offline'}`}>
                              {emp.is_online && <span className="pulse-dot"></span>}
                              {emp.is_online ? (emp.status === 'ON_BREAK' ? 'On Break ☕' : emp.status === 'IDLE' ? 'Idle' : 'Shift Active') : 'Offline'}
                            </span>
                          </div>

                          {/* Velocity & Focus Indicators */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.85rem 0' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: 9999, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                              🎯 {emp.focus_score_today || 100}% Focus Rating
                            </span>

                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.2rem 0.55rem', 
                              borderRadius: 9999, 
                              background: emp.activity_intensity === 'HIGH' ? '#fef2f2' : emp.activity_intensity === 'MODERATE' ? '#eff6ff' : emp.activity_intensity === 'ON_BREAK' ? '#fef3c7' : '#f1f5f9',
                              color: emp.activity_intensity === 'HIGH' ? '#991b1b' : emp.activity_intensity === 'MODERATE' ? '#1d4ed8' : emp.activity_intensity === 'ON_BREAK' ? '#92400e' : '#475569',
                              border: '1px solid var(--border-light)',
                              fontWeight: 600 
                            }}>
                              {emp.activity_intensity === 'HIGH' && '🔥 High Velocity'}
                              {emp.activity_intensity === 'MODERATE' && '⚡ Active Velocity'}
                              {emp.activity_intensity === 'STEADY' && '🧘 Steady Work'}
                              {emp.activity_intensity === 'ON_BREAK' && '☕ On Break'}
                              {emp.activity_intensity === 'IDLE' && '💤 Idle State'}
                              {emp.activity_intensity === 'OFFLINE' && '⚪ Offline'}
                            </span>

                            {emp.app_category && emp.app_category !== 'General' && (
                              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: 9999, background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', fontWeight: 500 }}>
                                🏷️ {emp.app_category}
                              </span>
                            )}
                          </div>

                          {/* Active Window / Application */}
                          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', fontSize: '0.8125rem' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Current Application Window:</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {emp.window_title || emp.current_app || (emp.is_online ? 'Desktop Active' : 'None (Offline)')}
                            </div>
                          </div>

                          {/* Shift Progress (if assigned) */}
                          {emp.assigned_shift_name && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                <span>Shift: <strong>{emp.assigned_shift_name}</strong></span>
                                <span>{emp.shift_progress_percent}% of shift</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                                <div style={{ width: `${emp.shift_progress_percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 9999, transition: 'width 0.3s ease' }}></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Stats */}
                        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                          <div>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{formatSeconds(emp.today_active_seconds)}</span>
                            <span style={{ color: 'var(--text-muted)' }}> active</span>
                            <span style={{ margin: '0 0.3rem', color: '#cbd5e1' }}>&bull;</span>
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{formatSeconds(emp.today_idle_seconds)}</span>
                            <span style={{ color: 'var(--text-muted)' }}> idle</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            🖱️ {emp.mouse_clicks_today || 0} / ⌨️ {emp.keystrokes_today || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= SUB-TAB 2: PAST SHIFTS & HISTORICAL ACTIVITY ================= */}
            {activitySubTab === 'PAST_SHIFTS' && (
              <div className="fade-in" style={{ marginTop: '1.25rem' }}>
                {/* Historical Filter Bar */}
                <div style={{ background: '#fafbfc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Filter by Employee</label>
                      <select 
                        value={pastShiftEmpId} 
                        onChange={e => setPastShiftEmpId(e.target.value ? Number(e.target.value) : '')}
                        style={{ width: '100%' }}
                      >
                        <option value="">All Team Members</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.user.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label>From Date</label>
                      <input 
                        type="date" 
                        value={pastShiftStartDate} 
                        onChange={e => setPastShiftStartDate(e.target.value)} 
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label>To Date</label>
                      <input 
                        type="date" 
                        value={pastShiftEndDate} 
                        onChange={e => setPastShiftEndDate(e.target.value)} 
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <button 
                        onClick={fetchPastShifts} 
                        className="btn-primary" 
                        style={{ width: '100%', padding: '0.65rem 1rem' }}
                        disabled={pastShiftLoading}
                      >
                        {pastShiftLoading ? 'Searching...' : '🔍 Filter Past Shifts'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aggregate Historical KPIs */}
                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-info">
                      <span className="stat-label">Shift Days Logged</span>
                      <span className="stat-value" style={{ fontSize: '1.5rem' }}>{pastShiftHistory.length}</span>
                    </div>
                    <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5', width: 42, height: 42 }}>📅</div>
                  </div>

                  <div className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-info">
                      <span className="stat-label">Total Productive Hours</span>
                      <span className="stat-value" style={{ fontSize: '1.5rem', color: '#10b981' }}>{totalPastShiftHours} hrs</span>
                    </div>
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a', width: 42, height: 42 }}>⏱️</div>
                  </div>

                  <div className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-info">
                      <span className="stat-label">Avg Focus Rating</span>
                      <span className="stat-value" style={{ fontSize: '1.5rem', color: '#3b82f6' }}>{avgPastFocusScore}%</span>
                    </div>
                    <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb', width: 42, height: 42 }}>🎯</div>
                  </div>

                  <div className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-info">
                      <span className="stat-label">On-Time Punctuality</span>
                      <span className="stat-value" style={{ fontSize: '1.5rem', color: punctualityRate >= 90 ? '#10b981' : '#f59e0b' }}>{punctualityRate}%</span>
                    </div>
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706', width: 42, height: 42 }}>⏰</div>
                  </div>
                </div>

                {/* Past Shift Session Cards */}
                {pastShiftLoading ? (
                  <div className="empty-state" style={{ padding: '3rem' }}>
                    <div className="empty-state-icon">⏳</div>
                    <div className="empty-state-title">Loading historical shift telemetry...</div>
                  </div>
                ) : pastShiftHistory.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem' }}>
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-title">No past shift activity records found</div>
                    <p>No activity was recorded for the selected employee and date window.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {pastShiftHistory.map(session => (
                      <div 
                        key={session.id} 
                        style={{ 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-lg)', 
                          background: '#ffffff', 
                          boxShadow: 'var(--shadow-sm)',
                          padding: '1.5rem'
                        }}
                      >
                        {/* Session Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem' }}>
                                {session.employee_name.charAt(0)}
                              </div>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>{session.employee_name}</h3>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                  {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} &bull; Shift: <strong>{session.shift_name}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className={`status-badge ${session.punctuality_status === 'ON_TIME' ? 'approved' : session.punctuality_status === 'LATE' ? 'rejected' : 'in_progress'}`} style={{ fontSize: '0.8rem' }}>
                              {session.punctuality_status === 'ON_TIME' && '✓ On-Time Clock-in'}
                              {session.punctuality_status === 'LATE' && '⚠️ Late Clock-in'}
                              {session.punctuality_status === 'OVERTIME' && '🔵 Overtime Session'}
                              {session.punctuality_status === 'EARLY_DEPARTURE' && '⚡ Early Departure'}
                            </span>

                            {session.is_ongoing && (
                              <span className="status-badge active" style={{ fontSize: '0.8rem' }}>
                                <span className="pulse-dot"></span> In Progress
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Session Primary KPIs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', margin: '1.25rem 0', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clock-In / Out</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                              {session.clock_in_time} &mdash; {session.clock_out_time || 'Ongoing'}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Work Time</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#10b981', marginTop: '0.2rem' }}>
                              {formatSeconds(session.active_duration_seconds)}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Break / Idle Time</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f59e0b', marginTop: '0.2rem' }}>
                              {formatSeconds(session.break_duration_seconds)}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Focus Score</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2563eb', marginTop: '0.2rem' }}>
                              ★ {session.focus_score}%
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Inputs</div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                              🖱️ {session.mouse_event_count} / ⌨️ {session.keyboard_event_count}
                            </div>
                          </div>
                        </div>

                        {/* Top Applications Breakdown */}
                        {session.top_applications && session.top_applications.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                              Top Applications Used in this Shift:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {session.top_applications.map((app, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                                  <div style={{ minWidth: '160px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {app.app_name}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                                    {app.category}
                                  </span>
                                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                                    <div style={{ width: `${app.percentage}%`, height: '100%', background: idx === 0 ? 'var(--primary)' : idx === 1 ? '#3b82f6' : '#60a5fa', borderRadius: 9999 }}></div>
                                  </div>
                                  <div style={{ minWidth: '90px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    {formatSeconds(app.duration_seconds)} ({app.percentage}%)
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hourly Timeline Heat-Bar */}
                        {session.timeline && session.timeline.length > 0 && (
                          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem' }}>
                              Hourly Activity Flow:
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                              {session.timeline.map((tb, idx) => {
                                const totalHour = tb.active_seconds + tb.idle_seconds || 1
                                const activePct = Math.round((tb.active_seconds / totalHour) * 100)
                                return (
                                  <div key={idx} style={{ textAlign: 'center', minWidth: '50px' }} title={`${tb.time_label}: ${formatSeconds(tb.active_seconds)} active, ${formatSeconds(tb.idle_seconds)} idle`}>
                                    <div style={{ height: '36px', background: '#f1f5f9', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden' }}>
                                      <div style={{ height: `${activePct}%`, background: activePct > 70 ? '#10b981' : activePct > 30 ? '#3b82f6' : '#f59e0b', borderRadius: '0 0 4px 4px' }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tb.time_label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 7: EVALUATIONS ==================== */}
        {activeTab === 'EVALUATIONS' && (
          <section className="card fade-in">
            <div className="card-header-flex">
              <div>
                <h2>Performance Evaluations ({evaluations.length})</h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>Review performance scores and published employee evaluations.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowEvalModal(true)}>+ Publish Evaluation</button>
            </div>

            {evaluations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⭐</div>
                <div className="empty-state-title">No evaluations recorded yet</div>
                <p>Publish performance scores and constructive feedback for your team members.</p>
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowEvalModal(true)}>+ Publish Evaluation</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {evaluations.map(ev => {
                  const emp = employees.find(e => e.id === ev.employee_id)
                  return (
                    <div key={ev.id} style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', background: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{emp ? emp.full_name : `Employee #${ev.employee_id}`}</h3>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Period: {new Date(ev.period_start).toLocaleDateString()} &mdash; {new Date(ev.period_end).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="status-badge approved" style={{ fontSize: '1rem', padding: '0.4rem 0.9rem' }}>
                          ★ {ev.performance_score} / 5.0
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Manager Comments:</div>
                        <div style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>"{ev.manager_comments || 'No written comments provided.'}"</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ==================== MODALS ==================== */}

      {/* MODAL 1: ADD EMPLOYEE */}
      {showAddEmpModal && (
        <div className="modal-backdrop" onClick={() => setShowAddEmpModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Employee</h3>
              <button className="modal-close-btn" onClick={() => setShowAddEmpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="Sarah Connor" value={empName} onChange={e => setEmpName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="sarah@company.com" value={empEmail} onChange={e => setEmpEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input type="password" placeholder="Min 6 characters" value={empPassword} onChange={e => setEmpPassword(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE TEAM WITH SEARCHABLE MEMBER PICKER */}
      {showAddTeamModal && (
        <div className="modal-backdrop" onClick={() => setShowAddTeamModal(false)}>
          <div className="modal-card" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Team / Workgroup</h3>
              <button className="modal-close-btn" onClick={() => setShowAddTeamModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Team Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Frontend Engineering, Customer Support" 
                    value={teamName} 
                    onChange={e => setTeamName(e.target.value)} 
                    required 
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ margin: 0 }}>Select Team Members ({selectedInitialMembers.length} selected)</label>
                    {employees.length > 0 && (
                      <button 
                        type="button" 
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => {
                          if (selectedInitialMembers.length === employees.length) setSelectedInitialMembers([])
                          else setSelectedInitialMembers(employees.map(e => e.id))
                        }}
                      >
                        {selectedInitialMembers.length === employees.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {employees.length > 5 && (
                    <input 
                      type="text" 
                      placeholder="🔍 Search employees..." 
                      value={teamSearchQuery} 
                      onChange={e => setTeamSearchQuery(e.target.value)} 
                      style={{ marginBottom: '0.5rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                    />
                  )}

                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem', background: '#fafbfc' }}>
                    {filteredInitialEmployees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {employees.length === 0 ? 'No employees registered yet.' : 'No matching employees found.'}
                      </div>
                    ) : (
                      filteredInitialEmployees.map(emp => {
                        const isSelected = selectedInitialMembers.includes(emp.id)
                        return (
                          <div 
                            key={emp.id} 
                            onClick={() => {
                              if (isSelected) setSelectedInitialMembers(selectedInitialMembers.filter(id => id !== emp.id))
                              else setSelectedInitialMembers([...selectedInitialMembers, emp.id])
                            }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '0.5rem 0.75rem', 
                              margin: '0.25rem 0',
                              borderRadius: 'var(--radius-sm)',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              border: `1px solid ${isSelected ? '#bfdbfe' : 'var(--border-light)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                {emp.full_name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#1d4ed8' : 'var(--text-main)' }}>{emp.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.user.email}</div>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => {}} 
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddTeamModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={!teamName.trim()}>Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2.1: ADD MEMBERS TO TEAM (BEAUTIFIED) */}
      {addingMembersToTeam && (
        <div className="modal-backdrop" onClick={() => setAddingMembersToTeam(null)}>
          <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Members to "{addingMembersToTeam.name}"</h3>
              <button className="modal-close-btn" onClick={() => setAddingMembersToTeam(null)}>✕</button>
            </div>
            <form onSubmit={handleAddMembersToTeam}>
              <div className="modal-body">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ margin: 0 }}>Select Employees to Add ({newMemberIds.length} selected)</label>
                    {availableEmployeesForTeam.length > 0 && (
                      <button 
                        type="button" 
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => {
                          if (newMemberIds.length === availableEmployeesForTeam.length) setNewMemberIds([])
                          else setNewMemberIds(availableEmployeesForTeam.map(e => e.id))
                        }}
                      >
                        {newMemberIds.length === availableEmployeesForTeam.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {availableEmployeesForTeam.length > 3 && (
                    <input 
                      type="text" 
                      placeholder="🔍 Filter available staff..." 
                      value={addMemberSearchQuery} 
                      onChange={e => setAddMemberSearchQuery(e.target.value)} 
                      style={{ marginBottom: '0.5rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                    />
                  )}

                  <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem', background: '#fafbfc' }}>
                    {availableEmployeesForTeam.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        ✨ All registered employees are already members of this team!
                      </div>
                    ) : filteredAvailableEmployees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No matching staff found for "{addMemberSearchQuery}".
                      </div>
                    ) : (
                      filteredAvailableEmployees.map(emp => {
                        const isSelected = newMemberIds.includes(emp.id)
                        return (
                          <div 
                            key={emp.id} 
                            onClick={() => {
                              if (isSelected) setNewMemberIds(newMemberIds.filter(id => id !== emp.id))
                              else setNewMemberIds([...newMemberIds, emp.id])
                            }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '0.6rem 0.75rem', 
                              margin: '0.3rem 0',
                              borderRadius: 'var(--radius-sm)',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              border: `1px solid ${isSelected ? '#93c5fd' : 'var(--border-light)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>
                                {emp.full_name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#1d4ed8' : 'var(--text-main)' }}>{emp.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.user.email}</div>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => {}} 
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setAddingMembersToTeam(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={newMemberIds.length === 0}>
                  Add {newMemberIds.length > 0 ? `(${newMemberIds.length}) ` : ''}Members
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2.2: CONFIRM REMOVE MEMBER WARNING */}
      {confirmRemoveMember && (
        <div className="modal-backdrop" onClick={() => setConfirmRemoveMember(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Remove Team Member</h3>
              <button className="modal-close-btn" onClick={() => setConfirmRemoveMember(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong>{confirmRemoveMember.memberName}</strong> from team <strong>"{confirmRemoveMember.teamName}"</strong>?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                They will no longer receive team-assigned tasks or schedules for this team.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmRemoveMember(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmRemoveMember}>Remove Member</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.3: CONFIRM DELETE TEAM WARNING */}
      {confirmDeleteTeam && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteTeam(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑 Delete Team</h3>
              <button className="modal-close-btn" onClick={() => setConfirmDeleteTeam(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Are you sure you want to delete the team <strong>"{confirmDeleteTeam.name}"</strong>?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                This will unbind {confirmDeleteTeam.members?.length || 0} employees from this group. Individual employee accounts are not deleted.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDeleteTeam(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmDeleteTeam}>Delete Team</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE SHIFT TEMPLATE */}
      {showAddShiftModal && (
        <div className="modal-backdrop" onClick={() => setShowAddShiftModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Shift Template</h3>
              <button className="modal-close-btn" onClick={() => setShowAddShiftModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateShift}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Shift Template Name</label>
                  <input type="text" placeholder="e.g. Standard Morning (09:00 - 17:00)" value={shiftName} onChange={e => setShiftName(e.target.value)} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Allotted Break Duration</label>
                    <select value={shiftBreakMins} onChange={e => setShiftBreakMins(Number(e.target.value))}>
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1 Hour)</option>
                      <option value={90}>90 Minutes</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Scheduled Days</label>
                    <input type="text" placeholder="Mon - Fri" value={shiftDays} onChange={e => setShiftDays(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddShiftModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Shift Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN SHIFT */}
      {showAssignShiftModal && (
        <div className="modal-backdrop" onClick={() => setShowAssignShiftModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Shift Schedule</h3>
              <button className="modal-close-btn" onClick={() => setShowAssignShiftModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignShift}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Shift Template</label>
                  <select value={selectedShiftId} onChange={e => setSelectedShiftId(e.target.value ? Number(e.target.value) : '')} required>
                    <option value="">Select a shift...</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time}, Break: {s.break_duration_minutes || 60}m)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assign To:</label>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <input type="radio" name="assignTarget" checked={shiftAssignType === 'EMPLOYEE'} onChange={() => setShiftAssignType('EMPLOYEE')} />
                      <span>Individual Employee</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <input type="radio" name="assignTarget" checked={shiftAssignType === 'TEAM'} onChange={() => setShiftAssignType('TEAM')} />
                      <span>Entire Team</span>
                    </label>
                  </div>

                  {shiftAssignType === 'EMPLOYEE' ? (
                    <select value={selectedEmpIdForShift} onChange={e => setSelectedEmpIdForShift(e.target.value ? Number(e.target.value) : '')} required>
                      <option value="">Select staff member...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.user.email})</option>
                      ))}
                    </select>
                  ) : (
                    <select value={selectedTeamIdForShift} onChange={e => setSelectedTeamIdForShift(e.target.value ? Number(e.target.value) : '')} required>
                      <option value="">Select team...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.members?.length || 0} members)</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignShiftModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Assign Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE TASK WITH TEAM/STAFF ASSIGNMENT & ATTACHMENTS */}
      {showCreateTaskModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateTaskModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create &amp; Assign Task</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateTaskModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Task Title</label>
                  <input type="text" placeholder="Implement Authentication API" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Task Instructions &amp; Description</label>
                  <textarea rows={3} placeholder="Detailed instructions for the employee or team..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assignment Target</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="radio" name="taskTarget" checked={taskAssignType === 'EMPLOYEE'} onChange={() => setTaskAssignType('EMPLOYEE')} />
                        <span>Staff</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="radio" name="taskTarget" checked={taskAssignType === 'TEAM'} onChange={() => setTaskAssignType('TEAM')} />
                        <span>Team</span>
                      </label>
                    </div>

                    {taskAssignType === 'EMPLOYEE' ? (
                      <select value={taskAssignedEmpId} onChange={e => setTaskAssignedEmpId(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">Select employee...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <select value={taskAssignedTeamId} onChange={e => setTaskAssignedTeamId(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">Select team...</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.members?.length || 0} members)</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Deadline (Optional)</label>
                    <input type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Expected Duration (Minutes)</label>
                    <input type="number" min="15" step="15" value={taskDuration} onChange={e => setTaskDuration(Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Attach Specification / Reference Files</label>
                  <div className="file-dropzone">
                    <input type="file" id="task-file-input" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploadingFile} />
                    <label htmlFor="task-file-input" style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📁</div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {uploadingFile ? 'Uploading file...' : '+ Click to attach file (PDF, Doc, Image, Zip)'}
                      </div>
                    </label>
                  </div>

                  {taskAttachedFiles.length > 0 && (
                    <div className="file-chip-container">
                      {taskAttachedFiles.map(f => (
                        <span key={f.id} className="file-chip">
                          📎 {f.filename} ({formatFileSize(f.size)})
                          <span className="file-chip-remove" onClick={() => setTaskAttachedFiles(prev => prev.filter(x => x.id !== f.id))}>✕</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={uploadingFile}>Create &amp; Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: REVIEW SUBMISSION */}
      {reviewingSubmission && (
        <div className="modal-backdrop" onClick={() => setReviewingSubmission(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Review Deliverable</h3>
              <button className="modal-close-btn" onClick={() => setReviewingSubmission(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Task:</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{reviewingSubmission.task_title || `Task #${reviewingSubmission.task_id}`}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Submitted by <strong>{reviewingSubmission.employee_name || `Employee #${reviewingSubmission.employee_id}`}</strong> &bull; Version #{reviewingSubmission.version}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Employee Notes:</div>
                <div style={{ fontSize: '0.9rem' }}>{reviewingSubmission.comment || 'No notes provided.'}</div>
              </div>

              {reviewingSubmission.files && reviewingSubmission.files.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Attached Deliverable Files:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {reviewingSubmission.files.map(f => (
                      <button key={f.id} onClick={() => downloadFile(f.id, f.filename)} className="file-download-btn">
                        📥 Download {f.filename} ({formatFileSize(f.size)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label>Manager Feedback &amp; Comments (Optional)</label>
                <textarea rows={3} placeholder="Provide praise or specific revisions required..." value={reviewFeedbackText} onChange={e => setReviewFeedbackText(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setReviewingSubmission(null)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={() => handleReviewSubmission('REJECTED')}>✕ Request Revisions</button>
              <button type="button" className="btn-success" onClick={() => handleReviewSubmission('APPROVED')}>✓ Approve Deliverable</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: PERFORMANCE EVALUATION */}
      {showEvalModal && (
        <div className="modal-backdrop" onClick={() => setShowEvalModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Publish Performance Evaluation</h3>
              <button className="modal-close-btn" onClick={() => setShowEvalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitEvaluation}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Employee</label>
                  <select value={evalEmpId} onChange={e => setEvalEmpId(e.target.value ? Number(e.target.value) : '')} required>
                    <option value="">Select staff member...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.user.email})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Performance Rating Score: <strong>{evalScore} / 5.0</strong></label>
                  <input type="range" min="1.0" max="5.0" step="0.1" value={evalScore} onChange={e => setEvalScore(Number(e.target.value))} style={{ width: '100%', margin: '0.5rem 0' }} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Period Start Date</label>
                    <input type="date" value={evalStart} onChange={e => setEvalStart(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Period End Date</label>
                    <input type="date" value={evalEnd} onChange={e => setEvalEnd(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Manager Written Feedback &amp; Review</label>
                  <textarea rows={3} placeholder="Comprehensive evaluation comments..." value={evalComments} onChange={e => setEvalComments(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEvalModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Publish Evaluation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
