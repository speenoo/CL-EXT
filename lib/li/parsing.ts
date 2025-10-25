export type LinkedInEntityType = "profile" | "company" | "unknown"

export type LinkedInParseResult = {
  type: LinkedInEntityType
  slug?: string
}

const LINKEDIN_HOSTS = new Set([
  "linkedin.com",
  "www.linkedin.com",
  "m.linkedin.com",
  "mobile.linkedin.com"
])

function getPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function parseLinkedInUrl(raw: string | URL): LinkedInParseResult {
  let url: URL
  try {
    url = raw instanceof URL ? raw : new URL(raw)
  } catch {
    return { type: "unknown" }
  }

  if (!LINKEDIN_HOSTS.has(url.hostname)) {
    return { type: "unknown" }
  }

  const segments = getPathSegments(url.pathname)
  if (segments.length < 2) {
    return { type: "unknown" }
  }

  // Handle /in/{slug}
  const inIndex = segments.indexOf("in")
  if (inIndex !== -1 && segments[inIndex + 1]) {
    const slug = decodeURIComponent(segments[inIndex + 1])
    return { type: "profile", slug }
  }

  // Handle /company/{slug}
  const companyIndex = segments.indexOf("company")
  if (companyIndex !== -1 && segments[companyIndex + 1]) {
    const slug = decodeURIComponent(segments[companyIndex + 1])
    return { type: "company", slug }
  }

  return { type: "unknown" }
}
