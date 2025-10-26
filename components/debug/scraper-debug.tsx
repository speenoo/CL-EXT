"use client"

import * as React from "react"

function isLinkedInProfileUrl(url?: string) {
  if (!url) return false
  try {
    const u = new URL(url)
    return /(^|\.)linkedin\.com$/.test(u.hostname) && /^\/in\//.test(u.pathname)
  } catch {
    return false
  }
}

export default function ScraperDebug() {
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<"idle" | "scraping" | "done" | "error">("idle")

  const run = React.useCallback(() => {
    setStatus("scraping")
    setError(null)
    setData(null)
    // Use lastFocusedWindow to target the browser window behind the popup
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs?.[0]
      const tabId = tab?.id
      const url = tab?.url
      if (!tabId) {
        setError("No active tab")
        setStatus("error")
        return
      }
      if (!isLinkedInProfileUrl(url)) {
        setError("Active tab is not a LinkedIn profile page")
        setStatus("error")
        return
      }
      const send = () => chrome.tabs.sendMessage(
        tabId,
        { type: "CL_SCRAPE_PROFILE", debug: true },
        (resp) => {
          const lastErr = chrome.runtime.lastError
          if (lastErr) {
            // Try one quick retry; content script might still be initializing
            if (/Receiving end does not exist/i.test(lastErr.message || "")) {
              setTimeout(() => send(), 250)
              return
            }
            setError(lastErr.message || "Message failed")
            setStatus("error")
            return
          }
          if (!resp) {
            setError("No response from content script")
            setStatus("error")
            return
          }
          if (resp.ok) {
            setData(resp.data)
            setStatus("done")
          } else {
            setError(resp.error || "Unknown error")
            setStatus("error")
          }
        }
      )
      send()
    })
  }, [])

  React.useEffect(() => {
    run()
  }, [run])

  return (
    <div className="rounded-md border p-2 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">Scraper Debug</div>
        <button
          className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-50"
          onClick={run}
        >
          Rescrape
        </button>
      </div>
      <div className="mb-1">Status: {status}</div>
      {error && <div className="mb-1 text-red-600">Error: {error}</div>}
      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
