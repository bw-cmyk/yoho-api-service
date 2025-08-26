import { Controller, Get, Query } from '@nestjs/common';
import { UserService } from '../service/user.service';

@Controller('/api/v1/inner')
export class InnerController {
  constructor(private userService: UserService) {}

  @Get('/users')
  async getAllUsers(
    @Query('username') username?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    const offset = (page - 1) * pageSize;
    return this.userService.getUsers({
      username,
      offset,
      limit: pageSize,
    });
  }
}
