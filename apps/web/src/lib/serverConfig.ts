export const LOCAL_SERVER_URL = 'http://localhost:8787'

export function getDefaultServerUrl() {
  if (typeof window === 'undefined') return LOCAL_SERVER_URL

  const { hostname, protocol, port, origin } = window.location
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return LOCAL_SERVER_URL
  }

  const scheme = protocol === 'https:' ? 'https' : 'http'
  if (port && port !== '80' && port !== '443' && port !== '8787') {
    return `${scheme}://${hostname}:8787`
  }

  if (origin) return origin

  return `${scheme}://${hostname}:8787`
}
