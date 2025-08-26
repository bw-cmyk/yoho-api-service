import {
  Controller,
  UseGuards,
  Get,
  Param,
  Query,
  BadRequestException,
  Post,
  Body,
} from '@nestjs/common';
import { UserService } from '../service/user.service';

@Controller('/api/v1/inner')
export class UserInternalController {
  constructor(private userService: UserService) {}

  @Get('/users/')
  async getUsers(@Query() query) {
    const users = await this.userService.getUser(query);
    return users;
  }

  @Post('/users/')
  async createUsers(@Body() body) {
    const users = await this.userService.createUserWithEmailUserName(
      body.email,
    );
    return users;
  }
}
