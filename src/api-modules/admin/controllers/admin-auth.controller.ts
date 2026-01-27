import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AdminGoogleAuthGuard } from '../guards/admin-google.guard';
import { AdminAuthService } from '../services/admin-auth.service';

@ApiTags('Admin - 认证')
@Controller('api/v1/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get('google')
  @UseGuards(AdminGoogleAuthGuard)
  @ApiOperation({ summary: 'Google 登录' })
  async googleAuth() {
    // Guard 会重定向到 Google
  }

  @Get('google/callback')
  @UseGuards(AdminGoogleAuthGuard)
  @ApiOperation({ summary: 'Google 登录回调' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const googleUser = req.user as {
        googleId: string;
        email: string;
        displayName: string;
        avatar?: string;
      };

      // 验证用户并检查权限
      const user = await this.adminAuthService.validateGoogleUser(googleUser);

      // 生成 token
      const result = await this.adminAuthService.login(user);

      // 重定向到前端，带上 token
      const frontendUrl =
        process.env.ADMIN_FRONTEND_URL || 'http://localhost:3000/admin';
      res.redirect(
        `${frontendUrl}/login/callback?token=${result.access_token}`,
      );
    } catch (error) {
      const frontendUrl =
        process.env.ADMIN_FRONTEND_URL || 'http://localhost:3000/admin';
      const errorMessage = encodeURIComponent(error.message || '登录失败');
      res.redirect(`${frontendUrl}/login?error=${errorMessage}`);
    }
  }

  @Get('verify')
  @ApiOperation({ summary: '验证 Token' })
  async verifyToken(@Query('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    const payload = await this.adminAuthService.verifyToken(token);
    return { valid: true, user: payload };
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const token = authHeader.substring(7);
    const payload = await this.adminAuthService.verifyToken(token);
    return payload;
  }
}
