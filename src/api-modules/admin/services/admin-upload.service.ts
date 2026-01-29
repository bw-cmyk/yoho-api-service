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
  private readonly imagesApiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  private readonly streamApiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  async uploadToCloudflare(
    file: UploadedFile,
  ): Promise<{ url: string; id: string }> {
    if (!this.accountId || !this.imagesApiToken) {
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
            Authorization: `Bearer ${this.imagesApiToken}`,
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
    if (!this.accountId || !this.imagesApiToken) {
      throw new BadRequestException('Cloudflare credentials not configured');
    }

    try {
      const response = await axios.delete(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1/${imageId}`,
        {
          headers: {
            Authorization: `Bearer ${this.imagesApiToken}`,
          },
        },
      );

      return response.data.success;
    } catch (error) {
      console.error('Failed to delete image from Cloudflare:', error);
      return false;
    }
  }

  /**
   * 上传视频到 Cloudflare Stream
   */
  async uploadVideoToCloudflare(
    file: UploadedFile,
  ): Promise<{ url: string; id: string; thumbnailUrl?: string }> {
    if (!this.accountId || !this.streamApiToken) {
      throw new BadRequestException(
        'Cloudflare Stream credentials not configured',
      );
    }

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

      if (!response.data.success) {
        throw new BadRequestException(
          response.data.errors?.[0]?.message || 'Upload failed',
        );
      }

      const result = response.data.result;
      const url = result.playback?.hls || result.preview;
      const thumbnailUrl = result.thumbnail;

      return {
        id: result.uid,
        url,
        thumbnailUrl,
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

  /**
   * 删除视频
   */
  async deleteVideoFromCloudflare(videoId: string): Promise<boolean> {
    if (!this.accountId || !this.streamApiToken) {
      throw new BadRequestException('Cloudflare credentials not configured');
    }

    try {
      const response = await axios.delete(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
          },
        },
      );

      return response.data.success;
    } catch (error) {
      console.error('Failed to delete video from Cloudflare:', error);
      return false;
    }
  }

  /**
   * 根据文件类型自动上传（图片或视频）
   */
  async uploadMedia(
    file: UploadedFile,
  ): Promise<{ url: string; id: string; type: 'IMAGE' | 'VIDEO'; thumbnailUrl?: string }> {
    if (file.mimetype.startsWith('image/')) {
      const result = await this.uploadToCloudflare(file);
      return { ...result, type: 'IMAGE' };
    } else if (file.mimetype.startsWith('video/')) {
      const result = await this.uploadVideoToCloudflare(file);
      return { ...result, type: 'VIDEO' };
    } else {
      throw new BadRequestException('不支持的文件类型');
    }
  }
}
