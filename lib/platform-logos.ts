import type { AudienceDto } from "~/types/dtos/audience-dto"

export type SocialPlatform = "facebook" | "google" | "linkedin" | "slack"

type PlatformLogo = {
  src: string
  alt: string
  label: string
}

const PLATFORM_LOGOS: Record<SocialPlatform, PlatformLogo> = {
  facebook: {
    src: new URL("../assets/facebook-logo.svg", import.meta.url).href,
    alt: "Facebook",
    label: "Facebook",
  },
  google: {
    src: new URL("../assets/google-logo.svg", import.meta.url).href,
    alt: "Google",
    label: "Google",
  },
  linkedin: {
    src: new URL("../assets/linkedin-logo.svg", import.meta.url).href,
    alt: "LinkedIn",
    label: "LinkedIn",
  },
  slack: {
    src: "/logos/slack-logo.svg",
    alt: "Slack",
    label: "Slack",
  },
}

export function getPlatformLogo(platform: SocialPlatform): PlatformLogo {
  return PLATFORM_LOGOS[platform];
}

export function getEnabledPlatformsFromAudience(
  audience: Pick<AudienceDto, "facebook" | "google" | "linkedin">
): SocialPlatform[] {
  const enabled: SocialPlatform[] = [];
  if (audience.facebook) enabled.push("facebook");
  if (audience.google) enabled.push("google");
  if (audience.linkedin) enabled.push("linkedin");
  return enabled;
}

export function getPlatformLogosForAudience(
  audience: Pick<AudienceDto, "facebook" | "google" | "linkedin">
): PlatformLogo[] {
  return getEnabledPlatformsFromAudience(audience).map(getPlatformLogo);
}
