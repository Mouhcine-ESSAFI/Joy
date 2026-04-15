import { Module } from '@nestjs/common';
import { ShopifyParserService } from './shopify-parser.service';

@Module({
  providers: [ShopifyParserService],
  exports: [ShopifyParserService],
})
export class ShopifyParserModule {}