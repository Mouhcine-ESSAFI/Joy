import { IsEmail, IsString, IsEnum, IsOptional, IsArray, IsObject, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsArray()
  @IsOptional()
  accessibleShopifyStores?: string[];

  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}