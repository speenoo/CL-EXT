/**
 * Organization information from a user's membership.
 * Minimal shape for extension consumption.
 */
export type ExtensionMembershipOrganizationDto = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	role: 'MEMBER' | 'ADMIN';
	isOwner: boolean;
};
