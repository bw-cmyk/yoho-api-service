import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class AdminUploadService {
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  private readonly apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

  async uploadToCloudflare(
    file: UploadedFile,
  ): Promise<{ url: string; id: string }> {
    if (!this.accountId || !this.apiToken) {
      throw new BadRequestException('Cloudflare credentials not configured');
    }

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            ...formData.getHeaders(),
          },
        },
      );

      if (!response.data.success) {
        throw new BadRequestException(
          response.data.errors?.[0]?.message || 'Upload failed',
        );
      }

      const result = response.data.result;
      // 返回公开访问的 URL
      const url = result.variants?.[0] || `https://imagedelivery.net/${this.accountId}/${result.id}/public`;

      return {
        id: result.id,
        url,
      };
    } catch (error) {
      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.errors?.[0]?.message || 'Upload failed',
        );
      }
      throw error;
    }
  }

  async deleteFromCloudflare(imageId: string): Promise<boolean> {
    if (!this.accountId || !this.apiToken) {
      throw new BadRequestException('Cloudflare credentials not configured');
    }

    try {
      const response = await axios.delete(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1/${imageId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      return response.data.success;
    } catch (error) {
      console.error('Failed to delete image from Cloudflare:', error);
      return false;
    }
  }
}
