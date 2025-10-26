'use client'

import React, { useEffect, useState } from 'react'
import { useAudiences } from '@/contexts/audiences'
import { Card } from '@/components/ui/card'

export function DebugAudiences() {
  const { audiences, status, error, debug } = useAudiences()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log("🎯 DebugAudiences mounted and visible")
    console.log("📊 Current state:", { audiences, status, error, debug })
  }, [audiences, status, error, debug])

  if (!mounted) return null

  return (
    <div className="w-full space-y-2">
      <Card className="w-full bg-black p-4 font-mono text-xs text-green-400 border-green-500">
        <div className="mb-2 text-yellow-400">🐛 DEBUG: AUDIENCES STATE</div>
        
        <div className="mb-2 border-b border-green-400 pb-2">
          <div>Status: <span className="text-blue-400">{status}</span></div>
          <div>Audiences Count: <span className="text-blue-400">{audiences?.length || 0}</span></div>
          {error && (
            <div>Error: <span className="text-red-400">{error.message}</span></div>
          )}
        </div>

        <div className="max-h-96 overflow-auto">
          <pre className="whitespace-pre-wrap break-words text-green-400">
            {JSON.stringify(
              {
                audiences,
                status,
                error: error?.message || null,
              },
              null,
              2
            )}
          </pre>
        </div>
      </Card>

      {debug && (
        <Card className="w-full bg-black p-4 font-mono text-xs text-cyan-400 border-cyan-500">
          <div className="mb-2 text-yellow-400">🔍 DEBUG INFO FROM BACKGROUND</div>
          <div className="max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap break-words text-cyan-400">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {debug?.rawResponse && (
        <Card className="w-full bg-black p-4 font-mono text-xs text-purple-400 border-purple-500">
          <div className="mb-2 text-yellow-400">📡 RAW SERVER RESPONSE</div>
          <div className="max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap break-words text-purple-400">
              {JSON.stringify(debug.rawResponse, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DebugAudiences
