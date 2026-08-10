import axios from 'axios'

/** Shared Axios client; credentials keeps the authenticated session cookie. */
export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})
