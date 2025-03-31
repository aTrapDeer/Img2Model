import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Simple in-memory cache for model data (lasts until server restart)
const modelCache = new Map<string, ArrayBuffer>();

export const maxDuration = 60; // Allow longer processing time

export async function GET(request: NextRequest) {
  try {
    // Get URL from query parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    // Check cache first
    if (modelCache.has(url)) {
      console.log(`Serving cached model for: ${url.substring(0, 60)}...`);
      const cachedData = modelCache.get(url)!;
      
      return new NextResponse(cachedData, {
        status: 200,
        headers: {
          'Content-Type': 'model/gltf-binary',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
    
    console.log(`Proxying model request for: ${url}`);
    
    // Special handling for Meshy URLs
    if (url.includes('meshy.ai')) {
      // Use native fetch for better binary handling on Meshy URLs
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://app.meshy.ai',
            'Referer': 'https://app.meshy.ai/',
          },
        });
        
        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch model: ${response.status} ${response.statusText}` },
            { status: response.status }
          );
        }
        
        // Get the model data as ArrayBuffer
        const modelData = await response.arrayBuffer();
        
        if (!modelData || modelData.byteLength === 0) {
          return NextResponse.json(
            { error: 'Empty model data received' },
            { status: 500 }
          );
        }
        
        // Check if it's a GLB file by looking at the magic bytes
        const isGlb = modelData.byteLength > 4 && 
                      new Uint32Array(modelData.slice(0, 4))[0] === 0x46546C67; // "glTF" in ASCII
        
        if (isGlb) {
          console.log("GLB format detected from file header");
        }
        
        // Cache the model data for future requests
        modelCache.set(url, modelData);
        
        console.log(`Successfully proxied model (${modelData.byteLength} bytes, type: model/gltf-binary)`);
        
        return new NextResponse(modelData, {
          status: 200,
          headers: {
            'Content-Type': 'model/gltf-binary',
            'Content-Length': modelData.byteLength.toString(),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } catch (error: any) {
        console.error('Error proxying model with fetch:', error);
        return NextResponse.json(
          { 
            error: 'Error fetching model file', 
            details: error.message || 'Unknown error',
            url 
          },
          { status: 500 }
        );
      }
    }
    
    // For non-Meshy URLs, use Axios
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxContentLength: 10 * 1024 * 1024, // 10 MB
      });
      
      if (!response.data) {
        return NextResponse.json(
          { error: 'Empty model data received' },
          { status: 500 }
        );
      }
      
      // Convert response data to ArrayBuffer
      let modelData: ArrayBuffer;
      if (response.data instanceof ArrayBuffer) {
        modelData = response.data;
      } else {
        // If it's somehow not an ArrayBuffer, try to convert it
        try {
          const buffer = Buffer.from(response.data);
          modelData = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          );
        } catch (e) {
          console.error('Error converting response to ArrayBuffer:', e);
          return NextResponse.json(
            { error: 'Failed to process model data' },
            { status: 500 }
          );
        }
      }
      
      // Cache the model data
      modelCache.set(url, modelData);
      
      console.log(`Successfully proxied model (${modelData.byteLength} bytes)`);
      
      return new NextResponse(modelData, {
        status: 200,
        headers: {
          'Content-Type': 'model/gltf-binary',
          'Content-Length': modelData.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (error: any) {
      console.error('Error proxying model with axios:', error);
      return NextResponse.json(
        { 
          error: 'Error fetching model file', 
          details: error.message || 'Unknown error',
          url,
          axiosError: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers
          } : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in proxy route:', error);
    return NextResponse.json(
      { error: 'Unexpected server error', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 