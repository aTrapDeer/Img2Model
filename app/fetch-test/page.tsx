"use client"

import { useEffect, useState } from "react"
import ModelViewer from "@/components/model-viewer"
import { Loader2, Download } from "lucide-react"

export default function FetchTestPage() {
  const [loading, setLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // The Meshy URL from the user
  const meshyModelUrl = "https://assets.meshy.ai/dde223bd-6cb0-4ab7-8971-b7a01460f124/tasks/0195e612-506f-777f-b50c-7fb56ac2ecb7/output/model.glb?Expires=1743581105&Signature=LXRHKRtdLkv~cfl1JVcFZzCLJ17B8rF8xlpJYvY~tcb3S~d8mqeGx7WaO5SrD5TxMIs8RMdVMnBi3QV4Ac2~5Z385WuABltkqUHdyAgY59glHj6BZtnAbNTS2QOAN52Xf8A1RWpH01iM8lyfw~jleudv4hKhbbUwz~uT~ITlLnGxJ8URW~XKUUSGS3NSUomor33fd5h9L5crhZPxLZE~3hWUb8YM8pe1vxtGNXwYIUKRzsxgytY0eCbXq2naCvuPpkPSXiPBJll0wetMdvGZAa1MSj5qy52Mm73dQEbpzJZzTULZCcSFrqIaDu~l8OMnFdk7nviznR4Z-vcju42I9g__&Key-Pair-Id=KL5I0C8H7HX83"
  
  // Our proxied URL
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(meshyModelUrl)}`

  // Download the file directly
  const handleDirectDownload = async () => {
    setLoading(true)
    setErrorMessage(null)
    
    try {
      const headers = {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Origin': 'https://app.meshy.ai',
        'Referer': 'https://app.meshy.ai/'
      };
      
      // Direct fetch from Meshy
      const response = await fetch(meshyModelUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Get the model as a blob
      const blob = await response.blob();
      
      // Create a local download URL
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      
      // Also create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meshy-model.glb';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading model directly:', error);
      setErrorMessage(`Direct download error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Direct Fetch Test</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleDirectDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          disabled={loading}
        >
          <Download className="w-4 h-4" />
          {loading ? 'Downloading...' : 'Download Directly'}
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
            Model via Proxy
          </h2>
          <div className="bg-gray-100 rounded-lg p-4 h-[500px]">
            <ModelViewer 
              modelUrl={proxiedUrl} 
              onError={(error) => setErrorMessage(error.message)}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Using proxied URL to avoid CORS issues
          </p>
        </div>
        
        {downloadUrl && (
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Directly Downloaded Model
            </h2>
            <div className="bg-gray-100 rounded-lg p-4 h-[500px]">
              <ModelViewer 
                modelUrl={downloadUrl} 
                onError={(error) => setErrorMessage(error.message)}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Using locally downloaded blob URL
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">URL Information:</h3>
        <div className="text-sm font-mono overflow-x-auto">
          <p className="font-semibold">Original URL:</p>
          <p className="text-xs break-all">{meshyModelUrl}</p>
          <p className="mt-2 font-semibold">Proxied URL:</p>
          <p className="text-xs break-all">{proxiedUrl}</p>
          {downloadUrl && (
            <>
              <p className="mt-2 font-semibold">Local Blob URL:</p>
              <p className="text-xs">{downloadUrl}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 