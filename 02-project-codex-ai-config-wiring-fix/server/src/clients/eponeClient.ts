interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ResponsesApiResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
}

type AiWireApi = 'chat_completions' | 'responses';
type AiReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface AiClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  wireApi?: AiWireApi;
  reasoningEffort?: AiReasoningEffort;
  disableResponseStorage?: boolean;
}

export class EponeClient {
  constructor(private readonly config: AiClientConfig) {}

  async completeJson<T>(model: string, systemPrompt: string, userPayload: unknown): Promise<T> {
    if (!this.config.apiKey) {
      throw new Error('AI API key is missing');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      if (this.config.wireApi === 'responses') {
        return await this.completeJsonWithResponsesApi<T>(model, systemPrompt, userPayload, controller.signal);
      }

      const response = await fetch(this.buildEndpointUrl('chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(userPayload) },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Epone request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty AI response content');
      }

      return JSON.parse(content) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async completeJsonWithResponsesApi<T>(
    model: string,
    systemPrompt: string,
    userPayload: unknown,
    signal: AbortSignal,
  ): Promise<T> {
    const body: Record<string, unknown> = {
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify(userPayload) }],
        },
      ],
      text: {
        format: { type: 'json_object' },
      },
    };

    if (this.config.reasoningEffort) {
      body.reasoning = { effort: this.config.reasoningEffort };
    }

    if (this.config.disableResponseStorage !== false) {
      body.store = false;
    }

    const response = await fetch(this.buildEndpointUrl('responses'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Responses request failed with status ${response.status}: ${detail.slice(0, 500)}`);
    }

    const payload = (await response.json()) as ResponsesApiResponse;
    const content = this.extractResponsesText(payload);
    if (!content) {
      throw new Error('Empty Responses API output content');
    }

    return JSON.parse(content) as T;
  }

  private buildEndpointUrl(endpoint: 'chat/completions' | 'responses'): string {
    const baseUrl = this.config.baseUrl.replace(/\/+$/u, '');
    if (baseUrl.endsWith('/v1')) {
      return `${baseUrl}/${endpoint}`;
    }
    return `${baseUrl}/v1/${endpoint}`;
  }

  private extractResponsesText(payload: ResponsesApiResponse): string {
    if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
      return payload.output_text.trim();
    }

    const contentText = payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
      .join('\n')
      .trim();

    return contentText ?? '';
  }
}
