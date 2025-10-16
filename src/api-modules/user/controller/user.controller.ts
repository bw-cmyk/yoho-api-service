import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Body,
  HttpCode,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request as ExpressRequest } from 'express';
import { User } from '../entity/user.entity';
import { UserService } from '../service/user.service';
import { AuthService } from '../../../common-modules/auth/auth.service';

import { DiscordAuthGuard } from '../socialmedia/discord/discord.guard';
import { GoogleAuthGuard } from '../socialmedia/google/google.guard';
import { TwitterAuthGuard } from '../socialmedia/twitter/twitter.guard';
import { AppleAuthGuard } from '../socialmedia/apple/apple.guard';
import { FacebookAuthGuard } from '../socialmedia/facebook/facebook.guard';

import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import {
  CheckPolicies,
  PoliciesGuard,
} from 'src/common-modules/casl/PoliciesGuard';
import { WritePolicyHandler } from 'src/common-modules/casl/policy';
import { BotIMLoginParams } from '../dto/BotIMUserBaseInfo';

@Controller('/api/v1/user')
export class UserController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async profile(@Request() req: ExpressRequest): Promise<Partial<User>> {
    const { id, role } = req.user as any;
    const user = await this.userService.getUser(id);
    user.role = role;
    return user;
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies(new WritePolicyHandler())
  @UseGuards(JwtAuthGuard)
  @Post('/profile')
  @HttpCode(200)
  async updateProfile(@Request() req: ExpressRequest) {
    const { id } = req.user as any;
    await this.userService.updateUserProfile({
      id,
      ...req.body,
    });
    return {
      success: true,
    };
  }

  @Post('/login')
  async login(@Body() body): Promise<any> {
    const user = await this.userService.login({
      username: body.username,
      verifyCode: body.verifyCode,
    });
    return this.authService.login(user);
  }

  @Post('/email/login')
  async sendLoginEmail(@Body() { email }: { email: string }): Promise<any> {
    if (!email) {
      throw new UnauthorizedException(`Invalid email`);
    }

    await this.userService.sendLoginEmail(email);

    return {
      success: true,
    };
  }

  // @Post('/login/magic-link/send')
  // async sendMagicLink(
  //   @Body() { email, callbackURL }: { email: string; callbackURL: string },
  // ): Promise<any> {
  //   if (!email || !callbackURL) {
  //     throw new UnauthorizedException();
  //   }

  //   const magicLink = new MagicLink();
  //   const token = magicLink.generateMagicLinkToken(email);

  //   const result = await sendEmail(
  //     email,
  //     `${callbackURL}?type=magic-link&token=${token}`,
  //   );

  //   return result;
  // }

  // @Post('/login/magic-link/verify')
  // async VerifyMagicLink(@Body() { token }: { token: string }): Promise<any> {
  //   if (!token) {
  //     throw new UnauthorizedException();
  //   }

  //   const magicLink = new MagicLink();
  //   const result = magicLink.verifyToken(token);

  //   if (!result?.email) {
  //     throw new UnauthorizedException('Invalid token');
  //   }

  //   const user = await this.userService.findOrCreateUserWithEmail(result.email);
  //   return this.authService.login(user);
  // }

  // @UseGuards(TwitterAuthGuard)
  // @Get('/login/twitter')
  // async twitterAuth(): Promise<any> {
  //   return {};
  // }

  // @UseGuards(TwitterAuthGuard)
  // @Post('/login/twitter')
  // async twitterLogin(@Request() req: ExpressRequest): Promise<any> {
  //   const { id, username, displayName } = req.user as any;
  //   if (!id || !username) {
  //     throw new UnauthorizedException();
  //   }

  //   const user = await this.userService.findOrCreateUserWithTwitter(
  //     id,
  //     username,
  //     displayName,
  //   );
  //   return this.authService.login(user);
  // }

  // @UseGuards(DiscordAuthGuard)
  // @Get('/login/discord')
  // async discordAuth(): Promise<any> {
  //   return {};
  // }

  // @UseGuards(DiscordAuthGuard)
  // @Post('/login/discord')
  // async discordLogin(@Request() req: ExpressRequest): Promise<any> {
  //   const { id, username, discriminator } = req.user as any;
  //   if (!id || !username) {
  //     throw new UnauthorizedException();
  //   }

  //   const user = await this.userService.findOrCreateUserWithDiscord(
  //     id,
  //     `${username}#${discriminator}`,
  //   );
  //   return this.authService.login(user);
  // }

  @UseGuards(GoogleAuthGuard)
  @Get('/login/google')
  async googleAuth(): Promise<any> {
    return {};
  }

