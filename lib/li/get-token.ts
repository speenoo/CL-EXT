import { sendToBackground } from "@plasmohq/messaging"

let cachedToken: { value: string | null; ts: number } = { value: null, ts: 0 }
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Retrieve the app auth token stored in the cookie set by the backend.
 * Works from any context by delegating to a background message.
 */
export async function getStoredToken(): Promise<string | null> {
	const now = Date.now()
	if (cachedToken.value && now - cachedToken.ts < CACHE_TTL_MS) {
		return cachedToken.value
	}

	try {
		const resp = await sendToBackground<{ token?: string; status: { ok: boolean } }>(
			{ name: "token" as never }
		)
		const token = resp?.token ?? null
		cachedToken = { value: token, ts: Date.now() }
		return token
	} catch (e) {
		cachedToken = { value: null, ts: Date.now() }
		return null
	}
}

// Backward/alternate naming export if referenced elsewhere
export const getAppAuthToken = getStoredToken
export const getLinkedInAuthToken = getStoredToken
