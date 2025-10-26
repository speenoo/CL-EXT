# Extension Profile Visit API

POST /api/extension/profiles/visit

Records a LinkedIn profile/company page visit and stores the provided LinkedIn cookies. On every call the API writes a new row to both tables:

- ExtensionPageVisit
- LinkedinCookies

No de-duplication is performed.

## Request

- Method: POST
- Content-Type: application/json

### Body shape

Send a flat JSON object containing the visit details and cookies:

{
"organizationId": "<uuid>",
"actorId": "<uuid>",
"url": "https://www.linkedin.com/in/some-profile",
"accountId": "<extension account identifier>",

// Optional – defaults to "profile" server-side if omitted
"type": "profile" | "company",

// Optional visit fields
"firstName": "Jane",
"lastName": "Doe",
"title": "Head of Growth",
"location": "Austin, TX",
"companyName": "Acme Inc",
"companyLogo": "https://.../logo.png",

// Optional LinkedIn page auth artifacts attached to the visit row
"cookieId": "<opaque cookie id>",
"liAt": "<li_at cookie value>",
"headers": { "User-Agent": "...", "Cookie": "..." },

// Required cookies payload for LinkedinCookies table
"cookies": { "li_at": "...", "JSESSIONID": "...", "...": "..." },
"liAtId": "<stable identifier for li_at>",
// (optional) echo the URL here as well for cookies row
"url": "https://www.linkedin.com/in/some-profile"
}

Notes:

- headers: Any request headers you want persisted (object). They are stored as JSON.
- cookies: Raw cookie key/value pairs (object). Stored as JSON.
- type: If omitted, the visit defaults to profile.

## Response

201 Created
{
"success": true,
"pageVisitId": "<uuid>",
"linkedinCookiesId": "<uuid>"
}

400 Bad Request (validation error)
{
"success": false,
"error": { /_ zod error details _/ }
}

500 Internal Server Error
{
"success": false
}

## Example

curl -X POST \
 -H "Content-Type: application/json" \
 -d '{
"organizationId": "9e6a1e9b-2c40-4b9b-9c7f-1f7c9a8c1234",
"actorId": "f5f2b0cd-93f1-4b6f-9a9c-2f7a1c9d5678",
"url": "https://www.linkedin.com/in/janedoe/",
"accountId": "ext-acc-123",
"type": "profile",
"firstName": "Jane",
"lastName": "Doe",
"title": "Head of Growth",
"location": "Austin, TX",
"companyName": "Acme Inc",
"companyLogo": "https://cdn.example.com/acme.png",
"cookieId": "cookie-abc",
"liAt": "<redacted>",
"headers": { "User-Agent": "Mozilla/5.0", "Accept": "_/_" },
"cookies": { "li_at": "<redacted>", "JSESSIONID": "ajax:123" },
"liAtId": "liat-abc-123"
}' \
 http://localhost:3000/api/extension/profiles/visit
