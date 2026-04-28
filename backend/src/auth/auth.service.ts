import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private buildPayload(user: any) {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      stores: user.accessibleShopifyStores,
      permissions: user.permissions,
      assignedTransportCode: user.assignedTransportCode ?? null,
    };
  }

  private signAccessToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
    } as any);
  }

  private signRefreshToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    } as any);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Account is inactive');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = this.buildPayload(user);

    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(user.id, refreshHash);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        accessibleShopifyStores: user.accessibleShopifyStores,
        permissions: user.permissions,
        assignedTransportCode: user.assignedTransportCode ?? null,
      },
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || user.status !== 'active') throw new UnauthorizedException('Unauthorized');
    if (!user.refreshTokenHash) throw new UnauthorizedException('Unauthorized');

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Unauthorized');

    const payload = this.buildPayload(user);

    const newAccessToken = this.signAccessToken(payload);
    const newRefreshToken = this.signRefreshToken(payload);

    const newHash = await bcrypt.hash(newRefreshToken, 10);
    await this.usersService.updateRefreshTokenHash(user.id, newHash);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshTokenHash(userId, null);
    return { success: true };
  }
}
