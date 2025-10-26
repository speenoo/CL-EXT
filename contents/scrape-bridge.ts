import type { PlasmoCSConfig } from "plasmo"
import { scrapeLinkedInProfile } from "~lib/li/scrape-profile"
import { Storage } from "@plasmohq/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"],
  run_at: "document_idle"
}

// Register a tiny message bridge that runs inside the LinkedIn page context.
// The popup can send { type: 'CL_SCRAPE_PROFILE' } and receive the scraped data.
let __registered = (globalThis as any).__dossiScrapeBridgeRegistered as boolean | undefined
if (!__registered && typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "CL_SCRAPE_PROFILE") return
    try {
      if (!/^\/in\//.test(location.pathname)) {
        sendResponse({ ok: false, error: "not-on-profile" })
        return
      }
      const data = scrapeLinkedInProfile(document, { debug: Boolean(message?.debug) })
      // Best-effort cache to storage for later background usage
      try { void cacheScrapeResult(data) } catch {}
      sendResponse({ ok: true, data })
    } catch (e: any) {
      sendResponse({ ok: false, error: e?.message || "unknown error" })
    }
    return true
  })
  ;(globalThis as any).__dossiScrapeBridgeRegistered = true
}

// -----------------------------
// Auto-scrape on profile pages
// -----------------------------
const storage = new Storage({ area: "local" })

function normalizeLinkedInProfileUrl(raw?: string): string | undefined {
  if (!raw) return undefined
  try {
    const u = new URL(raw)
    if (!/^(?:www\.)?linkedin\.com$/i.test(u.hostname) || !/^\/in\//.test(u.pathname)) return raw
    u.hash = ""
    u.search = ""
    u.pathname = u.pathname.replace(/\/+$/, "")
    return `${u.origin}${u.pathname}`
  } catch {
    return raw
  }
}

async function cacheScrapeResult(data: any) {
  const norm = normalizeLinkedInProfileUrl(location.href)
  if (!norm) return
  const payload = { data, at: Date.now() }
  await storage.set(`profileData:${norm}`, payload)
}

let lastNormUrl: string | null = null
let scrapeTimer: number | undefined

function isProfilePath() {
  return /^\/in\//.test(location.pathname)
}

function scheduleScrape(delay = 300) {
  if (!isProfilePath()) return
  const norm = normalizeLinkedInProfileUrl(location.href)
  if (!norm) return
  if (lastNormUrl === norm) return
  lastNormUrl = norm
  if (scrapeTimer) {
    clearTimeout(scrapeTimer)
  }
  scrapeTimer = window.setTimeout(() => {
    try {
      const data = scrapeLinkedInProfile(document)
      void cacheScrapeResult(data)
    } catch {}
  }, delay)
}

// Fire on initial load if on a profile
try { scheduleScrape(150) } catch {}

// Detect SPA navigations: hook into history and popstate
;(function (history) {
  try {
    const push = history.pushState
    const replace = history.replaceState
    history.pushState = function () {
      const ret = push.apply(this, arguments as any)
      window.dispatchEvent(new Event("dossi:locationchange"))
      return ret
    } as any
    history.replaceState = function () {
      const ret = replace.apply(this, arguments as any)
      window.dispatchEvent(new Event("dossi:locationchange"))
      return ret
    } as any
  } catch {}
})(window.history)

window.addEventListener("popstate", () => scheduleScrape(200))
window.addEventListener("dossi:locationchange", () => scheduleScrape(200))
