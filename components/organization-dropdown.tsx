'use client'

import * as React from 'react'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  SearchIcon
} from 'lucide-react'

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { EmptyText } from './ui/empty-text'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'

import type { OrganizationDto } from '~/types/dtos/organization-dto'
import { Button } from './ui/button'

export type OrganizationDropdownProps = {
  organizations: OrganizationDto[]
  currentOrganizationId?: string | null
  onSelect?: (organization: OrganizationDto) => void
  className?: string
}

export function OrganizationDropdown({
  organizations,
  currentOrganizationId,
  onSelect,
  className
}: OrganizationDropdownProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [open, setOpen] = React.useState(false)

  const activeOrganization = React.useMemo(() => {
    if (!organizations || organizations.length === 0) {
      return { id: '', name: '—', slug: '', logo: '' } as OrganizationDto
    }
    return (
      organizations.find((o) => o.id === currentOrganizationId) || organizations[0]
    )
  }, [organizations, currentOrganizationId])

  const filteredOrganizations = React.useMemo(
    () =>
      organizations.filter((org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [organizations, searchTerm]
  )

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) setSearchTerm('')
  }

  const handleSelect = (org: OrganizationDto) => {
    onSelect?.(org)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className={
            'flex w-full h-12 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-left text-sm shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none data-[state=open]:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 ' +
            (className || '')
          }
        >
          <Avatar className="aspect-square size-6 rounded-md">
            <AvatarImage className="rounded-md" src={activeOrganization.logo} />
            <AvatarFallback className="flex size-6 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
              {activeOrganization.name?.charAt(0)?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span className="truncate font-semibold leading-tight">
              {activeOrganization.name}
            </span>
            {typeof activeOrganization.creditsTotal === 'number' && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activeOrganization.creditsTotal.toLocaleString()} credits
              </span>
            )}
            <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="rounded-lg p-0 outline-none focus:outline-none"
        align="start"
        side="bottom"
        avoidCollisions={false}
        sideOffset={4}
        style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
      >
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 !border-none !shadow-none !outline-none !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0"
          />
        </div>
        <DropdownMenuSeparator />
        {filteredOrganizations.length === 0 ? (
          <EmptyText className="p-2">No organization found</EmptyText>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="p-2">
              {filteredOrganizations.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  className="cursor-pointer gap-2 p-2"
                  onClick={() => handleSelect(organization)}
                >
                  <Avatar className="aspect-square size-4 rounded-xs">
                    <AvatarImage className="rounded-xs" src={organization.logo} />
                    <AvatarFallback className="flex size-4 items-center justify-center rounded-xs border border-neutral-200 bg-neutral-100 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
                      {organization.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{organization.name}</span>

                  {typeof organization.creditsTotal === 'number' && (
                    <div className="ml-auto mr-2 flex items-center whitespace-nowrap text-xs text-muted-foreground">
                      {organization.creditsTotal.toLocaleString()} credits
                    </div>
                  )}

                  {activeOrganization.id === organization.id && (
                    <div className="flex size-4 items-center justify-center rounded-full bg-blue-500 text-primary-foreground">
                      <CheckIcon className="text-current size-3 shrink-0" />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default OrganizationDropdown
