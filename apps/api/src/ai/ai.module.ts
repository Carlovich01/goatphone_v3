import { Module } from '@nestjs/common';
import { ComparisonModule } from '../comparison/comparison.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [ComparisonModule],
  controllers: [AiController],
  providers: [AiService, GeminiService, EmbeddingService],
  exports: [EmbeddingService],
})
export class AiModule {}
