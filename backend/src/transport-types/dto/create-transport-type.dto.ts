import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateTransportTypeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}