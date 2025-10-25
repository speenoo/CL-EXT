"use client"

import * as React from 'react'
import { Storage } from '@plasmohq/storage'
import OrganizationDropdown from './organization-dropdown'
import type { OrganizationDto } from '~/types/dtos/organization-dto'
import { useAudiences } from '~/contexts/audiences'
import { useOrganization } from '~/contexts/organization'

// lightweight in-component fetcher for org audiences via our Next.js API route
async function fetchAudiences(token: string, organizationId: string): Promise<Array<{ id: string; name: string; facebook: boolean; google: boolean; linkedin: boolean }>> {
  const url = `/api/audiences/extension`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, organizationId })
  })
  if (!res.ok) throw new Error('Failed to load audiences')
  const data = await res.json()
  return data.audiences || []
}

export type ExtensionActionsBarProps = {
  token: string
  organizations: OrganizationDto[]
  currentOrganizationId: string | null
  userId?: string
  extensionRequestId?: string
}

export default function ExtensionActionsBar({ token, organizations, currentOrganizationId, userId, extensionRequestId }: ExtensionActionsBarProps) {
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(currentOrganizationId)
  const [audiences, setAudiences] = React.useState<Array<{ id: string; name: string; facebook: boolean; google: boolean; linkedin: boolean }>>([])
  const [loadingAudiences, setLoadingAudiences] = React.useState(false)
  const { setSelectedOrganizationId } = useAudiences()
  const { setSelectedOrganizationId: setOrgIdGlobal } = useOrganization()

  // Persist last selected organization per user using Plasmo Storage
  const storageRef = React.useRef<Storage | null>(null)
  if (storageRef.current === null) {
    storageRef.current = new Storage({ area: 'local' })
  }
  const storage = storageRef.current
  const storageKey = React.useMemo(() => `last-org-by-user:${userId ?? 'anonymous'}`, [userId])

  // On mount, try restoring last selected organization from storage
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const last = await storage.get<string>(storageKey)
        if (!mounted) return
        if (last && organizations.some((o) => o.id === last)) {
          setSelectedOrgId(last)
        }
      } catch {}
    })()
    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, organizations.length])

  // Whenever selected org changes (including restore), propagate to audiences context
  React.useEffect(() => {
    if (selectedOrgId) {
      setSelectedOrganizationId(selectedOrgId)
    }
  }, [selectedOrgId, setSelectedOrganizationId])

  React.useEffect(() => {
  if (!token || !selectedOrgId) return
    setLoadingAudiences(true)
    fetchAudiences(token, selectedOrgId)
      .then((list) => {
        setAudiences(list)
        console.debug('[ExtensionActionsBar] loaded audiences', { organizationId: selectedOrgId, count: list.length })
      })
      .catch((e) => console.error('Failed fetching audiences', e))
      .finally(() => setLoadingAudiences(false))
  }, [token, selectedOrgId])

  return (
    <div className="flex flex-col gap-2">
      <OrganizationDropdown
        organizations={organizations}
        currentOrganizationId={selectedOrgId}
        onSelect={(org) => {
          console.debug('[ExtensionActionsBar] organization changed', { from: selectedOrgId, to: org.id })
          setSelectedOrgId(org.id)
          setSelectedOrganizationId(org.id)
          setOrgIdGlobal(org.id)
          // Persist chosen org id
          storage.set(storageKey, org.id).catch(() => {})
        }}
      />
    </div>
  )
}
