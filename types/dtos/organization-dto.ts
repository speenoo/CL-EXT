export type OrganizationDto = {
  id: string;
  logo?: string;
  name: string;
  slug: string;
  memberCount: number;
  /** Total credits available to the organization (optional) */
  creditsTotal?: number;
};
