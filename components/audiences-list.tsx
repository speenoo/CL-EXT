'use client'

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { getPlatformLogo } from '~lib/platform-logos'
import type { ExtensionAudienceDto } from '~types/dtos/extension-audience-dto'

export type AudiencesListProps = {
  audiences: ExtensionAudienceDto[]
  status: 'idle' | 'loading' | 'success' | 'error'
  selectedAudienceId?: string | null
  onSelectAudience?: (audience: ExtensionAudienceDto) => void
}

export function AudiencesList({
  audiences,
  status,
  selectedAudienceId,
  onSelectAudience,
}: AudiencesListProps) {
  return (
    <>
      {status === 'loading' && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {status === 'success' && audiences && audiences.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Audiences</h2>
          <div className="space-y-2">
            {audiences.map((audience) => (
              <button
                key={audience.id}
                onClick={() => onSelectAudience?.(audience)}
                className={`w-full rounded-md border p-2 text-sm transition-colors ${
                  selectedAudienceId === audience.id
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                }`}>
                <p className="font-medium leading-none text-left">{audience.name}</p>
                {audience.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 text-left">
                    {audience.description}
                  </p>
                )}
                <div className="mt-2 flex gap-1">
                  {audience.linkedin && (
                    <div className="flex items-center gap-0.5 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-900">
                      <img
                        src={getPlatformLogo('linkedin').src}
                        alt={getPlatformLogo('linkedin').alt}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">LinkedIn</span>
                    </div>
                  )}
                  {audience.google && (
                    <div className="flex items-center gap-0.5 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-900">
                      <img
                        src={getPlatformLogo('google').src}
                        alt={getPlatformLogo('google').alt}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">Google</span>
                    </div>
                  )}
                  {audience.facebook && (
                    <div className="flex items-center gap-0.5 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-900">
                      <img
                        src={getPlatformLogo('facebook').src}
                        alt={getPlatformLogo('facebook').alt}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">Facebook</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <Separator className="mt-4" />
        </div>
      )}
    </>
  )
}

export default AudiencesList
