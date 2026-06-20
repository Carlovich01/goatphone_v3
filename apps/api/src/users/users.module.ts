import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, JwtAuthGuard, RequestUser, Roles, RolesGuard } from '../auth/guards';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

@Controller('users')
class UsersController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, dni: true, phone: true, address: true },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        dni: dto.dni?.trim() || null,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
      },
      select: { id: true, email: true, name: true, role: true, dni: true, phone: true, address: true },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  list() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}
