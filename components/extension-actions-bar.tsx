"use client"

import * as React from 'react'
import OrganizationDropdown from './organization-dropdown'
import type { OrganizationDto } from '~/types/dtos/organization-dto'
import { useAudiences } from '~/contexts/audiences'

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
        }}
      />
    </div>
  )
}
