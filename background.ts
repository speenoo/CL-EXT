import { Storage } from "@plasmohq/storage"
import type { UrlMatch, Redirect } from "~types"

import Logger from "~lib/logger"
import { baseApiUrl } from "~lib/constants"
import { fetchWithCredentials } from "~lib/background"
import type { User } from "~types/user"

const extensionName = "dossi"

const storage = new Storage()
const logger = new Logger("dossi")

const uninstallUrl = "https://www.audiences.contactlevel.com"
const installUrl = "https://www.dossi.dev/success-install"

logger.info(`👋 Initializing ${extensionName}.`)

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request?.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage()
  }

  // Bridge for content/popup to retrieve LinkedIn cookies
  if (request?.type === "CL_GET_COOKIES") {
    const getAll = (details: chrome.cookies.GetAllDetails) =>
      new Promise<chrome.cookies.Cookie[]>((resolve) => {
        try {
          chrome.cookies.getAll(details, (cookies) => resolve(cookies || []))
        } catch {
          resolve([])
        }
      })

    ;(async () => {
      try {
        const [jsessions, liats] = await Promise.all([
          getAll({ name: "JSESSIONID" }),
          getAll({ name: "li_at" })
        ])
        sendResponse({ ok: true, jsessions: jsessions.map((c) => c.value), liats: liats.map((c) => c.value) })
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message ?? "cookie fetch failed" })
      }
    })()
    return true // async response
  }
})

// Keep notifying content scripts of URL changes but move visit posting to webNavigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    try {
      chrome.tabs.sendMessage(tabId, { type: "URL_CHANGE" })
    } catch (error) {
      logger.error(error)
    }
  }
})

// Recommended approach: record visits via webNavigation with a per-tab debounce
const visitDebounceMs = 5000
const lastVisitByTab = new Map<number, { url: string; time: number }>()
// In-memory guard to prevent duplicate posts across rapid events
const inFlightVisits = new Set<string>()

function normalizeLinkedInProfileUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    // Only act on linkedin.com/in/* paths
    if (!/^(?:www\.)?linkedin\.com$/i.test(u.hostname) || !/^\/in\//.test(u.pathname)) {
      return url
    }
    u.hash = ""
    u.search = ""
    // remove trailing slashes for stable keying
    u.pathname = u.pathname.replace(/\/+$/, "")
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

function isLinkedInProfile(url?: string): boolean {
  return !!url && /https?:\/\/(?:www\.)?linkedin\.com\/in\//.test(url)
}

function maybeRecordVisit(tabId: number, rawUrl?: string) {
  if (!isLinkedInProfile(rawUrl)) return
  const url = normalizeLinkedInProfileUrl(rawUrl)!
  const now = Date.now()
  const last = lastVisitByTab.get(tabId)
  if (last && last.url === url && now - last.time < visitDebounceMs) return
  lastVisitByTab.set(tabId, { url, time: now })

  ;(async () => {
    try {
      // Best-effort: ask content script to scrape & cache now
      try {
        await new Promise<void>((resolve) => {
          chrome.tabs.sendMessage(
            tabId,
            { type: "CL_SCRAPE_PROFILE", debug: false },
            () => {
              // Ignore errors; caching is best-effort
              resolve()
            }
          )
        })
      } catch {}

      // If we've already recorded this exact URL recently, skip
      const existing = await storage.get<string>(`pageVisit:${url}`)
      if (existing) return
      if (inFlightVisits.has(url)) return
      inFlightVisits.add(url)
      try {
        await recordLinkedInVisit(url, tabId)
      } finally {
        inFlightVisits.delete(url)
      }
    } catch (e: any) {
      logger.error(`visit error: ${e?.message || e}`)
    }
  })()
}

/*chrome.webNavigation.onCommitted.addListener(
  (details) => {
    if (details.frameId !== 0) return // main frame only
    maybeRecordVisit(details.tabId, details.url)
  },
  { url: [{ urlMatches: "^https://(?:www\\.)?linkedin\\.com/in/" }] }
)*/

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    if (details.frameId !== 0) return
    maybeRecordVisit(details.tabId, details.url)
  },
  { url: [{ urlMatches: "^https://(?:www\\.)?linkedin\\.com/in/" }] }
)

// Track potential server redirects on LinkedIn profile pages so we can
// reconcile any state keyed by URL (rare on LinkedIn due to SPA, but harmless)
const patterns = [
  {
    originAndPathMatches:
      `^https://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9%\-_.]+/?$`,
  },
]

