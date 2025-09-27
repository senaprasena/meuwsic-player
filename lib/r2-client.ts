import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Cloudflare R2 Client Configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export class R2Service {
  private bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  private publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

  /**
   * Test R2 connection by listing objects
   */
  async testConnection(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1,
      });
      
      await r2Client.send(command);
      console.log('✅ R2 connection successful');
      return true;
    } catch (error) {
      console.error('❌ R2 connection failed:', error);
      return false;
    }
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    file: Buffer, 
    key: string, 
    contentType: string = 'audio/mpeg'
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        // Add metadata for better caching and access
        CacheControl: 'public, max-age=31536000', // 1 year
        Metadata: {
          uploadedAt: new Date().toISOString(),
        },
      });

      await r2Client.send(command);
      
      const publicUrl = `${this.publicUrl}/${key}`;
      
      return {
        success: true,
        key,
        url: publicUrl,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * List all files in the bucket
   */
  async listFiles(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });
      
      const response = await r2Client.send(command);
      return response.Contents?.map(obj => obj.Key || '') || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }
}

export const r2Service = new R2Service();

// Export the raw client for direct usage
export { r2Client };