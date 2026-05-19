import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTourMappingDto {
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  shopifyProductId: string;

  @IsString()
  @IsOptional()
  productTitle?: string; // Display only

  @IsString()
  @IsOptional()
  productSku?: string;

  @IsString()
  @IsOptional()
  tourCode?: string;
}