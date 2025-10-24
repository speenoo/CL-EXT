'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './user'
import { sendToBackground } from '@plasmohq/messaging'
import type { ExtensionAudienceDto } from '~types/dtos/extension-audience-dto'
import Logger from '@/lib/logger'

type AudiencesContextType = {
  audiences: ExtensionAudienceDto[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: Error | null
  debug?: any
  refetch: () => Promise<void>
  setSelectedOrganizationId: (id: string | null) => void
}

const AudiencesContext = createContext<AudiencesContextType | undefined>(
  undefined
)

export function AudiencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuth()
  const [audiences, setAudiences] = useState<ExtensionAudienceDto[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [debug, setDebug] = useState<any>(null)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)

  const logger = new Logger('Audiences Context')

  const fetchAudiences = async () => {
    if (!user?.isAuthed || !user?.attrs?.id) {
      setStatus('idle')
      return
    }

    // Determine which organization ID to use
    const orgIdToUse = selectedOrganizationId || user.organizations?.[0]?.id
    if (!orgIdToUse) {
      setAudiences([])
      setStatus('success')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const { data, audiences: audiencesData, rawResponse, debug: debugInfo } = await sendToBackground({
        name: 'audiences' as never,
        body: {
          organizationId: orgIdToUse,
        },
      })

      setDebug({
        audiencesData,
        rawResponse,
        debugInfo,
        receivedAt: new Date().toISOString(),
      })

      setAudiences(audiencesData || data || [])
      setStatus('success')
      logger.info(`Fetched ${(audiencesData || data)?.length || 0} audiences`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setStatus('error')
      logger.error(`Failed to fetch audiences: ${error.message}`)
    }
  }

  useEffect(() => {
    if (user?.isAuthed) {
      fetchAudiences()
    }
  }, [user?.isAuthed, selectedOrganizationId, user.organizations])

  return (
    <AudiencesContext.Provider
      value={{
        audiences,
        status,
        error,
        debug,
        setSelectedOrganizationId,
        refetch: fetchAudiences,
      }}
    >
      {children}
    </AudiencesContext.Provider>
  )
}

export function useAudiences() {
  const context = useContext(AudiencesContext)
  if (context === undefined) {
    throw new Error('useAudiences must be used within an AudiencesProvider')
  }
  return context
}
