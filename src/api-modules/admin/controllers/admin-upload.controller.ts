import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AdminUploadService } from '../services/admin-upload.service';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@ApiTags('Admin - 文件上传')
@ApiBearerAuth()
@Controller('api/v1/admin/upload')
export class AdminUploadController {
  constructor(private readonly uploadService: AdminUploadService) {}

  @Post('image')
  @ApiOperation({ summary: '上传图片到 Cloudflare Images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadToCloudflare(file);

    return {
      success: true,
      data: result,
    };
  }

  @Post('video')
  @ApiOperation({ summary: '上传视频到 Cloudflare Stream' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '视频文件 (支持 MP4, MOV, WEBM, AVI 格式，最大 200MB)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^video\/(mp4|quicktime|webm|x-msvideo)$/)) {
          return cb(
            new BadRequestException(
              'Only video files (MP4, MOV, WEBM, AVI) are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadVideoToCloudflare(file);

    return {
      success: true,
      data: result,
    };
  }

  @Post('media')
  @ApiOperation({ summary: '通用上传（自动识别图片或视频）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '图片或视频文件',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB（允许视频）
      },
      fileFilter: (req, file, cb) => {
        // 允许图片和视频
        if (
          !file.mimetype.match(
            /^(image\/(jpeg|png|gif|webp|svg\+xml)|video\/(mp4|quicktime|webm|x-msvideo))$/,
          )
        ) {
          return cb(
            new BadRequestException('Only image or video files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadMedia(@UploadedFile() file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadMedia(file);

    return {
      success: true,
      data: result,
    };
  }
}
