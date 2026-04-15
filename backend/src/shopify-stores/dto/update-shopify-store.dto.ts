import { PartialType } from '@nestjs/mapped-types';
import { CreateShopifyStoreDto } from './create-shopify-store.dto';

export class UpdateShopifyStoreDto extends PartialType(CreateShopifyStoreDto) {}
