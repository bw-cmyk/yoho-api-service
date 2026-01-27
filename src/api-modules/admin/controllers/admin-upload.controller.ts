import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
          return cb(new BadRequestException('Only image files are allowed'), false);
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
}
