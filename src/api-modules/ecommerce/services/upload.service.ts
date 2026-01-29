import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface UploadResult {
  url: string;
  id: string;
  thumbnailUrl?: string;
}

@Injectable()
export class UploadService {
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  private readonly imagesApiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  private readonly streamApiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  /**
   * 上传图片到 Cloudflare Images
   */
  async uploadImage(file: UploadedFile): Promise<UploadResult> {
    if (!this.accountId || !this.imagesApiToken) {
      throw new BadRequestException('Cloudflare credentials not configured');
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        '不支持的图片格式，请上传 JPG/PNG/GIF/WEBP 格式',
      );
    }

    // 验证文件大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.buffer.length > maxSize) {
      throw new BadRequestException('图片大小不能超过 10MB');
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
      const url =
        result.variants?.[0] ||
        `https://imagedelivery.net/${this.accountId}/${result.id}/public`;

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

  /**
   * 上传视频到 Cloudflare Stream
   */
  async uploadVideo(file: UploadedFile): Promise<UploadResult> {
    if (!this.accountId || !this.streamApiToken) {
      throw new BadRequestException(
        'Cloudflare Stream credentials not configured',
      );
    }

    // 验证文件类型
    const allowedTypes = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        '不支持的视频格式，请上传 MP4/MOV/WEBM/AVI 格式',
      );
    }

    // 验证文件大小 (最大 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (file.buffer.length > maxSize) {
      throw new BadRequestException('视频大小不能超过 200MB');
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
   * 根据文件类型自动选择上传方式
   */
  async upload(
    file: UploadedFile,
  ): Promise<UploadResult & { type: 'IMAGE' | 'VIDEO' }> {
    if (file.mimetype.startsWith('image/')) {
      const result = await this.uploadImage(file);
      return { ...result, type: 'IMAGE' };
    } else if (file.mimetype.startsWith('video/')) {
      const result = await this.uploadVideo(file);
      return { ...result, type: 'VIDEO' };
    } else {
      throw new BadRequestException('不支持的文件类型');
    }
  }

  /**
   * 删除图片
   */
  async deleteImage(imageId: string): Promise<boolean> {
    if (!this.accountId || !this.imagesApiToken) {
      return false;
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
   * 删除视频
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    if (!this.accountId || !this.streamApiToken) {
      return false;
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
}
