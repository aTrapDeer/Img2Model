'use client'

import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePathname } from 'next/navigation'

interface TourStep {
  title: string
  description: string
  target: string
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center'
}

interface AppTourContextType {
  startTour: () => void
}

const AppTourContext = createContext<AppTourContextType | undefined>(undefined)

export function useAppTour() {
  const context = useContext(AppTourContext)
  if (!context) {
    throw new Error('useAppTour must be used within an AppTourProvider')
  }
  return context
}

interface AppTourProps {
  autoStart?: boolean
  children?: React.ReactNode
}

export function AppTour({ autoStart = true, children }: AppTourProps) {
  const pathname = usePathname()
  const [currentStep, setCurrentStep] = useState(0)
  const [showTour, setShowTour] = useState(false)
  const [hasCompletedTour, setHasCompletedTour] = useLocalStorage('hasCompletedTour', false)
  const [hasCompletedTestTour, setHasCompletedTestTour] = useLocalStorage('hasCompletedTestTour', false)
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [shouldHighlight, setShouldHighlight] = useState(false)
  
  // Use refs to prevent unnecessary re-renders
  const currentTargetRef = useRef<string>('')
  const isUpdatingHighlight = useRef(false)
  
  const isTestModelPage = pathname === '/test-models'

  const mainSteps: TourStep[] = [
    {
      title: 'Welcome to DesignVision 3D!',
      description: 'Let me show you how to use this app to create amazing 3D models from your drawings.',
      target: 'body',
      placement: 'center',
    },
    {
      title: 'Drawing Canvas',
      description: 'This is where you can create your 2D drawings. Use the tools below to draw shapes that will be converted to 3D!',
      target: '.drawing-panel',
    },
    {
      title: 'Drawing Tools',
      description: 'Use these tools to draw. You can switch between pencil, eraser, shapes and use the color picker to change colors.',
      target: '.drawing-tools',
    },
    {
      title: 'Image Upload',
      description: 'You can also upload your own images to convert to 3D models. Look for the image upload button in the toolbar.',
      target: '.image-upload',
    },
    {
      title: '3D Model Viewer',
      description: 'This is where your drawing will be transformed into a 3D model. After drawing, click "Generate Model Now" to see the magic happen!',
      target: '.model-panel',
    },
    {
      title: 'Generate Your 3D Model',
      description: 'Once you\'re happy with your drawing, click this button to transform it into a 3D model.',
      target: '.generate-button',
    },
  ]

  const testModelSteps: TourStep[] = [
    {
      title: 'Model Test Suite',
      description: 'This page allows you to test and view various 3D models.',
      target: 'body',
      placement: 'center',
    },
    {
      title: 'Direct Test',
      description: 'This button takes you to a page to test the latest model directly.',
      target: '.direct-test-button',
    },
    {
      title: 'Model Selection',
      description: 'Choose from various test models to display in the viewer below.',
      target: '.model-selection',
    },
    {
      title: 'Model Viewer',
      description: 'This is where the selected 3D model is displayed. You can rotate, zoom, and pan to examine it.',
      target: '.model-viewer-container',
    },
    {
      title: 'Debug Information',
      description: 'View technical details about the model including direct and proxied URLs.',
      target: '.debug-section',
    },
  ]

  const steps = isTestModelPage ? testModelSteps : mainSteps
  const hasCompleted = isTestModelPage ? hasCompletedTestTour : hasCompletedTour
  const setHasCompleted = isTestModelPage ? setHasCompletedTestTour : setHasCompletedTour

  // Update the target element when the step changes
  useEffect(() => {
    if (!showTour) {
      setShouldHighlight(false)
      return;
    }

    const currentTarget = steps[currentStep]?.target;
    if (!currentTarget) {
      setShouldHighlight(false)
      return;
    }

    // Don't highlight for the welcome screen
    if (currentTarget === 'body') {
      setShouldHighlight(false)
      return;
    }

    currentTargetRef.current = currentTarget;
    
    // Use a timeout to prevent the infinite update loop
    const timer = setTimeout(() => {
      updateHighlightPosition(currentTarget);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [showTour, currentStep, steps]);

  // Separate function to update the highlight position
  const updateHighlightPosition = (targetSelector: string) => {
    if (isUpdatingHighlight.current) return;
    
    try {
      isUpdatingHighlight.current = true;
      
      const targetElement = document.querySelector(targetSelector) as HTMLElement;
      if (!targetElement) {
        setShouldHighlight(false);
        isUpdatingHighlight.current = false;
        return;
      }
      
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      
      setHighlightPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height
      });
      
      setShouldHighlight(true);
      
      // Scroll to the element if not in view
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const viewportHeight = window.innerHeight;
      
      if (elementTop < 0 || elementBottom > viewportHeight) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      isUpdatingHighlight.current = false;
    }
  };

  useEffect(() => {
    if (autoStart && !hasCompleted) {
      startTour()
    }
  }, [autoStart, hasCompleted])

  const startTour = () => {
    setCurrentStep(0)
    setShowTour(true)
  }

  const endTour = () => {
    setShowTour(false)
    setShouldHighlight(false)
    setHasCompleted(true)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const contextValue = {
    startTour,
  }

  return (
    <AppTourContext.Provider value={contextValue}>
      {/* Only show the yellow border, no overlays */}
      {showTour && shouldHighlight && (
        <div 
          className="fixed pointer-events-none z-[51]"
          style={{
            top: `${highlightPosition.top}px`,
            left: `${highlightPosition.left}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`,
            border: '3px solid #FFD700',
            borderRadius: '4px',
            boxShadow: '0 0 0 4px rgba(255, 215, 0, 0.3), 0 0 0 9999px rgba(0, 0, 0, 0.25)',
            animation: 'pulse-border 2s infinite',
          }}
        />
      )}

      {/* Add a keyframe animation for the pulse effect */}
      <style jsx global>{`
        @keyframes pulse-border {
          0% {
            border-color: rgba(255, 215, 0, 0.7);
            box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.2), 0 0 0 9999px rgba(0, 0, 0, 0.25);
          }
          50% {
            border-color: rgba(255, 215, 0, 1);
            box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.25);
          }
          100% {
            border-color: rgba(255, 215, 0, 0.7);
            box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.2), 0 0 0 9999px rgba(0, 0, 0, 0.25);
          }
        }
      `}</style>

      {showTour && (
        <Dialog 
          open={showTour} 
          onOpenChange={(open) => {
            if (!open) endTour()
          }}
        >
          <DialogContent className="sm:max-w-md z-[9999]">
            <DialogHeader>
              <DialogTitle>{steps[currentStep]?.title}</DialogTitle>
              <DialogDescription>
                {steps[currentStep]?.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={endTour}
                >
                  Skip
                </Button>
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                  >
                    Back
                  </Button>
                )}
              </div>
              <Button 
                type="button" 
                onClick={nextStep}
              >
                {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {children}
    </AppTourContext.Provider>
  )
} 