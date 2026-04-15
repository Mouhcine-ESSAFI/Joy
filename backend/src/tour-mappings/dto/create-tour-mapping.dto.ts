import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTourMappingDto {
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  productTitle: string;

  @IsString()
  @IsOptional()
  productSku?: string;

  @IsString()
  @IsOptional()
  tourCode?: string;
}