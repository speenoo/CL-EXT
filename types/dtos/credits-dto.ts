// DTO for organization credit balances returned by /api/extension/credits

export type CreditBalanceDto = {
  total: number
  subscription: number
  purchased: number
  bonus: number
}

export type OrganizationCreditsDto = {
  organizationId: string
  creditBalance: CreditBalanceDto
}

