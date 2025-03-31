import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const modelUrl = url.searchParams.get('url');
    
    if (!modelUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }
    
    console.log(`Debug proxy for model request: ${modelUrl}`);
    
    // Special handling for Meshy URLs - they need specific headers
    const isMeshyUrl = modelUrl.includes('assets.meshy.ai');
    
    const headers: Record<string, string> = {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    };
    
    // Add Origin and Referer for Meshy URLs to bypass their protection
    if (isMeshyUrl) {
      headers['Origin'] = 'https://app.meshy.ai';
      headers['Referer'] = 'https://app.meshy.ai/';
    }
    
    // For Meshy URLs, use direct fetch
    if (isMeshyUrl) {
      try {
        console.log("Using fetch API for Meshy URL debug check");
        // Just test if the URL is accessible with a HEAD request
        const response = await fetch(modelUrl, {
          headers,
          method: 'HEAD',
        });
        
        const contentLength = response.headers.get('content-length') || 'unknown';
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Convert headers to a plain object
        const headerObj: Record<string, string> = {};
        response.headers.forEach((value, name) => {
          headerObj[name] = value;
        });
        
        // Return debug information
        return NextResponse.json({
          success: true,
          url: modelUrl,
          headers: headerObj,
          contentType,
          contentLength,
          isGlb: contentType === 'model/gltf-binary' || modelUrl.endsWith('.glb'),
          headResponseStatus: response.status,
          proxyUrl: `/api/proxy?url=${encodeURIComponent(modelUrl)}`
        });
      } catch (fetchError) {
        console.error('Error checking Meshy URL with fetch:', fetchError);
        return NextResponse.json({
          error: 'Failed to fetch model with fetch API',
          url: modelUrl,
          success: false,
          message: fetchError instanceof Error ? fetchError.message : String(fetchError)
        }, { status: 200 });
      }
    }
    
    // For non-Meshy URLs, continue with the previous approach
    // Try an initial HEAD request to get headers without downloading the full file
    let headResponse = null;
    try {
      headResponse = await axios.head(modelUrl, { headers, timeout: 5000 });
    } catch (e) {
      console.log("HEAD request failed, will skip header info:", e instanceof Error ? e.message : String(e));
    }
    
    // Now get a small part of the file to verify content
    try {
      const response = await axios.get(modelUrl, {
        responseType: 'arraybuffer',
        headers: {
          ...headers,
          'Range': 'bytes=0-1023' // Get first KB only for verification
        },
        timeout: 10000
      });
      
      // Get content type and other headers
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const contentLength = response.headers['content-length'] || 'unknown';
      
      // Safely check if file appears to be a GLB (binary GLTF) file
      let isGlb = false;
      if (response.data && response.data.byteLength >= 4) {
        try {
          const view = new DataView(response.data);
          // GLB files start with the ASCII values for 'glTF'
          isGlb = view.getUint32(0, false) === 0x676C5446; // 'glTF' in hex
        } catch (e) {
          console.error('Error checking GLB format:', e);
        }
      }
      
      // Return debug information
      return NextResponse.json({
        success: true,
        url: modelUrl,
        headers: headResponse ? headResponse.headers : response.headers,
        contentType,
        contentLength,
        isGlb,
        sampleBytesLength: response.data.byteLength,
        headResponseStatus: headResponse ? headResponse.status : 'Failed',
        getResponseStatus: response.status,
        proxyUrl: `/api/proxy?url=${encodeURIComponent(modelUrl)}`
      });
    } catch (error) {
      console.error('Error debugging model file:', error);
      
      // Return detailed error information
      const errorResponse: any = {
        error: 'Failed to fetch model',
        url: modelUrl,
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
      
      if (axios.isAxiosError(error)) {
        errorResponse.statusCode = error.response?.status;
        errorResponse.statusText = error.response?.statusText;
        errorResponse.headers = error.response?.headers;
        
        if (typeof error.response?.data === 'string') {
          errorResponse.data = error.response.data.substring(0, 200);
        } else if (error.response?.data instanceof ArrayBuffer) {
          errorResponse.dataSize = error.response.data.byteLength;
        }
      }
      
      return NextResponse.json(errorResponse, { 
        status: 200, // Return 200 even for errors to avoid double errors in client
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (outerError) {
    console.error('Unexpected error in proxy-debug route:', outerError);
    return NextResponse.json({ 
      error: 'Unexpected error in proxy-debug route', 
      success: false,
      message: outerError instanceof Error ? outerError.message : String(outerError)
    }, { status: 200 });
  }
} 