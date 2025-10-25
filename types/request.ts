export type EnrichUrlRequest = {
  cookie_id: string
  li_at_id: string
  type: "profile" | "company"
  slug: string
  // Optional browser headers/context to help the backend emulate the client
  headers?: Record<string, string>
  // Actor / context identifiers (now required by backend)
  user_id: string
  organization_id: string

  // Preferred camelCase fields
  firstName?: string
  lastName?: string
  title?: string
  location?: string
  companyName?: string
  companyLogo?: string
  token?: string

  // Backend currently expects snake_case — include for compatibility
  first_name?: string
  last_name?: string
  company_name?: string
  company_logo?: string
  audienceIds?: string[]
}

export type ExtensionRequestResponseDto = {
  id: string
  success: boolean
}