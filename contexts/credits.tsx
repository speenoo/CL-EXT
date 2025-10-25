"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { sendToBackground } from '@plasmohq/messaging'
import { useAuth } from './user'
import { useOrganization } from './organization'
import type { OrganizationCreditsDto } from '~types/dtos/credits-dto'

export type CreditsStatus = 'idle' | 'loading' | 'success' | 'error'

export type CreditsContextType = {
  organizationId: string | null
  balance: OrganizationCreditsDto['creditBalance'] | null
  status: CreditsStatus
  error: string | null
  refetch: (orgId?: string) => Promise<void>
} | null

const CreditsContext = createContext<CreditsContextType>(null)

export function useCredits() {
  return useContext(CreditsContext)
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth()
  const { selectedOrganizationId } = useOrganization()

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [balance, setBalance] = useState<OrganizationCreditsDto['creditBalance'] | null>(null)
  const [status, setStatus] = useState<CreditsStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Decide which org id to use: selected org or first from user
  const defaultOrgId = useMemo(() => user?.organizations?.[0]?.id || null, [user?.organizations?.[0]?.id])
  const effectiveOrgId = useMemo(() => selectedOrganizationId || defaultOrgId, [selectedOrganizationId, defaultOrgId])

  const fetchCredits = async (orgId: string) => {
    setStatus('loading')
    setError(null)
    try {
      const { data, status: respStatus } = await sendToBackground<{ data?: OrganizationCreditsDto; status: { ok: boolean; error?: string } }>(
        { name: 'credits' as never, body: { organizationId: orgId } as never }
      )
      if (respStatus.ok && data?.creditBalance) {
        setBalance(data.creditBalance)
        setStatus('success')
      } else {
        setBalance(null)
        setStatus('error')
        setError(respStatus.error || 'Failed to fetch credits')
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch credits'
      setBalance(null)
      setStatus('error')
      setError(message)
    }
  }

  useEffect(() => {
    if (!user?.isAuthed) {
      setStatus('idle')
      setBalance(null)
      setOrganizationId(null)
      return
    }
    if (effectiveOrgId && effectiveOrgId !== organizationId) {
      setOrganizationId(effectiveOrgId)
      fetchCredits(effectiveOrgId)
    }
  }, [effectiveOrgId, user?.isAuthed, organizationId])

  return (
    <CreditsContext.Provider value={{ organizationId, balance, status, error, refetch: async (orgId?: string) => {
      const id = orgId || effectiveOrgId
      if (id) await fetchCredits(id)
    } }}>
      {children}
    </CreditsContext.Provider>
  )
}
