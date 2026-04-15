import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { StoreStatus } from '../entities/shopify-store.entity';

export class CreateShopifyStoreDto {
  @IsString()
  @IsNotEmpty()
  internalName: string;

  @IsString()
  @IsNotEmpty()
  shopifyDomain: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  apiVersion?: string;

  @IsEnum(StoreStatus)
  @IsOptional()
  status?: StoreStatus;

  // 🔑 Webhook secret
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}
