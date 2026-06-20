import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ComparisonModule } from '../comparison/comparison.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [AiModule, ComparisonModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
