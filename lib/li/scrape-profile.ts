// Scrapes key profile data from a LinkedIn profile page DOM.
// Target fields: full name (and first/last), headline, location, company name, company logo URL, and current title.
// Notes:
// - LinkedIn uses obfuscated class names; prefer semantic attributes and structural heuristics over classes.
// - The selectors below include multiple fallbacks to be resilient to minor DOM changes.

export type ScrapedProfile = {
	fullName?: string
	firstName?: string
	lastName?: string
	headline?: string
	location?: string
	companyName?: string
	companyLogoUrl?: string
	currentTitle?: string
}

type Root = Document | HTMLElement

const TEXT_BLOCK_SELECTOR = 'p, h1, h2, h3, span'

const normalizeText = (input: string | null | undefined): string =>
	(input ?? '')
		.replace(/\s+/g, ' ')
		.replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
		.trim()

const isLikelyName = (text: string): boolean => {
	const t = normalizeText(text)
	if (!t) return false
	// Reject obvious non-name patterns
	if (/[•·]|followers|connections|contact info|open to work/i.test(t)) return false
	if (/^he\/him|she\/her|they\/them/i.test(t)) return false
	// Accept if it looks like 2-4 tokens with letters, apostrophes, dots, or hyphens
	const parts = t.split(' ')
	if (parts.length < 2 || parts.length > 5) return false
	return parts.every((p) => /[\p{L}\p{M}.'’-]+/u.test(p))
}

const splitName = (
	fullName: string,
): { firstName?: string; lastName?: string } => {
	const t = normalizeText(fullName)
	if (!t) return {}
	const parts = t.split(' ')
	if (parts.length === 1) return { firstName: parts[0] }
	const lastName = parts.pop()
	const firstName = parts.join(' ')
	return { firstName, lastName }
}

const getMainRoot = (root: Root): HTMLElement => {
	const doc = (root as Document).querySelector
		? (root as Document)
		: (root as HTMLElement)
	return (
		(doc as Document).querySelector?.('main#workspace, main[role="main"], main') ||
		(root as HTMLElement)
	) as HTMLElement
}

const pickClosestAfter = (
	anchor: Element,
	candidates: Element[],
	predicate: (el: Element) => boolean,
): Element | undefined => {
	const rect = (anchor as HTMLElement).getBoundingClientRect?.()
	const anchorTop = rect?.top ?? 0
	let best: { el: Element; score: number } | undefined
	for (const el of candidates) {
		if (!predicate(el)) continue
		const top = (el as HTMLElement).getBoundingClientRect?.().top ?? Infinity
		const dy = top - anchorTop
		if (dy >= 0 && (best === undefined || dy < best.score)) {
			best = { el, score: dy }
		}
	}
	return best?.el
}

const findByText = (
	root: Root,
	includes: RegExp,
	options?: { within?: Element },
): Element | undefined => {
	const scope = options?.within ?? getMainRoot(root)
	const nodes = Array.from(scope.querySelectorAll(TEXT_BLOCK_SELECTOR))
	return nodes.find((n) => includes.test(normalizeText(n.textContent)))
}

const getName = (root: Root): string | undefined => {
	const main = getMainRoot(root)
	// Primary: specific data-view-name used around the verified badge/name line
	const verifiedBlock = main.querySelector(
		'[data-view-name="profile-top-card-verified-badge"]',
	)
	if (verifiedBlock) {
		const nameP = verifiedBlock.querySelector('p')
		const nameText = normalizeText(nameP?.textContent || '')
		if (isLikelyName(nameText)) return nameText
	}

	// Fallback: any p/span near top that looks like a name
	const blocks = Array.from(main.querySelectorAll(TEXT_BLOCK_SELECTOR))
	// Sort by vertical position to prefer top-most candidates
	blocks.sort(
		(a, b) =>
			((a as HTMLElement).getBoundingClientRect?.().top ?? 0) -
			((b as HTMLElement).getBoundingClientRect?.().top ?? 0),
	)
	for (const el of blocks.slice(0, 40)) {
		const t = normalizeText(el.textContent)
		if (isLikelyName(t)) return t
	}
	return undefined
}

const getHeadline = (root: Root, nameEl?: Element): string | undefined => {
	const main = getMainRoot(root)
	const blocks = Array.from(main.querySelectorAll(TEXT_BLOCK_SELECTOR))
	const isHeadlineText = (t: string): boolean => {
		const x = normalizeText(t)
		if (!x) return false
		if (/^he\/him|she\/her|they\/them/i.test(x)) return false
		if (/^(\d+\s+followers|\d+\s+connections)$/i.test(x)) return false
		// Headline is usually descriptive and a bit longer
		return x.length >= 20 && x.split(' ').length >= 4
	}

	if (nameEl) {
		const candidate = pickClosestAfter(
			nameEl,
			blocks,
			(el) => isHeadlineText(el.textContent || ''),
		)
		const text = normalizeText(candidate?.textContent)
		if (text) return text
	}

	// Fallback: first long-ish block near top
	for (const el of blocks.slice(0, 80)) {
		const t = normalizeText(el.textContent)
		if (isHeadlineText(t)) return t
	}
	return undefined
}

const getLocation = (root: Root, nameEl?: Element): string | undefined => {
	const main = getMainRoot(root)

	// Limit to the top-card/headline header block that contains both the name and "Contact info"
	const topcardScope: HTMLElement = (() => {
		// Helper: climb until a container that ALSO contains a "Contact info" node
		const findHeaderScope = (start: Element): HTMLElement | null => {
			let cur: Element | null = start
			for (let i = 0; i < 12 && cur; i++) {
				const hasContact = cur.querySelector?.('a, p, span')
					? Array.from(cur.querySelectorAll('a, p, span')).some((n) =>
						  /contact info/i.test(n.textContent || ''),
					  )
					: false
				if (hasContact) return cur as HTMLElement
				cur = cur.parentElement
			}
			return null
		}

		if (nameEl) {
			// 1) Prefer the nearest ancestor that contains the Contact info link
			const scopeByContact = findHeaderScope(nameEl)
			if (scopeByContact) return scopeByContact

			// 2) Try the nearest Topcard component wrapper
			let cur: Element | null = nameEl
			for (let i = 0; i < 10 && cur; i++) {
				if (
					(cur as HTMLElement).hasAttribute?.('componentkey') &&
					/Topcard/i.test((cur as HTMLElement).getAttribute('componentkey') || '')
				) {
					return cur as HTMLElement
				}
				cur = cur.parentElement
			}

			// 3) Use the verified-badge container's parent if present
			const verified = (nameEl as HTMLElement).closest('[data-view-name="profile-top-card-verified-badge"]')
			if (verified) {
				const vScope = findHeaderScope(verified) || (verified.parentElement as HTMLElement)
				if (vScope) return vScope
			}
		}
		return main
	})()

	const isDotOnly = (t: string) => /^\s*(?:[•·]|\.)\s*$/.test(t)

	// 1) Find the "Contact info" node (a, p, or span)
	const all = Array.from(topcardScope.querySelectorAll('a, p, span'))
	const contactNode = all.find((n) => /contact info/i.test(n.textContent || ''))
	if (!contactNode) {
		// Structural fallback: look for a container with <p> siblings like [location] [·] [Contact info]
		const containers = Array.from(topcardScope.querySelectorAll<HTMLElement>('div, section, header, article'))
		for (const c of containers) {
			const ps = Array.from(c.querySelectorAll(':scope > p'))
			if (ps.length < 2) continue
			const lastP = ps[ps.length - 1]
			const hasContact = /contact info/i.test((lastP.textContent || '').trim()) ||
				Array.from(lastP.querySelectorAll('a, span')).some((n) => /contact info/i.test(n.textContent || ''))
			if (!hasContact) continue
			// walk backwards to find a non-dot text
			for (let i = ps.length - 2; i >= 0; i--) {
				const raw = (ps[i] as HTMLElement).innerText || ps[i].textContent || ''
				const txt = raw.trim()
				if (txt && !isDotOnly(txt)) return raw.trim()
			}
		}
		return undefined
	}

	// 2) Prefer the closest <p> ancestor of the contact node
	let pOfContact: Element | null = contactNode.closest('p')
	// 3) Walk previous siblings (within same container) to find the preceding <p> that is not just a middot
	const scanPrevPSibling = (el: Element | null): string | undefined => {
		if (!el) return undefined
		let cur: Element | null = el.previousElementSibling
		while (cur) {
			if (cur.tagName === 'P') {
				const raw = (cur as HTMLElement).innerText || cur.textContent || ''
				const txt = raw.trim()
				if (txt && !isDotOnly(txt)) return raw.trim()
			}
			cur = cur.previousElementSibling
		}
		return undefined
	}

	// Try same <p> container first
	let direct = scanPrevPSibling(pOfContact)
	if (direct) return direct

	// 4) If not found, climb up a few levels and try siblings there (captures cases with extra wrappers)
	let parent: Element | null = contactNode.parentElement
	for (let i = 0; i < 4 && parent; i++) {
		const sibResult = scanPrevPSibling(parent)
		if (sibResult) return sibResult
		parent = parent.parentElement
	}

	// 5) As a very last resort, take the nearest previous <p> in document order that is non-dot
	const ps = Array.from(topcardScope.querySelectorAll('p'))
	const idx = ps.findIndex((p) => p === pOfContact || p.contains(contactNode))
	if (idx > 0) {
		for (let i = idx - 1; i >= 0; i--) {
			const raw = (ps[i] as HTMLElement).innerText || ps[i].textContent || ''
			const txt = raw.trim()
			if (txt && !isDotOnly(txt)) return raw.trim()
		}
	}

	return undefined
}

const getCompany = (
	root: Root,
): { companyName?: string; companyLogoUrl?: string } => {
	const main = getMainRoot(root)
	// Primary: look for a company logo image and read adjacent text
	const logoImg = main.querySelector<HTMLImageElement>('img[src*="company-logo"]')
	if (logoImg) {
		const container = logoImg.closest('figure')?.parentElement || logoImg.parentElement
		const nameEl = container?.querySelector('p, h3')
		const companyName = normalizeText(nameEl?.textContent)
		const companyLogoUrl = logoImg.src
		return { companyName: companyName || undefined, companyLogoUrl }
	}

	// Fallback: look for a block that looks like an org name in the top card panel (often right side)
	const orgBlock = Array.from(
		main.querySelectorAll('[componentkey*="Topcard"], [data-view-name*="profile"]'),
	)
		.flatMap((container) => Array.from(container.querySelectorAll('p')))
		.map((el) => ({
			el,
			text: normalizeText(el.textContent),
		}))
		.find(({ text }) => text && /\b(Inc\.|LLC|Ltd|University|School|Company|Corp|Corporation|Institute|Political|Science|LSE|Google|Microsoft|Meta|Amazon|Apple|NVIDIA)\b/i.test(text))
	if (orgBlock) return { companyName: orgBlock.text }

	return {}
}

const getCurrentTitle = (root: Root): string | undefined => {
	const main = getMainRoot(root)
	// Try to find an Experience section and grab the first role title
	const experienceHeader = findByText(main, /^experience$/i)
	if (experienceHeader) {
		// Look ahead for the first role title-like element after the Experience header
		const candidates = Array.from(main.querySelectorAll(TEXT_BLOCK_SELECTOR))
		const titleEl = pickClosestAfter(experienceHeader, candidates, (el) => {
			const t = normalizeText(el.textContent)
			if (!t) return false
			if (t.length > 100 || t.length < 3) return false
			// Avoid company-only lines; prefer role titles (often Title Case, with nouns)
			return /[A-Za-z]/.test(t) && !/\b(Inc\.|LLC|Ltd|University|School|Company|Corp|Corporation|Institute)\b/i.test(t)
		})
		const text = normalizeText(titleEl?.textContent)
		if (text) return text
	}

	// Fallback: sometimes current title is included near top card; prefer a concise line after the name
	const nameText = getName(main)
	if (nameText) {
		const blocks = Array.from(main.querySelectorAll(TEXT_BLOCK_SELECTOR))
		const nameEl = blocks.find((el) => normalizeText(el.textContent) === nameText)
		if (nameEl) {
			const maybeTitle = pickClosestAfter(nameEl, blocks, (el) => {
				const t = normalizeText(el.textContent)
				if (!t) return false
				if (t.length > 80 || t.length < 3) return false
				if (/followers|connections|contact info/i.test(t)) return false
				// Prefer text that looks like a role (contains capitalized words, maybe with prepositions)
				return /\b(Engineer|Manager|Director|Founder|Head|Lead|Specialist|Analyst|Professor|Student|Intern|Designer|Consultant|Developer|Scientist|Researcher)\b/i.test(
					t,
				)
			})
			const t = normalizeText(maybeTitle?.textContent)
			if (t) return t
		}
	}
	return undefined
}

export const scrapeLinkedInProfile = (
	root: Root,
	opts?: { debug?: boolean },
): ScrapedProfile => {
	const main = getMainRoot(root)
	const nameText = getName(main)
	// Find the exact element for relative searches
	const nameEl = nameText
		? Array.from(main.querySelectorAll(TEXT_BLOCK_SELECTOR)).find(
				(el) => normalizeText(el.textContent) === nameText,
			)
		: undefined

	const headline = getHeadline(main, nameEl)
	const location = getLocation(main, nameEl)
	const { companyName, companyLogoUrl } = getCompany(main)
	const currentTitle = getCurrentTitle(main) || undefined

	const { firstName, lastName } = nameText ? splitName(nameText) : {}

	const result: ScrapedProfile = {
		fullName: nameText,
		firstName,
		lastName,
		headline,
		location,
		companyName,
		companyLogoUrl,
		currentTitle,
	}

	if (opts?.debug) {
		// eslint-disable-next-line no-console
		console.debug('[scrapeLinkedInProfile]', result)
	}
	return result
}

// Optional helper to scrape from an HTML string (useful for tests or fixtures)
export const scrapeLinkedInProfileFromHtml = (
	html: string,
	opts?: { debug?: boolean },
): ScrapedProfile => {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, 'text/html')
	return scrapeLinkedInProfile(doc, opts)
}

