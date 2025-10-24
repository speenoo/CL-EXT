import type { Prompt, ApiKey } from "~types/prompt"
import type { ExtensionMembershipOrganizationDto } from "~types/dtos/membership-organization-dto"

export type User = {
  isAuthed: boolean
  attrs: {
    name: string
    email: string
    image: string
    id: string
  }
  // Optional: enriched org memberships when available from extension session endpoint
  organizations?: ExtensionMembershipOrganizationDto[]
}

export type UserSettings = {
  id: string
  userId: string
  settings: {
    useUserApiKey: boolean
    apiKeys: ApiKey[]
    prompts: Prompt[]
  }
}
