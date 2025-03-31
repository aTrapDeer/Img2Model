"use client"

import { useState, useEffect } from "react"
import ModelViewer from "@/components/model-viewer"
import { Loader2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ModelOption {
  id: number
  name: string
  url: string
}

interface ModelUrls {
  direct: string
  proxied: string
  debug: string
}

export default function TestModelsPage() {
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState<number>(0)
  const [modelUrls, setModelUrls] = useState<ModelUrls | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [debugLoading, setDebugLoading] = useState(false)

  // Load available test models
  useEffect(() => {
    async function loadTestModels() {
      setLoading(true)
      try {
        const response = await fetch('/api/test-model')
        const data = await response.json()
        setModels(data.availableModels)
        setModelUrls(data.modelUrls)
      } catch (error) {
        console.error("Error loading test models:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadTestModels()
  }, [])

  // Handle model selection
  const handleModelSelect = async (modelId: number) => {
    setSelectedModel(modelId)
    setLoading(true)
    setDebugInfo(null)
    
    try {
      const response = await fetch(`/api/test-model?index=${modelId}`)
      const data = await response.json()
      setModelUrls(data.modelUrls)
    } catch (error) {
      console.error("Error loading model URLs:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load debug info for the selected model
  const loadDebugInfo = async () => {
    if (!modelUrls) return
    
    setDebugLoading(true)
    try {
      const response = await fetch(modelUrls.debug)
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error("Error fetching debug info:", error)
      setDebugInfo({ error: "Failed to fetch debug info" })
    } finally {
      setDebugLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Model Viewer Test Suite</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
      
      <div className="mb-4">
        <a 
          href="/direct-test" 
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Direct Test with Latest Model URL
        </a>
      </div>
      
      {loading && !modelUrls ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 mr-2 animate-spin" />
          <span>Loading available models...</span>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Select a Test Model:</h2>
            <div className="flex flex-wrap gap-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`px-3 py-1 rounded-md ${
                    selectedModel === model.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>
          
          {modelUrls && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Using Proxy API</h2>
                <div className="bg-muted rounded-lg p-4 h-[400px]">
                  <ModelViewer modelUrl={modelUrls.proxied} />
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Debug Information:</h3>
              <button
                onClick={loadDebugInfo}
                disabled={debugLoading}
                className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm"
              >
                {debugLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  'Get Debug Info'
                )}
              </button>
            </div>
            
            {modelUrls && (
              <div className="mt-4 text-sm font-mono overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Direct URL:</p>
                    <p className="text-xs break-all">{modelUrls.direct}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Proxied URL:</p>
                    <p className="text-xs break-all">{modelUrls.proxied}</p>
                  </div>
                </div>
                
                {debugInfo && (
                  <div className="mt-4">
                    <h4 className="font-medium">API Response:</h4>
                    <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-[300px]">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
} 