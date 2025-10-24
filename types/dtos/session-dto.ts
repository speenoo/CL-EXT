import type { ExtensionMembershipOrganizationDto } from './membership-organization-dto';

/**
 * Extension session response with user and their organization memberships.
 */
export type ExtensionSessionDto = {
	user: {
		id: string;
		email: string | null;
		name: string;
		image: string | null;
	};
	organizations: ExtensionMembershipOrganizationDto[];
};