patterns.forEach((pattern, pos) => {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
      await storage.set("from", { url: details.url, pos } as UrlMatch)
    },
    { url: [pattern] }
  )
  chrome.webNavigation.onCommitted.addListener(
    async (details) => {
      await storage.remove("redirect")

      if (details.transitionQualifiers.includes("server_redirect")) {
        logger.log("server_redirect detected.")

        let from: UrlMatch | null = await storage.get<UrlMatch>("from")

        if (!from) {
          return
        }

        const to = { url: details.url, pos } as UrlMatch

        if (from && to && from?.url !== to?.url && from?.pos == to?.pos) {
          await storage.set("redirect", {
            from: from?.url,
            to: to?.url,
          } as Redirect)

          // remove from storage
          await storage.remove("from")
        }
      }
    },
    { url: [pattern] }
  )
})

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.runtime.setUninstallURL(uninstallUrl)

  if (details.reason === "install") {
    chrome.tabs.create({ url: installUrl })
  }
})

// Helpers
async function getCookieValueByName(name: string): Promise<string | null> {
  try {
    const list = await new Promise<chrome.cookies.Cookie[]>((resolve) =>
      chrome.cookies.getAll({ name }, (cookies) => resolve(cookies || []))
    )
    return list?.[0]?.value || null
  } catch {
    return null
  }
}

// Try to scrape from the given tab; return data or null. Non-throwing.
async function tryScrapeFromTab(tabId: number): Promise<any | null> {
  const attempt = (retry = false) =>
    new Promise<any | null>((resolve) => {
      try {
        chrome.tabs.sendMessage(
          tabId,
          { type: "CL_SCRAPE_PROFILE", debug: false },
          (resp) => {
            const err = chrome.runtime.lastError
            if (err) {
              if (!retry && /Receiving end does not exist/i.test(err.message || "")) {
                setTimeout(() => attempt(true).then(resolve), 250)
                return
              }
              return resolve(null)
            }
            if (!resp || resp.ok === false) return resolve(null)
            resolve(resp.data || null)
          }
        )
      } catch {
        resolve(null)
      }
    })

  return attempt()
}

async function recordLinkedInVisit(url: string, tabId?: number) {
  try {
    // Load current user and selected organization from extension storage
    const user = await storage.get<User>("user")
    const actorId = user?.attrs?.id
    // Selected org persisted by OrganizationProvider / ActionsBar
    const lastOrgKey = `last-org-by-user:${actorId ?? 'anonymous'}`
    const selectedOrgId = (await storage.get<string>(lastOrgKey)) || user?.organizations?.[0]?.id || null

    if (!actorId || !selectedOrgId) {
      // missing required identifiers; skip recording until user/org is known
      return
    }

    const [liAt, jsession] = await Promise.all([
      getCookieValueByName("li_at"),
      getCookieValueByName("JSESSIONID"),
    ])

    const headers: Record<string, string> = { "User-Agent": navigator.userAgent }
    const cookies: Record<string, string> = {}
    if (liAt) cookies["li_at"] = liAt
    if (jsession) cookies["JSESSIONID"] = jsession

    // Best-effort enrichment: try to scrape directly from the tab first; fall back to cached Local storage
    let firstName: string | undefined
    let lastName: string | undefined
    let title: string | undefined
    let location: string | undefined
    let companyName: string | undefined
    let companyLogo: string | undefined

    // 1) Direct scrape from tab if we have one
    if (typeof tabId === 'number') {
      const scraped = await tryScrapeFromTab(tabId)
      if (scraped) {
        firstName = scraped.firstName || undefined
        lastName = scraped.lastName || undefined
        title = scraped.currentTitle || scraped.headline || undefined
        location = scraped.location || undefined
        companyName = scraped.companyName || undefined
        companyLogo = scraped.companyLogoUrl || undefined
        // cache as side effect (best-effort)
        try { await storage.set(`profileData:${url}`, { data: scraped, at: Date.now() }) } catch {}
      }
    }

    // 2) If none from tab, try cached Local
    if (!firstName && !lastName && !title && !location && !companyName) {
      try {
        const local = new (require("@plasmohq/storage").Storage)({ area: "local" })
        const cached = await local.get(`profileData:${url}`)
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
    }

    const body: any = {
      url,
      type: "profile",
      actorId,
      organizationId: selectedOrgId,
      accountId: actorId,
      headers,
      cookies,
      liAt: liAt || undefined,
      liAtId: liAt ? `liat-${(liAt || '').slice(0, 8)}` : undefined,
      // Optional enrichment fields (may be undefined)
      firstName,
      lastName,
      title,
      location,
      companyName,
      companyLogo,
    }

    const resp = await fetchWithCredentials(`${baseApiUrl}/extension/profiles/visit`, {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!resp.ok) return
    const json: any = await resp.json().catch(() => ({}))
    if (json?.pageVisitId) {
      await storage.set("currentPageVisitId", json.pageVisitId)
      await storage.set(`pageVisit:${url}`, json.pageVisitId)
    }
  } catch (e) {
    // best-effort; no-op on failure
  }
}
