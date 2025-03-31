import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  // Get URL from query parameter
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }
  
  try {
    // First, try a HEAD request to get headers
    try {
      const headResponse = await axios.head(url, {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://app.meshy.ai',
          'Referer': 'https://app.meshy.ai/',
        },
        timeout: 5000
      });
      
      // Return the headers
      return NextResponse.json({
        success: true,
        method: 'HEAD',
        url,
        status: headResponse.status,
        headers: headResponse.headers,
        message: 'URL is accessible'
      });
    } catch (headError) {
      console.log('HEAD request failed, trying GET request...');
    }
    
    // If HEAD fails, try a GET request with ranged bytes to avoid downloading the whole file
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://app.meshy.ai',
        'Referer': 'https://app.meshy.ai/',
        'Range': 'bytes=0-1023' // Get just first KB
      },
      timeout: 10000,
      maxContentLength: 1024 * 5 // 5KB max to prevent large downloads
    });
    
    // If we got here, the URL is accessible
    return NextResponse.json({
      success: true,
      method: 'GET',
      url,
      status: response.status,
      headers: response.headers,
      contentLength: response.headers['content-length'],
      contentType: response.headers['content-type'],
      sampleSize: response.data.byteLength,
      message: 'URL is accessible'
    });
  } catch (error: any) {
    // Format error response
    const errorResponse: any = {
      success: false,
      url,
      message: 'URL is not accessible',
      error: error.message
    };
    
    // Add axios-specific error details if available
    if (axios.isAxiosError(error)) {
      errorResponse.status = error.response?.status;
      errorResponse.statusText = error.response?.statusText;
      errorResponse.headers = error.response?.headers;
    }
    
    return NextResponse.json(errorResponse, { status: 200 });
  }
} 