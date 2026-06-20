import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@goatphone/shared';
import { OrdersService } from './orders.service';
import { CurrentUser, JwtAuthGuard, RequestUser, Roles, RolesGuard } from '../auth/guards';

class WarrantyClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class UpdateStatusDto {
  @IsIn([
    'paid',
    'ready_pickup',
    'preparing',
    'shipped',
    'delivered',
    'warranty_accepted',
    'warranty_rejected',
  ])
  status!: OrderStatus;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  mine(@CurrentUser() user: RequestUser) {
    return this.orders.forUser(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('all')
  all() {
    return this.orders.all();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }

  @Post(':id/warranty-claim')
  claimWarranty(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WarrantyClaimDto,
  ) {
    return this.orders.claimWarranty(id, user.id, dto.description);
  }

  @Get(':id')
  one(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.one(id, user.id);
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
