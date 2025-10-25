const BASE_URL = process.env.PLASMO_PUBLIC_API_BASE_URL!
import { type EnrichUrlRequest, type ExtensionRequestResponseDto } from "~types/request"
import { getStoredToken } from './get-token'
import { beApiUrl } from "~lib/constants"


type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  signal?: AbortSignal
  credentials?: RequestCredentials
  headers?: Record<string, string>
  // When false, do not attach Authorization header even if a token exists
  includeAuthHeader?: boolean
}



export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  // Respect caller preference about including the Authorization header
  const shouldIncludeAuth = opts.includeAuthHeader !== false
  const token = shouldIncludeAuth ? (await getStoredToken() || '') : ''

  try {
  const url = /^https?:\/\//.test(path) ? path : `${BASE_URL}${path}`
  const headers = {
    "Content-Type": "application/json",
    ...(shouldIncludeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers ?? {})
  }
    
  const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal ?? controller.signal,
      // set to "include" only if your backend uses cookies for auth
      credentials: opts.credentials ?? "omit"
    })

    const isJson = res.headers.get("content-type")?.includes("application/json")
    const data = isJson ? await res.json() : await res.text()

    if (!res.ok) {
      throw new Error(typeof data === "string" ? data : data?.message ?? `HTTP ${res.status}`)
    }
    return data as T
  } finally {
    clearTimeout(timeout)
  }
}

// Typed helpers for extension enrichment endpoints
export function createExtensionRequest(body: EnrichUrlRequest) {
  // Enrichment now expects actor (user) and organization context
  return apiFetch<ExtensionRequestResponseDto>(beApiUrl, {
    method: "POST",
    body,
    includeAuthHeader: false
  })
}