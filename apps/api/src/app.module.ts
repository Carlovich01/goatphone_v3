import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatasetModule } from './dataset/dataset.module';
import { CatalogModule } from './catalog/catalog.module';
import { ComparisonModule } from './comparison/comparison.module';
import { AiModule } from './ai/ai.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, '../../../.env'), '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    DatasetModule,
    CatalogModule,
    ComparisonModule,
    AiModule,
    PaymentsModule,
    OrdersModule,
  ],
})
export class AppModule {}
