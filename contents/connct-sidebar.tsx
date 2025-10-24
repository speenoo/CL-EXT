import { useEffect } from "react"

import type {
  PlasmoCSConfig,
  PlasmoCreateShadowRoot,
  PlasmoGetInlineAnchor,
} from "plasmo"

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
  matches: ["https://linkedin.com/in/*"],
}

// Inject into the ShadowDOM
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getShadowHostId = () => "dossi-sb"

export const createShadowRoot: PlasmoCreateShadowRoot = (shadowHost) =>
  shadowHost.attachShadow({
    mode: process.env.NODE_ENV === "production" ? "closed" : "open",
  })

export const getInlineAnchor: PlasmoGetInlineAnchor = () =>
  document.querySelector(
    '[data-view-name="profile-primary-message"], [data-view-name="profile-overflow-button"], .pvs-header__actions'
  ) || document.body

const App = () => {
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
            <Button variant="default" className="border-primary-text border">
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
