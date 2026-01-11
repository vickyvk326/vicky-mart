import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserMapper } from './mapper/user.mapper';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll(@Query() pagination: PaginationDto) {
    const paginationResult = await this.usersService.findAll(pagination);
    return paginationResult;
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return user;
  }
}
