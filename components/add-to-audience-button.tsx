'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import type { ExtensionAudienceDto } from '~types/dtos/extension-audience-dto'

export type AddToAudienceButtonProps = {
  selectedAudience: ExtensionAudienceDto | null
  isLoading?: boolean
  onAdd?: (audience: ExtensionAudienceDto) => Promise<void>
}

export function AddToAudienceButton({
  selectedAudience,
  isLoading = false,
  onAdd,
}: AddToAudienceButtonProps) {
  const handleClick = async () => {
    if (selectedAudience && onAdd) {
      try {
        await onAdd(selectedAudience)
      } catch (error) {
        console.error('Error adding to audience:', error)
      }
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!selectedAudience || isLoading}
      className="w-full"
      variant={selectedAudience ? 'default' : 'outline'}
    >
      {isLoading ? 'Adding...' : selectedAudience ? `Add to "${selectedAudience.name}"` : 'Select an audience'}
    </Button>
  )
}

export default AddToAudienceButton
