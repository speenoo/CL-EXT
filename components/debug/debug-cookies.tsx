"use client"

import * as React from 'react'
import { getLinkedInAuthCookies } from '~lib/li/cookies'

function isLinkedInProfileUrl(url?: string) {
  if (!url) return false
  try {
    const u = new URL(url)
    return /(^|\.)linkedin\.com$/.test(u.hostname) && /^\/in\//.test(u.pathname)
  } catch {
    return false
  }
}

export default function DebugCookies() {
  const [activeUrl, setActiveUrl] = React.useState<string | null>(null)
  const [output, setOutput] = React.useState<any>(null)
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs?.[0]?.url || null
      if (!mounted) return
      setActiveUrl(url)
      if (!isLinkedInProfileUrl(url || undefined)) {
        setStatus('done')
        setOutput({ note: 'Not on a LinkedIn profile page.' })
        return
      }
      setStatus('loading')
      try {
        const cookies = await getLinkedInAuthCookies()
        if (!mounted) return
        setOutput({
          url,
          liAtCount: cookies.liAtTokens.length,
          jsessionCount: cookies.jsessionIds.length,
          liAtPreview: cookies.liAtTokens.map((v) => v.slice(0, 8) + '…'),
          jsessionPreview: cookies.jsessionIds.map((v) => v.slice(0, 8) + '…')
        })
        setStatus('done')
      } catch (e: any) {
        setError(e?.message ?? 'unknown error')
        setStatus('error')
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="rounded-md border p-2 text-xs">
      <div className="mb-1 font-semibold">Debug Cookies</div>
      <div>Active URL: {activeUrl || 'n/a'}</div>
      <div>Status: {status}</div>
      {error && <div className="text-red-600">Error: {error}</div>}
      {output && (
        <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify(output, null, 2)}</pre>
      )}
    </div>
  )
}
