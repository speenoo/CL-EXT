import type { PlasmoMessaging } from "@plasmohq/messaging"
import { baseApiUrl } from "~lib/constants"
import Logger from "~lib/logger"
import type { ExtensionAudienceDto } from "~types/dtos/extension-audience-dto"

const logger = new Logger("Extension Audiences")

export type AudiencesMessage = {
  organizationId: string
}

export type AudiencesResponse = {
  audiences: ExtensionAudienceDto[]
  rawResponse?: any
  debug?: {
    endpoint: string
    organizationId: string
    timestamp: string
    responseStatus?: number
  }
}

const handler: PlasmoMessaging.MessageHandler<
  AudiencesMessage,
  AudiencesResponse
> = async (req, res) => {
  const { organizationId } = req.body

  if (!organizationId) {
    return res.send({ audiences: [] })
  }

  try {
    const endpoint = `${baseApiUrl}/extension/audiences-2`
    const requestBody = { organizationId }
    
    // Log everything
    logger.info(`📤 Fetching audiences from ${endpoint}`)
    logger.info(`📦 Request body: ${JSON.stringify(requestBody)}`)

    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    logger.info(`📥 Response status: ${response.status}`)

    if (response.status === 403) {
      logger.warn("❌ User not authorized to access audiences")
      return res.send({
        audiences: [],
        debug: {
          endpoint,
          organizationId,
          timestamp: new Date().toISOString(),
          responseStatus: 403,
        },
      })
    }

    if (!response.ok) {
      logger.error(`❌ Failed to fetch audiences: ${response.statusText}`)
      return res.send({
        audiences: [],
        debug: {
          endpoint,
          organizationId,
          timestamp: new Date().toISOString(),
          responseStatus: response.status,
        },
      })
    }

    const data = await response.json()
    logger.info(`✅ Fetched ${data.audiences?.length || 0} audiences`)
    logger.info(`📢 Raw data: ${JSON.stringify(data)}`)

    return res.send({
      audiences: data.audiences || [],
      rawResponse: data,
      debug: {
        endpoint,
        organizationId,
        timestamp: new Date().toISOString(),
        responseStatus: response.status,
      },
    })
  } catch (error) {
    logger.error(`💥 Error fetching audiences: ${error}`)
    logger.error(`💥 Error details: ${JSON.stringify(error)}`)
    return res.send({
      audiences: [],
      debug: {
        endpoint: `${baseApiUrl}/extension/audiences-2`,
        organizationId,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

export default handler
