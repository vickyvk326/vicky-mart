import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino/PinoLogger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RegisterDto, UpdateUserDto } from 'src/core/auth/dto/auth.dto';
import { User } from 'src/modules/users/entity/user.entity';
import { UsersRepository } from './repository/users.repository';
@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }
  async findAll(pagination: PaginationDto) {
    return await this.userRepository.findAllWithPagination(pagination);
  }

  async findById(id: string, options: { pw?: boolean; refHash?: boolean } = {}) {
    const selectFields: (keyof User)[] = ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'];

    if (options.pw) selectFields.push('password');
    if (options.refHash) selectFields.push('refreshTokenHash');

    return await this.userRepository.findOne({
      where: { id },
      select: selectFields,
    });
  }

  async findByEmail(email: string, options: { pw?: boolean; refHash?: boolean } = {}) {
    const selectFields: (keyof User)[] = ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'];

    if (options.pw) selectFields.push('password');
    if (options.refHash) selectFields.push('refreshTokenHash');

    return await this.userRepository.findOne({
      where: { email },
      select: selectFields,
    });
  }

  async createUser(registerDto: RegisterDto) {
    const user = this.userRepository.create(registerDto);
    return await this.userRepository.save(user);
  }

  async update(id: string, data: UpdateUserDto) {
    return await this.userRepository.update(id, data);
  }
  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    const result = await this.userRepository.update(userId, {
      refreshTokenHash,
    });

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return result;
  }
}
