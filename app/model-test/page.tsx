"use client"

import { useEffect, useState } from "react"
import ModelViewer from "@/components/model-viewer"
import { Loader2, Download, RefreshCw } from "lucide-react"

export default function ModelTestPage() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [modelSource, setModelSource] = useState<'meshy' | 'sample'>('meshy')
  
  // The Meshy URL that was giving us issues
  const meshyModelUrl = "https://assets.meshy.ai/dde223bd-6cb0-4ab7-8971-b7a01460f124/tasks/0195e612-506f-777f-b50c-7fb56ac2ecb7/output/model.glb?Expires=1743581105&Signature=LXRHKRtdLkv~cfl1JVcFZzCLJ17B8rF8xlpJYvY~tcb3S~d8mqeGx7WaO5SrD5TxMIs8RMdVMnBi3QV4Ac2~5Z385WuABltkqUHdyAgY59glHj6BZtnAbNTS2QOAN52Xf8A1RWpH01iM8lyfw~jleudv4hKhbbUwz~uT~ITlLnGxJ8URW~XKUUSGS3NSUomor33fd5h9L5crhZPxLZE~3hWUb8YM8pe1vxtGNXwYIUKRzsxgytY0eCbXq2naCvuPpkPSXiPBJll0wetMdvGZAa1MSj5qy52Mm73dQEbpzJZzTULZCcSFrqIaDu~l8OMnFdk7nviznR4Z-vcju42I9g__&Key-Pair-Id=KL5I0C8H7HX83"
  
  // A known good sample model from Khronos
  const sampleModelUrl = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb"
  
  // Create proxied URLs for both models
  const meshyProxiedUrl = `/api/proxy?url=${encodeURIComponent(meshyModelUrl)}`
  const sampleProxiedUrl = `/api/proxy?url=${encodeURIComponent(sampleModelUrl)}`
  
  // Current model URL based on selected source
  const currentModelUrl = modelSource === 'meshy' ? meshyProxiedUrl : sampleProxiedUrl

  // Download the model file directly
  const handleDownload = async () => {
    setLoading(true)
    try {
      // Use the proxy to get the file
      const response = await fetch(currentModelUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = modelSource === 'meshy' ? 'meshy-model.glb' : 'duck-model.glb';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading model:', error);
      setErrorMessage(`Download error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Switch between Meshy model and sample model
  const toggleModelSource = () => {
    setModelSource(prev => prev === 'meshy' ? 'sample' : 'meshy');
    setErrorMessage(null);
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Enhanced Model Test</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={toggleModelSource}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4" />
          {loading ? 'Switching...' : `Switch to ${modelSource === 'meshy' ? 'Sample' : 'Meshy'} Model`}
        </button>
        
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          disabled={loading}
        >
          <Download className="w-4 h-4" />
          {loading ? 'Downloading...' : 'Download Model'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error:</p>
          <p>{errorMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">
            {modelSource === 'meshy' ? 'Meshy Model (Via Proxy)' : 'Sample Duck Model (Via Proxy)'}
          </h2>
          <div className="bg-gray-100 rounded-lg p-4 h-[500px]">
            <ModelViewer 
              modelUrl={currentModelUrl} 
              onError={(error) => setErrorMessage(error.message)}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Using proxied URL with caching to avoid CORS issues
          </p>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">URL Information:</h3>
        <div className="text-sm font-mono overflow-x-auto">
          <p className="font-semibold">Original URL:</p>
          <p className="text-xs break-all">
            {modelSource === 'meshy' ? meshyModelUrl : sampleModelUrl}
          </p>
          <p className="mt-2 font-semibold">Proxied URL:</p>
          <p className="text-xs break-all">{currentModelUrl}</p>
          <p className="mt-4 text-sm text-gray-600">
            The model is being loaded through our API proxy with caching to avoid CORS issues.
          </p>
        </div>
      </div>
    </div>
  )
} 