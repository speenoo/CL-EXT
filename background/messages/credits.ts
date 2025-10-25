import type { PlasmoMessaging } from "@plasmohq/messaging"
import { fetchWithCredentials, handleResponse, createErrorResponse } from "~lib/background"
import { baseApiUrl } from "~lib/constants"

// Request body: { organizationId: string }
// Response: OrganizationCreditsDto
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const organizationId = req?.body?.organizationId as string | undefined

  if (!organizationId) {
    return res.send({ status: { ok: false, error: "organizationId is required" } })
  }

  try {
    const url = `${baseApiUrl}/extension/credits`
    const resp = await fetchWithCredentials(url, {
      method: "POST",
      body: JSON.stringify({ organizationId })
    })

    if (resp.ok) {
      return handleResponse(resp, res, "CREDITS:GET")
    } else {
      const ok = resp.ok
      const error = resp.status === 401 || resp.status === 403 ? "user not logged in" : `credits fetch failed`
      return createErrorResponse(res, ok, error)
    }
  } catch (e) {
    return res.send({ status: { ok: false, error: (e as Error).message || "unknown error" } })
  }
}

export default handler
