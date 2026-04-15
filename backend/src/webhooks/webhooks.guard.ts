import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto'; // ← Added timingSafeEqual
import { ShopifyStore } from '../shopify-stores/entities/shopify-store.entity';

@Injectable()
export class ShopifyWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ShopifyWebhookGuard.name);

  constructor(
    @InjectRepository(ShopifyStore)
    private shopifyStoresRepository: Repository<ShopifyStore>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const hmacHeader = request.headers['x-shopify-hmac-sha256'];
    const shopDomain = request.headers['x-shopify-shop-domain'];
    
    this.logger.log(`📦 Webhook received from: ${shopDomain}`);
    
    if (!hmacHeader || !shopDomain) {
      this.logger.error('❌ Missing Shopify headers');
      throw new UnauthorizedException('Missing Shopify headers');
    }

    // Get the store's webhook secret from database
    const secret = await this.getWebhookSecret(shopDomain);
    
    if (!secret) {
      this.logger.error(`❌ No webhook secret found for domain: ${shopDomain}`);
      throw new UnauthorizedException('Unknown shop domain or missing webhook secret');
    }

    // ⭐ CRITICAL: Use rawBody (preserved by rawBody: true in main.ts)
    const rawBody = (request as any).rawBody;
    
    if (!rawBody) {
      this.logger.error('❌ Raw body not available! Ensure rawBody: true in main.ts');
      throw new UnauthorizedException('Raw body not available');
    }

    this.logger.debug(`📏 Raw body length: ${rawBody.length} bytes`);

    // Calculate HMAC-SHA256 signature
    const hash = createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    this.logger.debug(`🔒 Calculated: ${hash.substring(0, 20)}...`);
    this.logger.debug(`📨 Received: ${hmacHeader.substring(0, 20)}...`);

    // ⭐ Use timing-safe comparison to prevent timing attacks
    try {
      const isValid = timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(hmacHeader)
      );

      if (!isValid) {
        this.logger.error('❌ Invalid webhook signature');
        return false;
      }

      this.logger.log('✅ Webhook signature verified successfully!');
      return true;

    } catch (error) {
      this.logger.error('❌ Signature comparison failed');
      this.logger.error(error.message);
      return false;
    }
  }

  private async getWebhookSecret(shopDomain: string): Promise<string | null> {
    const store = await this.shopifyStoresRepository.findOne({ 
      where: { shopifyDomain: shopDomain } 
    });

    if (store?.webhookSecret) {
      this.logger.log(`🔐 Using webhook secret from database for ${shopDomain}`);
      return store.webhookSecret;
    }

    this.logger.error(`❌ Store ${shopDomain} not found in database or has no webhook secret`);
    return null;
  }
}