  @UseGuards(GoogleAuthGuard)
  @Post('/login/google')
  async googleLogin(@Request() req: ExpressRequest): Promise<any> {
    const { id, displayName, emails } = req.user as any;
    const email = emails[0]?.value;
    if (!id) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOrCreateUserWithGoogle(
      id,
      email,
      displayName,
    );
    return this.authService.login(user);
  }

  // @UseGuards(AppleAuthGuard)
  // @Get('/login/apple')
  // async appleAuth(): Promise<any> {
  //   return {};
  // }

  // @UseGuards(AppleAuthGuard)
  // @Post('/login/apple')
  // async appleLogin(@Request() req: ExpressRequest): Promise<any> {
  //   const { sub: id, email } = req.user as any;
  //   if (!id) {
  //     throw new UnauthorizedException();
  //   }

  //   const user = await this.userService.findOrCreateUserWithApple(id, email);
  //   return this.authService.login(user);
  // }

  // @UseGuards(FacebookAuthGuard)
  // @Get('/login/facebook')
  // async facebookAuth(@Request() req: ExpressRequest): Promise<any> {
  //   return {};
  // }

  // @UseGuards(FacebookAuthGuard)
  // @Post('/login/facebook')
  // async facebookLogin(@Request() req: ExpressRequest): Promise<any> {
  //   const { id, displayName } = req.user as any;

  //   const user = await this.userService.findOrCreateUserWithFacebook(
  //     id,
  //     displayName,
  //   );
  //   return this.authService.login(user);
  // }

  // @UseGuards(GoogleAuthGuard)
  // @Get('/google/bind')
  // async googleBindUrl(): Promise<any> {
  //   return {};
  // }

  // @UseGuards(PoliciesGuard)
  // @CheckPolicies(new WritePolicyHandler())
  // @UseGuards(GoogleAuthGuard)
  // @UseGuards(JwtAuthGuard)
  // @Post('/google/bind')
  // async googleBind(@Request() req: ExpressRequest): Promise<any> {
  //   const authorization = (req.header('Authorization') || '').replace(
  //     'Bearer ',
  //     '',
  //   );

  //   const userToken = jwt.decode(authorization);
  //   const { id, emails } = req.user as any;
  //   const email = emails[0]?.value;
  //   if (!id) {
  //     throw new UnauthorizedException();
  //   }

  //   if (userToken.sub) {
  //     const user = await this.userService.bindGoogle(
  //       userToken.sub as string,
  //       id,
  //       email,
  //     );
  //   }
  //   return {
  //     success: true,
  //   };
  // }

  // @UseGuards(FacebookAuthGuard)
  // @Get('/facebook/bind')
  // async facebookBindUrl(@Request() req: ExpressRequest): Promise<any> {
  //   return {};
  // }

  // @UseGuards(PoliciesGuard)
  // @CheckPolicies(new WritePolicyHandler())
  // @UseGuards(FacebookAuthGuard)
  // @UseGuards(JwtAuthGuard)
  // @Post('/facebook/bind')
  // async facebookBind(@Request() req: ExpressRequest): Promise<any> {
  //   const authorization = (req.header('Authorization') || '').replace(
  //     'Bearer ',
  //     '',
  //   );

  //   const userToken = jwt.decode(authorization);
  //   const { id } = req.user as any;

  //   if (userToken.sub) {
  //     const user = await this.userService.bindFacebook(
  //       userToken.sub as string,
  //       id,
  //     );
  //   }
  //   return {
  //     success: true,
  //   };
  // }

  // @UseGuards(AppleAuthGuard)
  // @Get('/apple/bind')
  // async appleBindUrl(@Request() req: ExpressRequest): Promise<any> {
  //   return {};
  // }

  // @UseGuards(PoliciesGuard)
  // @CheckPolicies(new WritePolicyHandler())
  // @UseGuards(AppleAuthGuard)
  // @UseGuards(JwtAuthGuard)
  // @Post('/apple/bind')
  // async appleBind(@Request() req: ExpressRequest): Promise<any> {
  //   const authorization = (req.header('Authorization') || '').replace(
  //     'Bearer ',
  //     '',
  //   );

  //   const userToken = jwt.decode(authorization);

  //   const { sub: id, email } = req.user as any;
  //   if (!id) {
  //     throw new UnauthorizedException();
  //   }

  //   if (userToken.sub) {
  //     const user = await this.userService.bindApple(
  //       userToken.sub as string,
  //       id,
  //       email,
  //     );
  //   }
  //   return {
  //     success: true,
  //   };
  // }

  @Post('/login/botim')
  @HttpCode(200)
  async botimLogin(@Body() params: BotIMLoginParams) {
    // authenticate user and create user in db
    const user = await this.userService.findOrCreateUserWithBotIM(params);
    // sign jwt token
    return this.authService.login(user);
  }
}
