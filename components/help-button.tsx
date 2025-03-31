'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppTour } from '@/components/app-tour'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function HelpButton() {
  const { startTour } = useAppTour()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={startTour}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Start guided tour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 