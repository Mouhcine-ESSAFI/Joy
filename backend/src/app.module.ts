import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShopifyStoresModule } from './shopify-stores/shopify-stores.module';
import { OrdersModule } from './orders/orders.module';
import { SupplementsModule } from './supplements/supplements.module';
import { TourMappingsModule } from './tour-mappings/tour-mappings.module';
import { RoomTypeRulesModule } from './room-type-rules/room-type-rules.module';
import { TransportTypesModule } from './transport-types/transport-types.module';
import { ShopifyParserModule } from './shopify-parser/shopify-parser.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SyncModule } from './sync/sync.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CustomersModule } from './shopify-customers/customers.module';
import { EventsModule } from './events/events.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Enable scheduled tasks
    ScheduleModule.forRoot(),

    // Rate limiting — global defaults, tightened per-route on sensitive endpoints
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000, // 1 minute window
        limit: 60,  // 60 requests per minute globally
      },
    ]),
    
    // Database connection with TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    
    UsersModule,
    AuthModule,
    ShopifyStoresModule,
    OrdersModule,
    SupplementsModule,
    TourMappingsModule,
    RoomTypeRulesModule,
    TransportTypesModule,
    ShopifyParserModule,
    WebhooksModule,
    SyncModule,
    NotificationsModule,
    CustomersModule,
    EventsModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
