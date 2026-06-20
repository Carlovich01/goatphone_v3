import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentsService } from './payments.service';
import { CurrentUser, JwtAuthGuard, RequestUser } from '../auth/guards';

class CartItemDto {
  @IsInt()
  productId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class CheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user.id, dto.items);
  }

  // Mercado Pago calls this (needs a public URL, e.g. ngrok, to fire in local dev)
  @Post('webhook')
  @HttpCode(200)
  webhook(@Query() query: any, @Body() body: any) {
    return this.payments.handleWebhook(query, body);
  }

  // Sandbox convenience confirmation from the result page (owner-checked)
  @UseGuards(JwtAuthGuard)
  @Post('confirm/:orderId')
  confirm(
    @CurrentUser() user: RequestUser,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query('status') status = 'pending',
  ) {
    return this.payments.confirmFromRedirect(user.id, orderId, status);
  }
}
