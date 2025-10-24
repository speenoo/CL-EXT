// LinkedIn Profile DTOs
// These types mirror apps/browser-extension/types/dto/profile.py
// Keys use Pydantic alias names where specified to match the JSON returned by the backend.

export type MonthYear = {
	month?: number
	year?: number
}

export type TimePeriod = {
	startDate?: MonthYear
	endDate?: MonthYear
}

export type EmployeeCountRange = {
	start?: number
	end?: number
}

export type CompanyInfo = {
	employeeCountRange?: EmployeeCountRange
	industries?: string[]
}

export type GeoLocation = {
	geoUrn?: string
}

export type BasicLocation = {
	countryCode?: string
}

export type Location = {
	basicLocation?: BasicLocation
}

export type ExperienceItem = {
	locationName?: string
	entityUrn?: string
	geoLocationName?: string
	geoUrn?: string
	companyName?: string
	timePeriod?: TimePeriod
	company?: CompanyInfo
	title?: string
	region?: string
	companyUrn?: string
	companyLogoUrl?: string
	description?: string
}

export type SchoolMini = {
	objectUrn?: string
	entityUrn?: string
	active?: boolean
	schoolName?: string
	trackingId?: string
	logoUrl?: string
}

export type EducationItem = {
	entityUrn?: string
	school?: SchoolMini
	timePeriod?: TimePeriod
	fieldOfStudyUrn?: string
	degreeName?: string
	schoolName?: string
	fieldOfStudy?: string
	honors?: string[]
	degreeUrn?: string
	schoolUrn?: string
}

export type IssueDate = {
	month?: number
	year?: number
}

export type HonorItem = {
	description?: string
	occupation?: string
	title?: string
	issueDate?: IssueDate
	issuer?: string
}

export type VolunteerItem = {
	role?: string
	companyName?: string
	timePeriod?: TimePeriod
	cause?: string
}

export type LinkedInProfileDto = {
	industryName?: string
	lastName?: string
	locationName?: string
	student?: boolean
	geoCountryName?: string
	geoCountryUrn?: string
	geoLocationBackfilled?: boolean
	elt?: boolean
	industryUrn?: string
	firstName?: string
	entityUrn?: string

	geoLocation?: GeoLocation
	geoLocationName?: string
	location?: Location

	headline?: string
	displayPictureUrl?: string
	img_99_100?: string
	img_100_100?: string
	img_199_200?: string
	img_200_200?: string
	img_399_400?: string
	img_400_400?: string
	img_459_459?: string
	img_685_685?: string

	// These fields are not aliased in Pydantic and thus remain snake_case
	profile_id?: string
	profile_urn?: string
	member_urn?: string
	public_id?: string

	experience?: ExperienceItem[]
	education?: EducationItem[]
	languages?: string[]
	publications?: unknown[]
	certifications?: unknown[]
	volunteer?: VolunteerItem[]
	honors?: HonorItem[]
	projects?: unknown[]
	skills?: unknown[]

	urn_id?: string
}

