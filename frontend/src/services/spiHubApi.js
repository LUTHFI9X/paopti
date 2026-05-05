import apiClient from './apiClient'

export async function getDashboardSummary() {
  const { data } = await apiClient.get('/dashboard/summary')
  return data.data
}

export async function getAuditCalendar() {
  const { data } = await apiClient.get('/audit-plan/calendar')
  return data.data
}

export async function getChatRoom() {
  const { data } = await apiClient.get('/chat')
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
