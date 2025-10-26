import type { PlasmoMessaging } from "@plasmohq/messaging"
import { fetchWithCredentials, handleResponse, createErrorResponse } from "~lib/background"
import { baseApiUrl } from "~lib/constants"
import type { AddContactRequest } from "~types/add-contact"

// Creates an Add Contact job for a previously recorded page visit
// Endpoint: POST {baseApiUrl}/extension/profiles/add
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const raw = (req?.body || {}) as Partial<AddContactRequest>

  const missing: string[] = []
  if (!raw.organizationId) missing.push('organizationId')
  if (!raw.actorId) missing.push('actorId')
  if (!raw.audienceIds || !Array.isArray(raw.audienceIds) || raw.audienceIds.length === 0) missing.push('audienceIds')
  if (!raw.pageVisitId) missing.push('pageVisitId')
  if (missing.length) {
    return res.send({ status: { ok: false, error: `missing required fields: ${missing.join(', ')}` } })
  }

  const payload: AddContactRequest = {
    organizationId: raw.organizationId!,
    actorId: raw.actorId!,
    audienceIds: raw.audienceIds!,
    pageVisitId: raw.pageVisitId!,
    shouldSync: raw.shouldSync ?? true
  }

  try {
    const url = `${baseApiUrl}/extension/profiles/add`
    const resp = await fetchWithCredentials(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (resp.ok) {
      return handleResponse(resp, res, 'ADD_CONTACT:CREATE')
    }

    const ok = resp.ok
    const error = resp.status === 401 || resp.status === 403 ? 'user not logged in' : 'add contact create failed'
    return createErrorResponse(res, ok, error)
  } catch (e) {
    return res.send({ status: { ok: false, error: (e as Error).message || 'unknown error' } })
  }
}

export default handler
