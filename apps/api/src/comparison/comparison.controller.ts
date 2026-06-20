import { Controller, Get, Query } from '@nestjs/common';
import { ComparisonService } from './comparison.service';

function parseIds(raw?: string): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

@Controller('comparison')
export class ComparisonController {
  constructor(private comparison: ComparisonService) {}

  // GET /comparison?ids=1,2,3
  @Get()
  compare(@Query('ids') ids?: string) {
    return this.comparison.compare(parseIds(ids));
  }

  // GET /comparison/spec-distribution?spec=ram&ids=1,2
  @Get('spec-distribution')
  distribution(@Query('spec') spec: string, @Query('ids') ids?: string) {
    return this.comparison.specDistribution(spec, parseIds(ids));
  }
}
