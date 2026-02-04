import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { ShowcaseService } from '../services/showcase.service';
import { UploadService } from '../services/upload.service';
import { ShowcaseCommentService } from '../services/showcase-comment.service';
import { ShowcaseShareService } from '../services/showcase-share.service';
import { CreateShowcaseDto, ShowcaseQueryDto } from '../dto/showcase.dto';
import {
  CreateCommentDto,
  CommentQueryDto,
} from '../dto/showcase-comment.dto';
import { CreateShareDto } from '../dto/showcase-share.dto';

@ApiTags('晒单')
@ApiBearerAuth()
@Controller('api/v1/showcase')
export class ShowcaseController {
  constructor(
    private readonly showcaseService: ShowcaseService,
    private readonly uploadService: UploadService,
    private readonly commentService: ShowcaseCommentService,
    private readonly shareService: ShowcaseShareService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '上传图片或视频' })
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Request() req: ExpressRequest,
  ) {
    const result = await this.uploadService.upload({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    return {
      type: result.type,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      cloudflareId: result.id,
    };
  }

  @Post('upload/batch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量上传图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 9))
  async uploadFiles(
    @UploadedFiles() files: any[],
    @Request() req: ExpressRequest,
  ) {
    const results = await Promise.all(
      files.map(async (file) => {
        const result = await this.uploadService.upload({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        });
        return {
          type: result.type,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          cloudflareId: result.id,
        };
      }),
    );

    return { items: results };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建晒单' })
  async create(
    @Body() dto: CreateShowcaseDto,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    return await this.showcaseService.create(userId, dto, req);
  }

  @Get()
  @ApiOperation({ summary: '获取晒单列表' })
  async findAll(
    @Query() query: ShowcaseQueryDto,
    @Request() req: ExpressRequest,
  ) {
    const currentUserId = req.user ? (req.user as any).id : undefined;
    return await this.showcaseService.findAll(query, currentUserId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的晒单列表' })
  async findMy(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    return await this.showcaseService.findMyShowcases(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取晒单详情' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest,
  ) {
    const currentUserId = req.user ? (req.user as any).id : undefined;
    return await this.showcaseService.findOne(id, currentUserId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '点赞/取消点赞' })
  async toggleLike(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    return await this.showcaseService.toggleLike(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除晒单' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    await this.showcaseService.remove(id, userId);
    return { success: true };
  }

  // ==================== 评论相关 ====================

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建评论' })
  async createComment(
    @Param('id', ParseIntPipe) showcaseId: number,
    @Body() dto: CreateCommentDto,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    return await this.commentService.create(showcaseId, userId, dto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取晒单的评论列表' })
  async getComments(
    @Param('id', ParseIntPipe) showcaseId: number,
    @Query() query: CommentQueryDto,
  ) {
    return await this.commentService.findByShowcase(showcaseId, query);
  }

  @Get('comments/:id/replies')
  @ApiOperation({ summary: '获取评论的回复列表' })
  async getCommentReplies(
    @Param('id', ParseIntPipe) commentId: number,
    @Query() query: CommentQueryDto,
  ) {
    return await this.commentService.findReplies(commentId, query);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除自己的评论' })
  async deleteComment(
    @Param('id', ParseIntPipe) commentId: number,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    await this.commentService.delete(commentId, userId);
    return { success: true };
  }

  // ==================== 分享相关 ====================

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '记录分享' })
  async recordShare(
    @Param('id', ParseIntPipe) showcaseId: number,
    @Body() dto: CreateShareDto,
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return await this.shareService.recordShare(showcaseId, userId, dto, {
      userAgent,
      ipAddress,
    });
  }

  @Get(':id/share-data')
  @ApiOperation({ summary: '获取分享数据' })
  async getShareData(@Param('id', ParseIntPipe) showcaseId: number) {
    return await this.shareService.generateShareData(showcaseId);
  }

  // ==================== 中奖晒单 ====================

  @Post('winner')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建中奖晒单' })
  async createWinnerShowcase(
    @Body() dto: CreateShowcaseDto & { drawResultId: number },
    @Request() req: ExpressRequest,
  ) {
    const { id: userId } = req.user as any;
    const { drawResultId, ...showcaseDto } = dto;
    return await this.showcaseService.createFromDrawResult(
      userId,
      drawResultId,
      showcaseDto,
      req,
    );
  }

  @Get('winners')
  @ApiOperation({ summary: '获取中奖晒单列表' })
  async getWinnerShowcases(
    @Query() query: ShowcaseQueryDto,
    @Request() req: ExpressRequest,
  ) {
    const currentUserId = req.user ? (req.user as any).id : undefined;
    return await this.showcaseService.findWinnerShowcases(query, currentUserId);
  }
}
