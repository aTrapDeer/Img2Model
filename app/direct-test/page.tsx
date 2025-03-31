"use client"

import { useEffect, useState } from "react"
import ModelViewer from "@/components/model-viewer"
import { Loader2, Download, AlertCircle, CheckCircle } from "lucide-react"

export default function DirectTestPage() {
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const [viewerLoadStatus, setViewerLoadStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  
  // The exact URL from the user's request
  const originalModelUrl = "https://assets.meshy.ai/dde223bd-6cb0-4ab7-8971-b7a01460f124/tasks/0195e612-506f-777f-b50c-7fb56ac2ecb7/output/model.glb?Expires=1743581105&Signature=LXRHKRtdLkv~cfl1JVcFZzCLJ17B8rF8xlpJYvY~tcb3S~d8mqeGx7WaO5SrD5TxMIs8RMdVMnBi3QV4Ac2~5Z385WuABltkqUHdyAgY59glHj6BZtnAbNTS2QOAN52Xf8A1RWpH01iM8lyfw~jleudv4hKhbbUwz~uT~ITlLnGxJ8URW~XKUUSGS3NSUomor33fd5h9L5crhZPxLZE~3hWUb8YM8pe1vxtGNXwYIUKRzsxgytY0eCbXq2naCvuPpkPSXiPBJll0wetMdvGZAa1MSj5qy52Mm73dQEbpzJZzTULZCcSFrqIaDu~l8OMnFdk7nviznR4Z-vcju42I9g__&Key-Pair-Id=KL5I0C8H7HX83"
  
  // Our proxied URL
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(originalModelUrl)}`

  // Test direct fetch to check if the model is available
  useEffect(() => {
    async function testFetch() {
      setLoading(true)
      setErrorMessage(null)
      
      try {
        // Try to fetch just the headers to check if the URL is valid
        const response = await fetch(`/api/proxy-debug?url=${encodeURIComponent(originalModelUrl)}`)
        const data = await response.json()
        
        console.log("Debug response:", data)
        setDebugInfo(data)
        
        if (!data.success) {
          setErrorMessage(`Error from debug API: ${data.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error("Error testing model URL:", error)
        setErrorMessage(`Error testing URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }
    
    testFetch()
  }, [originalModelUrl])
  
  // Direct download handler
  const handleDirectDownload = async () => {
    setDownloadLoading(true)
    setErrorMessage(null)
    
    try {
      const headers = {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Origin': 'https://app.meshy.ai',
        'Referer': 'https://app.meshy.ai/'
      };
      
      // Direct fetch from Meshy (we'll use our proxy which already has the proper headers set up)
      const response = await fetch(proxiedUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Get the model as a blob
      const blob = await response.blob();
      
      // Create a local URL to use
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      
      // Create a download link for the user
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meshy-model.glb';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading model directly:", error);
      setErrorMessage(`Direct download error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadLoading(false);
    }
  };
  
  // Handle model load errors
  const handleModelError = (error: Error) => {
    console.error("Model viewer error:", error);
    setModelLoadError(error.message);
    setViewerLoadStatus('error');
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Direct Model Test</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleDirectDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          disabled={downloadLoading}
        >
          {downloadLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloadLoading ? 'Downloading...' : 'Download Model File'}
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 mr-2 animate-spin" />
          <span>Testing model URL accessibility...</span>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <div>
                  <p className="font-semibold">Error:</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          {modelLoadError && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <div>
                  <p className="font-semibold">Model Viewer Error:</p>
                  <p>{modelLoadError}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Using Proxy API
                {viewerLoadStatus === 'success' && (
                  <span className="ml-2 text-sm text-green-600 inline-flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" /> Loaded Successfully
                  </span>
                )}
              </h2>
              <div className="bg-gray-100 rounded-lg p-4 h-[500px]">
                <ModelViewer 
                  modelUrl={proxiedUrl}
                  onError={handleModelError}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Using proxied URL to avoid CORS issues
              </p>
            </div>
            
            {blobUrl && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Using Local Blob URL</h2>
                <div className="bg-gray-100 rounded-lg p-4 h-[500px]">
                  <ModelViewer 
                    modelUrl={blobUrl}
                    onError={(error) => console.error("Blob URL load error:", error)}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Using directly downloaded model blob
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium mb-2">URL Information:</h3>
            <div className="text-sm font-mono overflow-x-auto">
              <p className="font-semibold">Original URL:</p>
              <p className="text-xs break-all">{originalModelUrl}</p>
              <p className="mt-2 font-semibold">Proxied URL:</p>
              <p className="text-xs break-all">{proxiedUrl}</p>
              {blobUrl && (
                <>
                  <p className="mt-2 font-semibold">Local Blob URL:</p>
                  <p className="text-xs break-all">{blobUrl}</p>
                </>
              )}
              
              {debugInfo && (
                <div className="mt-4">
                  <h4 className="font-medium">Debug Info:</h4>
                  <pre className="text-xs mt-2 p-2 bg-gray-200 rounded overflow-auto max-h-[300px]">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 