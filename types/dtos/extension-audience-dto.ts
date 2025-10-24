/**
 * Minimal audience DTO for extension consumption.
 * Contains only the fields required by the browser extension.
 */
export type ExtensionAudienceDto = {
  id: string;
  name: string;
  description: string;
  linkedin: boolean;
  google: boolean;
  facebook: boolean;
  createdAt: Date;
  updatedAt: Date;
};
