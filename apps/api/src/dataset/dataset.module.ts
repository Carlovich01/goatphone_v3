import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { toPhoneSpecs } from '../common/spec-mapper';

@Controller('dataset')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
class DatasetController {
  constructor(private prisma: PrismaService) {}

  @Get('search')
  async search(@Query('q') q = '', @Query('limit') limit = '25') {
    const take = Math.min(Number(limit) || 25, 100);
    // Tokenize the query: each word must appear in brand OR model, so a combined
    // search like "Samsung Galaxy S25" matches even though brand/model are split.
    const terms = q.trim().split(/\s+/).filter(Boolean);
    const where = terms.length
      ? {
          AND: terms.map((t) => ({
            OR: [
              { brand: { contains: t, mode: 'insensitive' as const } },
              { model: { contains: t, mode: 'insensitive' as const } },
            ],
          })),
        }
      : {};
    const rows = await this.prisma.datasetPhone.findMany({
      where,
      take,
      orderBy: [{ rating: 'desc' }, { pos: 'asc' }],
    });
    return rows.map((d) => ({ id: d.id, ...toPhoneSpecs(d) }));
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number) {
    const d = await this.prisma.datasetPhone.findUnique({ where: { id } });
    if (!d) return null;
    return { id: d.id, ...toPhoneSpecs(d) };
  }
}

@Module({ controllers: [DatasetController] })
export class DatasetModule {}
