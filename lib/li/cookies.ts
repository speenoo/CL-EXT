

export type JSessionCookie = {
  name: string
  value: string
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: chrome.cookies.SameSiteStatus
  expirationDate?: number
}

let cachedCookieFetch: Promise<{ jsessions: string[]; liats: string[] }> | null = null

function requestAllCookiesViaBackground(): Promise<{ jsessions: string[]; liats: string[] }> {
  if (cachedCookieFetch) return cachedCookieFetch
  cachedCookieFetch = new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'CL_GET_COOKIES' }, (resp) => {
        if (!resp || resp.ok === false) {
          resolve({ jsessions: [], liats: [] })
          return
        }
        resolve({ jsessions: resp.jsessions || [], liats: resp.liats || [] })
      })
    } catch (e) {
      resolve({ jsessions: [], liats: [] })
    }
  })
  return cachedCookieFetch
}

function promisifyGetAll(details: chrome.cookies.GetAllDetails): Promise<chrome.cookies.Cookie[]> {
  return new Promise((resolve, reject) => {
    try {
      chrome.cookies.getAll(details, (cookies) => {
        const err = chrome.runtime.lastError
        if (err) return reject(new Error(err.message))
        resolve(cookies || [])
      })
    } catch (e) {
      reject(e)
    }
  })
}

export async function getCookiesByName(name: string): Promise<chrome.cookies.Cookie[]> {
  // In content scripts, chrome.cookies API is not available. Fallback to background bridge.
  if (typeof chrome === 'undefined' || !chrome.cookies) {
    const all = await requestAllCookiesViaBackground()
    const values = name === 'JSESSIONID' ? all.jsessions : name === 'li_at' ? all.liats : []
    // Return synthetic cookie objects with just name/value for compatibility.
    return values.map((v) => ({ name, value: v } as chrome.cookies.Cookie))
  }
  return promisifyGetAll({ name })
}

export async function getJSessionIdCookies(): Promise<chrome.cookies.Cookie[]> {
  return getCookiesByName("JSESSIONID")
}

export async function getJSessionIdValues(): Promise<string[]> {
  try {
    const list = await getJSessionIdCookies()
    const vals = list.map((c) => c.value)
    return vals
  } catch (e: any) {
    return []
  }
}

export async function getLiAtCookies(): Promise<chrome.cookies.Cookie[]> {
  return getCookiesByName("li_at")
}

export async function getLiAtValues(): Promise<string[]> {
  try {
    const list = await getLiAtCookies()
    const vals = list.map((c) => c.value)
    return vals
  } catch (e: any) {
    return []
  }
}

export function toJSessionCookie(c: chrome.cookies.Cookie): JSessionCookie {
  return {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate
  }
}

// Aggregated helpers
export type LinkedInAuthCookies = {
  liAtTokens: string[]
  jsessionIds: string[]
}

export async function getLinkedInAuthCookies(): Promise<LinkedInAuthCookies> {
  const [liAtTokens, jsessionIds] = await Promise.all([
    getLiAtValues(),
    getJSessionIdValues()
  ])
  return { liAtTokens, jsessionIds }
}

export function buildCookieHeader(auth: LinkedInAuthCookies): string | null {
  const parts: string[] = []
  if (auth.liAtTokens[0]) parts.push(`li_at=${auth.liAtTokens[0]}`)
  if (auth.jsessionIds[0]) parts.push(`JSESSIONID=${auth.jsessionIds[0]}`)
  return parts.length ? parts.join('; ') : null
}
