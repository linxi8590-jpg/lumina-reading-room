export const LOCAL_SERVER_URL = 'http://localhost:8787'

export function getDefaultServerUrl() {
  if (typeof window === 'undefined') return LOCAL_SERVER_URL

  const { hostname, protocol } = window.location
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return LOCAL_SERVER_URL
  }

  const scheme = protocol === 'https:' ? 'https' : 'http'
  return `${scheme}://${hostname}:8787`
}
