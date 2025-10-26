// Visit DTOs for the Extension Profile Visit API

export type VisitType = 'profile' | 'company'

// Request body posted to /api/extension/profiles/visit
export type VisitRequestBody = {
  organizationId: string
  actorId: string
  url: string
  accountId: string

  // Optional – defaults to "profile" server-side if omitted
  type?: VisitType

  // Optional visit fields
  firstName?: string
  lastName?: string
  title?: string
  location?: string
  companyName?: string
  companyLogo?: string

  // Optional LinkedIn page auth artifacts attached to the visit row
  cookieId?: string
  liAt?: string
  headers?: Record<string, unknown>

  // Required cookies payload for LinkedinCookies table
  cookies: Record<string, string>
  liAtId: string
}

// Successful response
export type VisitResponseOk = {
  success: true
  pageVisitId: string
  linkedinCookiesId: string
}

// Error response
export type VisitResponseErr = {
  success: false
  error?: unknown
}

export type VisitResponse = VisitResponseOk | VisitResponseErr
