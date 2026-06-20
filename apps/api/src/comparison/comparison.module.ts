import { Module } from '@nestjs/common';
import { ComparisonController } from './comparison.controller';
import { ComparisonService } from './comparison.service';
import { ScoringService } from './scoring.service';

@Module({
  controllers: [ComparisonController],
  providers: [ComparisonService, ScoringService],
  exports: [ComparisonService, ScoringService],
})
export class ComparisonModule {}
