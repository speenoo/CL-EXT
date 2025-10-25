"use client"

import * as React from 'react'
import { useCredits } from '@/contexts/credits'

export default function CurrentOrgCredits() {
  const credits = useCredits()

  if (!credits || !credits.organizationId) return null

  const { status, balance, error } = credits

  let label: string
  if (status === 'loading') label = '…'
  else if (status === 'success' && balance) label = balance.total.toLocaleString()
  else label = '—'

  return (
    <div
      className="rounded-md bg-neutral-100 px-2 py-0.5 text-sm font-medium text-muted-foreground"
      title={error || undefined}
      aria-live="polite"
    >
      Credits: {label}
    </div>
  )
}
