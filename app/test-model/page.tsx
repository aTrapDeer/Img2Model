"use client"

import { useState, useEffect } from "react"
import ModelViewer from "@/components/model-viewer"
import { Loader2 } from "lucide-react"

export default function TestModelPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  // The URL from Meshy AI
  const meshyModelUrl = "https://assets.meshy.ai/dde223bd-6cb0-4ab7-8971-b7a01460f124/tasks/0195e61d-bbb3-7cff-8cae-74b6772e40c0/output/model.glb?Expires=1743581827&Signature=eNGxxnxhXPJbECK7YNTVh0Ll2DjrfKUCe5QMmOl2XWb2jaAz8Ezg4p1R~LWo2BRlv~ONgu8jph4UiCyTDfUGYEcJfdW2AsdaBwM3skr-UXuup8N7blMYprc0uD7nlca95JnuheHNDBvz4vRnKrgQUtTOwktxNOeWfj8ZE0qhaOpzhxDt80lFNC9d3VwGCHFZBKIe~l4xdBWGZcTNVEGlfEsiCcJByw4ahPLEhp0HAitg4T7dm7pVuCSizQx~89uQ4pY2NxHhXqlPqxn1q4I39~L9WUJdyhHfOexnPiBA0-WCdxAsC6WIESrziVzLmk7kaOOUXnTP3i3CD-4~ZKgWhg__&Key-Pair-Id=KL5I0C8H7HX83"
  
  // Proxied URL for fetching the model (this is the key to making it work)
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(meshyModelUrl)}`
  const debugUrl = `/api/proxy-debug?url=${encodeURIComponent(meshyModelUrl)}`

  useEffect(() => {
    async function fetchDebugInfo() {
      setLoading(true)
      try {
        const response = await fetch(debugUrl)
        const data = await response.json()
        setDebugInfo(data)
      } catch (error) {
        console.error("Error fetching debug info:", error)
        setDebugInfo({ error: "Failed to fetch debug info" })
      } finally {
        setLoading(false)
      }
    }

    fetchDebugInfo()
  }, [debugUrl])
  
  // Handle model loading errors
  const handleModelError = (error: Error) => {
    console.error("Model loading error:", error)
    setModelError(error.message)
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Model Test Page</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">3D Model Viewer</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-[500px] relative">
            {modelError ? (
              <div className="absolute inset-0 flex items-center justify-center flex-col p-4 text-red-500">
                <p className="text-center font-medium mb-2">Error loading model:</p>
                <p className="text-sm text-center">{modelError}</p>
              </div>
            ) : (
              <ModelViewer modelUrl={proxiedUrl} onError={handleModelError} />
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">Debug Info:</h3>
        <div className="text-sm font-mono overflow-x-auto">
          <p>Original URL:</p>
          <p className="text-xs break-all">{meshyModelUrl}</p>
          <p className="mt-2">Proxied URL:</p>
          <p className="text-xs break-all">{proxiedUrl}</p>
          
          {loading ? (
            <div className="mt-4 flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Loading debug info...</span>
            </div>
          ) : debugInfo ? (
            <div className="mt-4">
              <h4 className="font-medium">API Response:</h4>
              <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-auto max-h-[300px]">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
} 