import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogService, ListFilters } from './catalog.service';
import { CreateProductDto, UpdateProductDto, SetOfferDto } from './dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';

@Controller('catalog')
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  // ---- public (client) ----
  @Get()
  list(
    @Query('q') q?: string,
    @Query('brand') brand?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('only5g') only5g?: string,
    @Query('onlyOffers') onlyOffers?: string,
    @Query('ramMin') ramMin?: string,
    @Query('storageMin') storageMin?: string,
    @Query('sort') sort?: ListFilters['sort'],
  ) {
    return this.catalog.list({
      q,
      brand,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      only5g: only5g === 'true',
      onlyOffers: onlyOffers === 'true',
      ramMin: ramMin ? Number(ramMin) : undefined,
      storageMin: storageMin ? Number(storageMin) : undefined,
      sort,
    });
  }

  @Get('brands')
  brands() {
    return this.catalog.brands();
  }

  // ---- admin ----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  listAll() {
    return this.catalog.listAll();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.catalog.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.catalog.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/offer')
  setOffer(@Param('id', ParseIntPipe) id: number, @Body() dto: SetOfferDto) {
    return this.catalog.setOffer(id, dto.offerPriceArs, dto.offerEndsAt);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/offer')
  clearOffer(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.clearOffer(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.remove(id);
  }
}
