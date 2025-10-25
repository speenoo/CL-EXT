import { Storage } from "@plasmohq/storage"
import type { UrlMatch, Redirect } from "~types"

import Logger from "~lib/logger"

const extensionName = "dossi"

const storage = new Storage()
const logger = new Logger("dossi")

const uninstallUrl = "https://www.audiences.contactlevel.com"
const installUrl = "https://www.dossi.dev/success-install"

logger.info(`👋 Initializing ${extensionName}.`)

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage()
  }
})

// Ensure we attach URL change listeners only on LinkedIn profile pages
// Use explicit patterns to cover both www and non-www hosts
chrome.tabs.query(
  { url: ["https://www.linkedin.com/in/*", "https://linkedin.com/in/*"] },
  function (tabs) {
  for (let tab of tabs) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, updatedTab) => {
      if (tabId === tab.id && changeInfo.status === "complete") {
        try {
          chrome.tabs.sendMessage(tabId, {
            type: "URL_CHANGE",
          })
        } catch (error) {
          logger.error(error)
        }
      }
    })
  }
}
)

// Track potential server redirects on LinkedIn profile pages so we can
// reconcile any state keyed by URL (rare on LinkedIn due to SPA, but harmless)
const patterns = [
  {
    originAndPathMatches:
      `^https://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9%\-_.]+/?$`,
  },
]

patterns.forEach((pattern, pos) => {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
      await storage.set("from", { url: details.url, pos } as UrlMatch)
    },
    { url: [pattern] }
  )
  chrome.webNavigation.onCommitted.addListener(
    async (details) => {
      await storage.remove("redirect")

      if (details.transitionQualifiers.includes("server_redirect")) {
        logger.log("server_redirect detected.")

        let from: UrlMatch | null = await storage.get<UrlMatch>("from")

        if (!from) {
          return
        }

        const to = { url: details.url, pos } as UrlMatch

        if (from && to && from?.url !== to?.url && from?.pos == to?.pos) {
          await storage.set("redirect", {
            from: from?.url,
            to: to?.url,
          } as Redirect)

          // remove from storage
          await storage.remove("from")
        }
      }
    },
    { url: [pattern] }
  )
})

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.runtime.setUninstallURL(uninstallUrl)

  if (details.reason === "install") {
    chrome.tabs.create({ url: installUrl })
  }
})
