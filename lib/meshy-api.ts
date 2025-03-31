import axios from 'axios';
import { uploadImageToS3 } from './s3-upload';

// Get the Meshy API key from environment variables
const MESHY_API_KEY = process.env.NEXT_PUBLIC_MESHY_API_KEY;

export interface MeshyTaskResponse {
  id: string;
  status: string;
  result: {
    model_url?: string;
    texture_url?: string;
    model?: string;
    model_urls?: {
      glb?: string;
      [key: string]: any;
    };
    [key: string]: any; // Allow any other properties in the result
  };
  // Add top-level properties that might be present in different API versions
  model_url?: string;
  model?: string;
  model_urls?: {
    glb?: string;
    [key: string]: any;
  };
}

/**
 * Converts a canvas or image to a base64 data URI
 */
export function imageToDataURI(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Sends an image to Meshy API for 3D model generation using S3 for storage
 */
export async function createMeshyTask(imageDataUri: string): Promise<string> {
  if (!MESHY_API_KEY) {
    throw new Error('Meshy API key is not configured. Please set NEXT_PUBLIC_MESHY_API_KEY in .env.local');
  }

  try {
    // First, upload the image to S3 and get the public URL
    console.log("Uploading image to S3...");
    const imageUrl = await uploadImageToS3(imageDataUri);
    console.log("Image uploaded successfully, URL:", imageUrl);
    
    // Now use that URL with Meshy API
    const headers = { Authorization: `Bearer ${MESHY_API_KEY}` };
    const payload = {
      image_url: imageUrl,
      enable_pbr: true,
      should_remesh: true,
      should_texture: true,
      topology: 'quad',
      target_polycount: 30000
    };

    console.log("Sending request to Meshy API with payload:", payload);
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );
    
    console.log("Meshy API response:", response.data);
    
    // The response format seems to be different than expected
    // Check if we have a result directly in the response object
    let taskId;
    
    if (response.data && response.data.result) {
      // It could be the task ID is directly in result as a string
      if (typeof response.data.result === 'string') {
        taskId = response.data.result;
      } 
      // Or it could be nested in an object with an id property
      else if (response.data.result.id) {
        taskId = response.data.result.id;
      }
    }
    
    if (!taskId) {
      throw new Error(`Invalid response from Meshy API: ${JSON.stringify(response.data)}`);
    }
    
    return taskId;
  } catch (error) {
    console.error('Error creating Meshy task:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
    }
    throw error;
  }
}

/**
 * Checks the status of a Meshy task
 */
export async function checkMeshyTaskStatus(taskId: string): Promise<MeshyTaskResponse> {
  if (!MESHY_API_KEY) {
    throw new Error('Meshy API key is not configured');
  }

  const headers = { Authorization: `Bearer ${MESHY_API_KEY}` };

  try {
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    
    console.log("Meshy status check response:", response.data);
    
    // Create response with the format we need for our UI
    const taskStatus: MeshyTaskResponse = {
      id: taskId,
      status: response.data.status || 'processing',
      result: {} // Initialize with empty object - required field
    };
    
    // Add result data if we received it
    if (response.data) {
      // Add the raw response data as the result
      Object.assign(taskStatus.result, response.data);
      
      // Extract model URL from various possible locations
      let originalModelUrl = null;
      
      // Check the most common locations for model URLs in the API response
      if (response.data.model_url) {
        originalModelUrl = response.data.model_url;
      } else if (response.data.model_urls && response.data.model_urls.glb) {
        originalModelUrl = response.data.model_urls.glb;
      } else if (response.data.result && response.data.result.model_url) {
        originalModelUrl = response.data.result.model_url;
      } else if (response.data.result && response.data.result.model_urls && response.data.result.model_urls.glb) {
        originalModelUrl = response.data.result.model_urls.glb;
      } else if (response.data.output && response.data.output.model_url) {
        originalModelUrl = response.data.output.model_url;
      }
      
      // Log the extracted original URL
      if (originalModelUrl) {
        console.log(`Found original model URL: ${originalModelUrl}`);
      } else {
        console.warn("Could not find model URL in Meshy response");
        console.log("Full response:", JSON.stringify(response.data, null, 2));
      }
      
      // If we found a model URL, proxy it through our API
      if (originalModelUrl) {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(originalModelUrl)}`;
        taskStatus.result.model_url = proxyUrl;
        console.log(`Proxied model URL: ${proxyUrl}`);
      }
      
      // Handle texture URLs similarly if present
      let originalTextureUrl = null;
      if (response.data.texture_url) {
        originalTextureUrl = response.data.texture_url;
      } else if (response.data.texture_urls && response.data.texture_urls.length > 0) {
        originalTextureUrl = response.data.texture_urls[0].image_url;
      } else if (response.data.result && response.data.result.texture_url) {
        originalTextureUrl = response.data.result.texture_url;
      } else if (response.data.result && response.data.result.texture_urls && response.data.result.texture_urls.length > 0) {
        originalTextureUrl = response.data.result.texture_urls[0].image_url;
      }
      
      // Proxy texture URL if found
      if (originalTextureUrl) {
        const proxyTextureUrl = `/api/proxy?url=${encodeURIComponent(originalTextureUrl)}`;
        taskStatus.result.texture_url = proxyTextureUrl;
      }
    }
    
    return taskStatus;
  } catch (error) {
    console.error('Error checking Meshy task status:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
    }
    throw error;
  }
} 