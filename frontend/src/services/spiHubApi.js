import apiClient from './apiClient'

export async function getDashboardSummary() {
  const { data } = await apiClient.get('/dashboard/summary')
  return data.data
}

export async function getPrograms(year) {
  const { data } = await apiClient.get('/programs', {
    params: year ? { year } : {},
  })
  return data.data
}

export async function createProgram(payload) {
  const { data } = await apiClient.post('/programs', payload)
  return data.data
}

export async function updateProgram(id, payload) {
  const { data } = await apiClient.put(`/programs/${id}`, payload)
  return data.data
}

export async function deleteProgram(id) {
  const { data } = await apiClient.delete(`/programs/${id}`)
  return data.data
}

export async function getWorkList(year) {
  const { data } = await apiClient.get('/worklist', {
    params: year ? { year } : {},
  })
  return data.data
}

export async function createWorkItem(payload) {
  const { data } = await apiClient.post('/worklist', payload)
  return data.data
}

export async function updateWorkItem(id, payload) {
  const { data } = await apiClient.put(`/worklist/${id}`, payload)
  return data.data
}

export async function deleteWorkItem(id) {
  const { data } = await apiClient.delete(`/worklist/${id}`)
  return data.data
}

export async function updateWorkItemProgress(id, payload) {
  const { data } = await apiClient.put(`/worklist/${id}/progress`, payload)
  return data.data
}

export async function getAuditCalendar() {
  const { data } = await apiClient.get('/audit-plan/calendar')
  return data.data
}

export async function getAuditPlans(year, month) {
  const { data } = await apiClient.get('/audit-plans', {
    params: {
      ...(year ? { year } : {}),
      ...(month ? { month } : {}),
    },
  })
  return data.data
}

export async function createAuditPlan(payload) {
  const { data } = await apiClient.post('/audit-plans', payload)
  return data.data
}

export async function updateAuditPlan(id, payload) {
  const { data } = await apiClient.put(`/audit-plans/${id}`, payload)
  return data.data
}

export async function deleteAuditPlan(id) {
  const { data } = await apiClient.delete(`/audit-plans/${id}`)
  return data.data
}

export async function getChatRoom() {
  const { data } = await apiClient.get('/chat')
  return data.data
}

export async function getChatMessages(params = {}) {
  const { data } = await apiClient.get('/chat', { params })
  return data.data
}

export async function sendChatMessage(payload) {
  const { data } = await apiClient.post('/chat', payload)
  return data.data
}

export async function getUsers() {
  const { data } = await apiClient.get('/users')
  return data.data
}

export async function createUser(payload) {
  const { data } = await apiClient.post('/users', payload)
  return data.data
}

export async function updateUser(id, payload) {
  const { data } = await apiClient.put(`/users/${id}`, payload)
  return data.data
}

export async function deleteUser(id) {
  const { data } = await apiClient.delete(`/users/${id}`)
  return data.data
}

export async function resetUserPassword(id, payload) {
  const { data } = await apiClient.put(`/users/${id}/reset-password`, payload)
  return data.data
}

export async function getModuleInfo(path) {
  const { data } = await apiClient.get(path)
  return data.data
}

export async function login(username, password) {
  const { data } = await apiClient.post('/auth/login', { username, password })
  return data.data
}

export async function changePassword(payload) {
  const { data } = await apiClient.post('/auth/change-password', payload)
  return data
}
