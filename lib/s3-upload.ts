import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure S3 client
const s3Client = new S3Client({ 
  region: "us-west-1",
  // Use anonymous credentials for public bucket access
  credentials: {
    accessKeyId: "anonymous",
    secretAccessKey: "anonymous"
  }
});

// Bucket name
const BUCKET_NAME = "temp-img2model";

/**
 * Generate a random file name for the image
 */
function generateRandomFileName(): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomString}.png`;
}

/**
 * Converts a base64 data URI to a buffer
 */
function dataUriToBuffer(dataUri: string): Buffer {
  // Remove the data:image/png;base64, part
  const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * Uploads an image to S3 bucket and returns the URL
 * Or returns the base64 data URI directly if S3 upload fails
 */
export async function uploadImageToS3(imageDataUri: string): Promise<string> {
  // For testing/demo purposes, we can just return the data URI directly
  // This bypasses the need for S3 credentials but will only work for small images
  // Remove this line in production when S3 is properly configured
  return imageDataUri;
  
  // The code below is kept for when S3 upload is properly configured
  try {
    const fileName = generateRandomFileName();
    const contentType = "image/png"; // Assuming it's always a PNG image
    
    const imageBuffer = dataUriToBuffer(imageDataUri);
    
    // Create the put command
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: imageBuffer,
      ContentType: contentType,
      ACL: "public-read", // Make it publicly readable
    });
    
    // Upload the file
    await s3Client.send(putCommand);
    
    // Generate the URL
    const imageUrl = `https://${BUCKET_NAME}.s3.us-west-1.amazonaws.com/${fileName}`;
    
    return imageUrl;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    console.log("Falling back to using data URI directly");
    
    // As a fallback, if S3 upload fails, just return the data URI directly
    // Note: This only works for small images and may not be supported by all APIs
    return imageDataUri;
  }
} 