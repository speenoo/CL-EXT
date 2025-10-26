export type EnrichmentStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ERRORS: 'COMPLETED_WITH_ERRORS',
  FAILED: 'FAILED'
};
export type ExtensionContactJobsDto = {
	id: string
	organizationId: string
	actorId: string
    audienceIds: string[]
	status: EnrichmentStatus
	pageVisitId: string
	shouldSync: boolean
	createdAt: Date
	updatedAt: Date
}

// Request payload to create an Add Contact job
export type AddContactRequest = {
  organizationId: string
  actorId: string
  audienceIds: string[]
  pageVisitId: string
  shouldSync?: boolean
}

