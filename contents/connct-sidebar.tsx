// Patch Trusted Types before anything else in this isolated world
import "~/contents/tt-shim"
import { useEffect } from "react"

import type { PlasmoCSConfig, PlasmoCreateShadowRoot, PlasmoGetInlineAnchor } from "plasmo"

import { AuthProvider, useAuth } from "@/contexts/user"
import { AudiencesProvider } from "@/contexts/audiences"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet-maintainer"

import { UserAccountNav } from "@/components/user-account-nav"
import { Icons } from "@/components/icons"
import ExtensionActionsBar from "@/components/extension-actions-bar"
import AudiencesList from "@/components/audiences-list"
import { useAudiences } from "@/contexts/audiences"
import { baseUrl } from "@/lib/constants"
import Logger from "@/lib/logger"

import "~/contents/base.css"
import cssText from "data-text:~/contents/global.css"

const queryClient = new QueryClient()

export const config: PlasmoCSConfig = {
  // Broaden match to all LinkedIn pages to guarantee injection even on SPA variants,
  // we’ll self-guard at runtime to only render on /in/ profiles.
  matches: ["https://*.linkedin.com/*"],
  run_at: "document_idle",
}

// Inject into the ShadowDOM
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getShadowHostId = () => "dossi-sb"

export const createShadowRoot: PlasmoCreateShadowRoot = (shadowHost) => {
  // Make the host participate nicely in LinkedIn's action row layout
  shadowHost.style.display = "inline-flex"
  shadowHost.style.alignItems = "center"
  shadowHost.style.marginLeft = "8px"
  shadowHost.setAttribute("data-dossi-host", "")
  return shadowHost.attachShadow({
    mode: process.env.NODE_ENV === "production" ? "closed" : "open",
  })
}

// Mount our UI within the LinkedIn profile action button group
let anchorLogged = false

export const getInlineAnchor: PlasmoGetInlineAnchor = () => {
  try {
    // Keep logs minimal to avoid console spam on LinkedIn's frequent reflows
    if (!anchorLogged) console.log("[dossi] getInlineAnchor start", location.href)

    // 1) Scope to Topcard and find the overflow button inside it to avoid the sticky header clone
    const topCard = (document.querySelector(
      'div[componentkey$="Topcard"], div[componentkey*="Topcard"]'
    ) || document.querySelector('[componentkey*="Topcard"]')) as HTMLElement
    if (topCard) {
      const overflowInTop = topCard.querySelector(
        '[data-view-name="profile-overflow-button"]'
      ) as HTMLElement
      if (overflowInTop && overflowInTop.parentElement) {
        if (!anchorLogged)
          console.log("[dossi] using Topcard action row as anchor", overflowInTop.parentElement)
        anchorLogged = true
        return overflowInTop.parentElement as HTMLElement
      }
      // As a fallback within Topcard, use its container
      if (!anchorLogged) console.log("[dossi] using Topcard container", topCard)
      anchorLogged = true
      return topCard
    }

    // 2) Global overflow button (may resolve to sticky header on some variants)
    const overflowBtn = document.querySelector(
      '[data-view-name="profile-overflow-button"]'
    ) as HTMLElement
    if (overflowBtn && overflowBtn.parentElement) {
      if (!anchorLogged)
        console.log("[dossi] using global overflow parent (no Topcard found)", overflowBtn.parentElement)
      anchorLogged = true
      return overflowBtn.parentElement as HTMLElement
    }

    // 3) Fallback to a common header actions container if present
    const headerActions = document.querySelector(
      '.pvs-header__actions'
    ) as HTMLElement
    if (headerActions) {
      if (!anchorLogged) console.log("[dossi] using headerActions", headerActions)
      anchorLogged = true
      return headerActions
    }

    if (!anchorLogged) console.log("[dossi] falling back to document.body as anchor")
    anchorLogged = true
  } catch (e) {
    console.warn("[dossi] getInlineAnchor error:", e)
  }

  // Final fallback: mount at the end of the body (always available)
  return document.body
}

try {
  console.log("[dossi] content script loaded for:", location.href)
} catch {}

export const shouldMount = async () => /^\/in\//.test(location.pathname)

const isProfilePath = () => /^\/in\//.test(location.pathname)

const App = () => {
  if (!isProfilePath()) {
    // Do not render UI unless on a profile; keeps host inert on non-profile pages.
    return null
  }
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AudiencesProvider>
          <ActionSheet />
        </AudiencesProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

const ActionSheet = () => {
  const user = useAuth()
  const { audiences, status: audiencesStatus } = useAudiences()

  const authLogger = new Logger("dossi AUTH - Sidebar")

  // Log authentication state transitions for debugging
  useEffect(() => {
    if (!user) return
    authLogger.info(
      `Auth state changed: status=${user?.status}, isAuthed=${Boolean(
        user?.isAuthed
      )}`
    )
    if (user?.isAuthed && user?.attrs) {
      authLogger.info(
        `User: id=${user?.attrs?.id}, email=${user?.attrs?.email}, name=${user?.attrs?.name}`
      )
    }
  }, [user?.status, user?.isAuthed])

  return (
    <div>
      {user?.isAuthed ? (
        <Sheet modal={false}>
          <SheetTrigger asChild className="justify-end">
            <Button variant="outline" className="">
              <Icons.logo className="mr-2 h-4 w-4" />
              Contactlevel
            </Button>
          </SheetTrigger>
          <SheetContent size="lg" className="!bg-white !text-black">
            <SheetHeader className="text-left">
              <SheetTitle>
                <div className="flex items-center justify-between">
                  <h2>dossi</h2>
                  <UserAccountNav user={user} />
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="gap-4 py-4">
              {user?.organizations && user?.organizations.length > 0 && (
                <ExtensionActionsBar
                  token={user?.attrs?.id || ""}
                  organizations={user.organizations.map((org) => ({
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    logo: org.logo,
                    memberCount: 0,
                  }))}
                  currentOrganizationId={user.organizations[0]?.id || null}
                  userId={user?.attrs?.id}
                />
              )}

              <AudiencesList
                audiences={audiences}
                status={audiencesStatus}
                selectedAudienceId={null}
                onSelectAudience={() => {}}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Button asChild>
          <a
            href={`${baseUrl}/extension/handoff2`}
            target="_blank"
            onClick={() => authLogger.info("Sign in clicked (sidebar)")}
          >
            <Icons.logo className="mr-2 h-4 w-4" />
            dossi
          </a>
        </Button>
      )}
    </div>
  )
}

export default App
