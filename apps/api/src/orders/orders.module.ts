import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, JwtAuthGuard, RequestUser, Roles, RolesGuard } from '../auth/guards';

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
