import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino/PinoLogger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RegisterDto, UpdateUserDto } from 'src/core/auth/dto/auth.dto';
import { User } from 'src/modules/users/entity/user.entity';
import { Repository } from 'typeorm';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }
  async findAll(pagination: PaginationDto) {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      skip: skip,
      take: limit,
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt', 'updated_at'],
    });

    this.logger.info(`Fetched ${users.length} users for page ${page} (Total: ${total})`);

    return {
      data: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
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
