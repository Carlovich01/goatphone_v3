import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiService } from './ai.service';
import { EmbeddingService } from './embedding.service';
import { CurrentUser, JwtAuthGuard, RequestUser, Roles, RolesGuard } from '../auth/guards';
import { ChatMessage } from '@goatphone/shared';

class SummaryDto {
  @IsArray()
  @IsInt({ each: true })
  ids!: number[];
}

class ChatDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  comparedIds?: number[];

  @IsOptional()
  @IsArray()
  history?: ChatMessage[];
}

@Controller('ai')
export class AiController {
  constructor(private ai: AiService, private embeddings: EmbeddingService) {}

  @Post('summary')
  summary(@Body() dto: SummaryDto) {
    return this.ai.summary(dto.ids);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  chat(@CurrentUser() user: RequestUser, @Body() dto: ChatDto) {
    return this.ai.chat(user.id, dto.message, dto.comparedIds ?? [], dto.history ?? []);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('reindex')
  async reindex() {
    const n = await this.embeddings.reindexAll();
    return { reindexed: n };
  }
}
