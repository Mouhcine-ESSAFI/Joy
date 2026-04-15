import { IsInt, IsString, IsArray, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateRoomTypeRuleDto {
  @IsInt()
  @Min(1)
  paxMin: number;

  @IsInt()
  @Min(1)
  paxMax: number;

  @IsString()
  defaultRoomType: string;

  @IsArray()
  @IsString({ each: true })
  allowedRoomTypes: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}