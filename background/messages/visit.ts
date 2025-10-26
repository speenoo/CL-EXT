import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { fetchWithCredentials, handleResponse, createErrorResponse } from "~lib/background"
import { baseApiUrl } from "~lib/constants"

// Background message to force recording a visit for a given URL (called from popup)
// Body: { url, organizationId, actorId, accountId, type? }
function normalizeLinkedInProfileUrl(raw?: string): string | undefined {
  if (!raw) return undefined
  try {
    const u = new URL(raw)
    if (!/^(?:www\.)?linkedin\.com$/i.test(u.hostname) || !/^\/in\//.test(u.pathname)) {
      return raw
    }
    u.hash = ""
    u.search = ""
    u.pathname = u.pathname.replace(/\/+$/, "")
    return `${u.origin}${u.pathname}`
  } catch {
    return raw
  }
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = (req?.body || {}) as Record<string, any>
  const { url: rawUrl, organizationId, actorId, accountId, type } = body
  const url = normalizeLinkedInProfileUrl(rawUrl)
  if (!url) return res.send({ status: { ok: false, error: 'url is required' } })
  if (!organizationId) return res.send({ status: { ok: false, error: 'organizationId is required' } })
  if (!actorId) return res.send({ status: { ok: false, error: 'actorId is required' } })

  // Read cookies from chrome API
  const getAll = (details: chrome.cookies.GetAllDetails) =>
    new Promise<chrome.cookies.Cookie[]>((resolve) => {
      try {
        chrome.cookies.getAll(details, (cookies) => resolve(cookies || []))
      } catch {
        resolve([])
      }
    })

  try {
    const storage = new Storage()
    // Try to nudge the content script to cache a scrape for this URL first
    try {
      const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) =>
        chrome.tabs.query({ url: `${url}*` }, (t) => resolve(t || []))
      )
      if (tabs && tabs[0]?.id) {
        await new Promise<void>((resolve) => {
          chrome.tabs.sendMessage(
            tabs[0].id!,
            { type: 'CL_SCRAPE_PROFILE', debug: false },
            () => resolve()
          )
        })
      }
    } catch {}
    // 1) If we already have a visit id for this URL, return it instead of posting again
    const existing = await storage.get<string>(`pageVisit:${url}`)
    if (existing) {
      return res.send({ status: { ok: true }, data: { success: true, pageVisitId: existing } })
    }

    // 2) Basic in-flight lock (storage-based) to avoid races with background auto recorder
    const lockKey = `visitLock:${url}`
    const now = Date.now()
    const lock = await storage.get<number>(lockKey)
    if (lock && now - lock < 8000) {
      // Another caller is currently recording this URL; treat as success to prevent duplicate posts
      return res.send({ status: { ok: true }, data: { success: true, inFlight: true } })
    }
    await storage.set(lockKey, now)

    const [jsessions, liats] = await Promise.all([
      getAll({ name: 'JSESSIONID' }),
      getAll({ name: 'li_at' })
    ])

    const liAt = liats?.[0]?.value || undefined
    const jsession = jsessions?.[0]?.value || undefined

    const headers: Record<string, string> = { 'User-Agent': navigator.userAgent }
    const cookies: Record<string, string> = {}
    if (liAt) cookies['li_at'] = liAt
    if (jsession) cookies['JSESSIONID'] = jsession

    // Best-effort enrichment from cached scrape
    let firstName: string | undefined
    let lastName: string | undefined
    let title: string | undefined
    let location: string | undefined
    let companyName: string | undefined
    let companyLogo: string | undefined
    try {
      const cached = await storage.get<any>(`profileData:${url}`)
      const d = cached?.data || null
      if (d) {
        firstName = d.firstName || undefined
        lastName = d.lastName || undefined
        title = d.currentTitle || d.headline || undefined
        location = d.location || undefined
        companyName = d.companyName || undefined
        companyLogo = d.companyLogoUrl || undefined
      }
    } catch {}

    const payload = {
      url,
      type: type || 'profile',
      organizationId,
      actorId,
      accountId,
      headers,
      cookies,
      liAt: liAt || undefined,
      liAtId: liAt ? `liat-${(liAt || '').slice(0, 8)}` : undefined,
      firstName,
      lastName,
      title,
      location,
      companyName,
      companyLogo
    }

    const resp = await fetchWithCredentials(`${baseApiUrl}/extension/profiles/visit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      const ok = resp.ok
      const error = resp.status === 401 || resp.status === 403 ? 'user not logged in' : 'visit create failed'
      await storage.remove(lockKey).catch(() => {})
      return createErrorResponse(res, ok, error)
    }

    const json = await resp.json().catch(() => ({}))
    // persist the pageVisitId similar to background.recordLinkedInVisit
    if (json?.pageVisitId) {
      await storage.set('currentPageVisitId', json.pageVisitId)
      await storage.set(`pageVisit:${url}`, json.pageVisitId)
    }
    await storage.remove(lockKey).catch(() => {})

    return res.send({ status: { ok: true }, data: json })
  } catch (e: any) {
    return res.send({ status: { ok: false, error: e?.message || 'unknown error' } })
  }
}

export default handler
