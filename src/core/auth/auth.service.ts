import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvVars } from 'src/config/envValidationSchema';
import { EncryptionService } from 'src/core/encryption/encryption.service';
import { User } from 'src/modules/users/entity/user.entity';
import { UsersService } from 'src/modules/users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly encryptionService: EncryptionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvVars, true>,
  ) {}
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email, { pw: true });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordsMatch = await this.encryptionService.compare(password, user.password);

    if (!isPasswordsMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);
    const { password: _, refreshTokenHash, ...safeUser } = user;
    return { ...safeUser, ...tokens };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, ...userData } = registerDto;

    const alreadyExistUser = await this.usersService.findByEmail(email);

    if (alreadyExistUser) throw new ConflictException('Email already exists');

    const hashedPassword = await this.encryptionService.hash(password);

    const user = await this.usersService.createUser({
      ...userData,
      email,
      password: hashedPassword,
    });

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async logout(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) throw new NotFoundException('User id not found');

    await this.usersService.updateRefreshTokenHash(userId, null);
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRY'),
        secret: this.configService.get('JWT_SECRET'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRY'),
        secret: this.configService.get('JWT_SECRET'),
      }),
    ]);

    const hashedRt = await this.encryptionService.hash(refresh_token);

    await this.usersService.updateRefreshTokenHash(user.id, hashedRt);

    return { access_token, refresh_token };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId, { refHash: true });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access Denied');
    }

    const isMatch = await this.encryptionService.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) throw new UnauthorizedException('Access Denied');

    return this.generateTokens(user);
  }
}
