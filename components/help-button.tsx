'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppTour } from '@/components/app-tour'

export function HelpButton() {
  const { startTour } = useAppTour()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => startTour()}
      className="text-muted-foreground hover:text-foreground hover:bg-muted"
      title="Start guided tour"
    >
      <HelpCircle className="h-5 w-5" />
      <span className="sr-only">Help</span>
    </Button>
  )
} 