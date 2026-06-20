import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly embedModel: string;
  private readonly maxOutputTokens: number;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY') || '';
    this.model = config.get<string>('GEMINI_MODEL') || 'gemini-flash-lite-latest';
    this.embedModel = config.get<string>('GEMINI_EMBED_MODEL') || 'gemini-embedding-001';
    this.maxOutputTokens = Number(config.get('AI_MAX_OUTPUT_TOKENS')) || 600;
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  /** Generates text. Returns null if AI is not configured or the call fails. */
  async generate(
    systemInstruction: string,
    messages: { role: 'user' | 'model'; text: string }[],
  ): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(
        `${BASE}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
            generationConfig: {
              maxOutputTokens: this.maxOutputTokens,
              temperature: 0.6,
            },
          }),
        },
      );
      if (!res.ok) {
        this.logger.warn(`Gemini generate failed: ${res.status} ${await res.text()}`);
        return null;
      }
      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
      return text || null;
    } catch (e) {
      this.logger.error(`Gemini generate error: ${e}`);
      return null;
    }
  }

  /** Returns a 768-dim embedding, or null if AI is not configured / fails. */
  async embed(text: string): Promise<number[] | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(
        `${BASE}/models/${this.embedModel}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${this.embedModel}`,
            content: { parts: [{ text }] },
            // match the pgvector(768) column dimension
            outputDimensionality: 768,
          }),
        },
      );
      if (!res.ok) {
        this.logger.warn(`Gemini embed failed: ${res.status} ${await res.text()}`);
        return null;
      }
      const data: any = await res.json();
      const values: number[] = data?.embedding?.values ?? [];
      return values.length ? values : null;
    } catch (e) {
      this.logger.error(`Gemini embed error: ${e}`);
      return null;
    }
  }
}
