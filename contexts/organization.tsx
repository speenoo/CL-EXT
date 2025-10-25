"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useAuth } from "./user"

type OrganizationContextType = {
  selectedOrganizationId: string | null
  setSelectedOrganizationId: (id: string | null) => void
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function useOrganization(): OrganizationContextType {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error("useOrganization must be used within an OrganizationProvider")
  return ctx
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth()
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null)

  // Plasmo storage for persistence
  const storageRef = useRef<Storage | null>(null)
  if (!storageRef.current) storageRef.current = new Storage({ area: "local" })
  const storage = storageRef.current

  const storageKey = useMemo(
    () => `last-org-by-user:${user?.attrs?.id ?? "anonymous"}`,
    [user?.attrs?.id]
  )

  // Initialize from storage or fallback to first org
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const last = await storage.get<string>(storageKey)
        if (!active) return
        const available = user?.organizations?.map((o: any) => o.id) ?? []
        if (last && available.includes(last)) {
          setSelectedOrganizationIdState(last)
        } else if (available.length > 0) {
          setSelectedOrganizationIdState(available[0])
        } else {
          setSelectedOrganizationIdState(null)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [storageKey, user?.organizations?.length])

  const setSelectedOrganizationId = useCallback((id: string | null) => {
    setSelectedOrganizationIdState(id)
    // persist best-effort
    if (id) storage.set(storageKey, id).catch(() => {})
  }, [storage, storageKey])

  const value = useMemo(
    () => ({ selectedOrganizationId, setSelectedOrganizationId }),
    [selectedOrganizationId, setSelectedOrganizationId]
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}
