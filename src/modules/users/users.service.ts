import { EntityManager } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino/PinoLogger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RegisterDto, UpdateUserDto } from 'src/core/auth/dto/auth.dto';
import { UsersRepository } from './repository/users.repository';
@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly em: EntityManager,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }
  async findAll(pagination: PaginationDto, options: { pw?: boolean; refHash?: boolean } = {}) {
    const exclude: string[] = [];
    if (!options.pw) exclude.push('password');
    if (!options.refHash) exclude.push('refreshTokenHash');
    return await this.userRepository.findAllWithPagination(pagination, {}, { exclude } as any);
  }

  async findById(id: string, options: { pw?: boolean; refHash?: boolean } = {}) {
    const exclude: string[] = [];
    if (!options.pw) exclude.push('password');
    if (!options.refHash) exclude.push('refreshTokenHash');

    const user = await this.userRepository.findById(id, { exclude } as any);
    return user;
  }

  async findByEmail(email: string, options: { pw?: boolean; refHash?: boolean } = {}) {
    const exclude: string[] = [];
    if (!options.pw) exclude.push('password');
    if (!options.refHash) exclude.push('refreshTokenHash');

    const user = await this.userRepository.findByEmail(email, { exclude } as any);
    return user;
  }

  async createUser(createUserData: RegisterDto) {
    const user = this.userRepository.create(createUserData);
    await this.em.persist(user).flush();
    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    return await this.userRepository.nativeUpdate(id, data);
  }
  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    const result = await this.userRepository.nativeUpdate(userId, {
      refreshTokenHash,
    });

    if (result === 0) {
      throw new NotFoundException('User not found');
    }
    return result;
  }
}
