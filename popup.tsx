import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "@/contexts/user"
import { UserActivityProvider, useUserActivity } from "@/contexts/activity"
import { AudiencesProvider, useAudiences } from "@/contexts/audiences"
import { PlanDataProvider } from "@/contexts/plan"
import { OrganizationProvider } from "@/contexts/organization"
import { CreditsProvider } from "@/contexts/credits"
import CurrentOrgCredits from "@/components/current-org-credits"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

import { Icons } from "@/components/icons"
import { UserAccountNav } from "@/components/user-account-nav"
import AddToAudienceButton from "@/components/add-to-audience-button"
import AudiencesList from "@/components/audiences-list"
import { baseUrl } from "~lib/constants"
import Logger from "@/lib/logger"
import UserPlanPopup from "@/components/user-plan-popup"
import ExtensionActionsBar from "@/components/extension-actions-bar"
import type { ActionsByURLAndDate } from "~types"

import "~/contents/base.css"

import cssText from "data-text:~/styles/globals.css"

// Inject into the ShadowDOM
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const queryClient = new QueryClient()

const Popup = () => {
  return (
    <div
      style={{
        width: "350px",
      }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PlanDataProvider>
            <UserActivityProvider>
              <OrganizationProvider>
                <CreditsProvider>
                  <AudiencesProvider>
                    <PopupPage />
                  </AudiencesProvider>
                </CreditsProvider>
              </OrganizationProvider>
            </UserActivityProvider>
          </PlanDataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  )
}

const PopupPage = () => {
  const user = useAuth()
  const { activity, status } = useUserActivity()
  const { audiences, status: audiencesStatus } = useAudiences()
  const [activitySummaries, setActivitySummaries] =
    useState<ActionsByURLAndDate>({})
  const [selectedAudience, setSelectedAudience] = useState<any>(null)

  const authLogger = new Logger("dossi AUTH")

  const handleLinkClick = (url: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.update(tabs[0].id, { url: url })
    })
  }

  useEffect(() => {
    if (!activity) return

    const groupedActions = activity.reduce((groups, action) => {
      const date = new Date(action.createdAt).toISOString().split("T")[0]
      const dateTime = new Date(action.createdAt).toISOString()

      const key = `${action.entity.url}_${date}`

      if (!groups[key]) {
        groups[key] = {
          actions: [],
          mostRecent: dateTime,
        }
      }

      const actionWithTime = {
        ...action,
        dateTime,
      }

      groups[key].actions.push(actionWithTime)

      if (dateTime > groups[key].mostRecent) {
        groups[key].mostRecent = dateTime
      }

      return groups
    }, {})
    setActivitySummaries(groupedActions)
  }, [activity])

  // Log authentication state transitions for debugging
  useEffect(() => {
    if (!user) return
    authLogger.info(
      `Auth state changed (popup): status=${user?.status}, isAuthed=${Boolean(
        user?.isAuthed
      )}`
    )
    if (user?.isAuthed && user?.attrs) {
      authLogger.info(
        `User (popup): id=${user?.attrs?.id}, email=${user?.attrs?.email}, name=${user?.attrs?.name}`
      )
    }
  }, [user?.status, user?.isAuthed])

  // Debug log audiences
  useEffect(() => {
    console.log("🎯 DEBUG Audiences in Popup:", {
      audiences,
      status: audiencesStatus,
      count: audiences?.length || 0,
    })
  }, [audiences, audiencesStatus])

  // Clear selected audience when audiences are being refreshed (org change)
  useEffect(() => {
    if (selectedAudience) {
      setSelectedAudience(null)
    }
  }, [audiencesStatus])

  return (
    <>
      {user && user?.isAuthed ? (
        <div
          className="flex max-h-full flex-col space-y-1.5 p-6"
          style={{ height: "600px", width: "350px" }}>
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">ContactLevel</h1>
                <CurrentOrgCredits />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <UserAccountNav user={user} />
              </div>
            </div>
            {user?.organizations && user?.organizations.length > 0 && (
              <>
                <ExtensionActionsBar
                  token={user?.attrs?.id || ""}
                  organizations={user.organizations.map((org) => ({
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    logo: org.logo,
                    memberCount: 0, // not available from extension session
                    creditsTotal: typeof org.creditsTotal === 'number' ? org.creditsTotal : undefined,
                  }))}
                  currentOrganizationId={user.organizations[0]?.id || null}
                  userId={user?.attrs?.id}
                />
              </>
            )}
            <UserPlanPopup />
            

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Audiences Section */}
              <AudiencesList
                audiences={audiences}
                status={audiencesStatus}
                selectedAudienceId={selectedAudience?.id}
                onSelectAudience={setSelectedAudience}
              />

              {/* Activity Section */}
              <div className="mt-5">
                {status === "loading" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="my-5 flex items-center gap-3 space-x-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[220px]" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[241px]" />
                        <Skeleton className="h-4 w-[110px]" />
                      </div>
                    </div>
                  </div>
                )}

                {status === "success" && activity && activity.length > 0 && (
                  <ScrollArea className="h-[200px]">
                    {Object.entries(activitySummaries).map(
                      ([key, item], index) => (
                        <div
                          key={index}
                          className="mb-3 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                          <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                          <div className="space-y-1">
                            <p
                              className="cursor-pointer text-sm leading-none"
                              onClick={() =>
                                handleLinkClick(key.split("_")[0])
                              }>
                              Added {item.actions.length} note
                              {item.actions.length > 1 ? "s" : null} on{" "}
                              {new URL(key.split("_")[0]).pathname.substring(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item?.mostRecent), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </ScrollArea>
                )}

                {status === "success" && activity && activity.length === 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 pl-2">
                    <span>
                      No recent activity. <br />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Button at Bottom */}
            <div className="pt-3">
              <AddToAudienceButton
                selectedAudience={selectedAudience}
                onAdd={async (audience) => {
                  // API call will be implemented here
                  console.log("Adding to audience:", audience)
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ width: "350px", height: "200px" }}>
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 p-4 sm:w-[225px]">
            <div className="flex flex-col space-y-2 text-center">
              <Icons.logo className="mx-auto h-6 w-6" />

              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>
            <div className="grid gap-6">
              <Button asChild variant="outline">
                <a
                  href={`${baseUrl}/extension/handoff2`}
                  target="_blank"
                  onClick={() => authLogger.info("Sign in clicked (popup)")}
                >
                  <Icons.logo className="mr-4 h-4 w-4" />
                  Sign in to dossi
                </a>
              </Button>
            </div>
            <p className="px-8 text-center text-sm text-muted-foreground">
              <a
                href={`${baseUrl}/register`}
                target="_blank"
                className="hover:text-brand underline underline-offset-4">
                Don&apos;t have an account? Sign Up
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default Popup
