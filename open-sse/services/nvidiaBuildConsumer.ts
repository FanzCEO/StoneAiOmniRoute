const NVIDIA_BUILD_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_BUILD_SEED_MODEL = "z-ai/glm-5.3-flash";
const NVIDIA_BUILD_SKILL = "nvidia-build-consumer";
const NVIDIA_BUILD_VERSION = "1.0.0";

export interface NvidiaBuildAuthority {
  granted: true;
  reference: string;
}

export interface NvidiaBuildRequest {
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  model?: string;
  fallbackModels?: string[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  consequential?: boolean;
  authority?: NvidiaBuildAuthority;
}

export interface NvidiaBuildReceipt {
  provider: "nvidia-build";
  model: string;
  skill: "nvidia-build-consumer";
  version: "1.0.0";
}

export interface NvidiaBuildResult {
  content: string;
  receipt: NvidiaBuildReceipt;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export type NvidiaBuildFetch = (input: string, init?: RequestInit) => Promise<Response>;

export class NvidiaBuildError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "NvidiaBuildError";
  }
}

/** Explicit opt-in bridge. Intelligence output never grants execution authority. */
export class NvidiaBuildConsumer {
  readonly routeTier = "free-first";

  constructor(private readonly fetchImpl: NvidiaBuildFetch = globalThis.fetch) {}

  async listModels(timeoutMs = 10_000): Promise<string[]> {
    try {
      const response = await this.request("/models", { method: "GET" }, timeoutMs);
      if (response.status === 429 || response.status >= 500) return [NVIDIA_BUILD_SEED_MODEL];
      if (!response.ok) {
        throw new NvidiaBuildError(
          `NVIDIA Build model discovery failed with HTTP ${response.status}`,
          false,
          response.status,
        );
      }
      const payload = asRecord(await response.json());
      const data = Array.isArray(payload.data) ? payload.data : [];
      const discovered = data.map((item) => asRecord(item).id).filter(isNonEmptyString);
      return uniqueModels([NVIDIA_BUILD_SEED_MODEL, ...discovered]);
    } catch (error) {
      if (error instanceof NvidiaBuildError && error.retryable) return [NVIDIA_BUILD_SEED_MODEL];
      throw error;
    }
  }

  async complete(request: NvidiaBuildRequest): Promise<NvidiaBuildResult> {
    this.requireAuthority(request);
    const candidates = uniqueModels([
      NVIDIA_BUILD_SEED_MODEL,
      request.model,
      ...(request.fallbackModels ?? []),
    ]);
    const timeoutMs = request.timeoutMs ?? 30_000;

    for (let index = 0; index < candidates.length; index += 1) {
      const model = candidates[index];
      try {
        const response = await this.request(
          "/chat/completions",
          {
            method: "POST",
            body: JSON.stringify({
              model,
              messages: request.messages,
              max_tokens: request.maxTokens,
              temperature: request.temperature,
              stream: false,
            }),
          },
          timeoutMs,
        );
        if (response.status === 429 || response.status >= 500) {
          throw new NvidiaBuildError(
            `NVIDIA Build request failed with HTTP ${response.status}`,
            true,
            response.status,
          );
        }
        if (!response.ok) {
          throw new NvidiaBuildError(
            `NVIDIA Build request failed with HTTP ${response.status}`,
            false,
            response.status,
          );
        }
        return parseCompletion(await response.json(), model);
      } catch (error) {
        const retryable = error instanceof NvidiaBuildError && error.retryable;
        if (retryable && index + 1 < candidates.length) continue;
        throw error;
      }
    }

    throw new NvidiaBuildError("NVIDIA Build has no candidate model", false);
  }

  private requireAuthority(request: NvidiaBuildRequest): void {
    if (!request.consequential) return;
    if (request.authority?.granted !== true || !request.authority.reference.trim()) {
      throw new NvidiaBuildError(
        "Consequential NVIDIA Build request requires explicit authority",
        false,
      );
    }
  }

  private credential(): string {
    const key = process.env.NVIDIA_API_KEY?.trim();
    if (!key) throw new NvidiaBuildError("NVIDIA_API_KEY is not configured", false);
    return key;
  }

  private async request(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.fetchImpl(`${NVIDIA_BUILD_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.credential()}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted || isTimeout(error)) {
        throw new NvidiaBuildError("NVIDIA Build request timed out", true);
      }
      throw new NvidiaBuildError("NVIDIA Build request failed", false);
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseCompletion(value: unknown, attemptedModel: string): NvidiaBuildResult {
  const payload = asRecord(value);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = asRecord(choices[0]);
  const message = asRecord(choice.message);
  if (typeof message.content !== "string") {
    throw new NvidiaBuildError("NVIDIA Build completion returned malformed JSON", false);
  }
  const usage = asRecord(payload.usage);
  const promptTokens = asNonNegativeInteger(usage.prompt_tokens);
  const completionTokens = asNonNegativeInteger(usage.completion_tokens);
  const model = isNonEmptyString(payload.model) ? payload.model : attemptedModel;
  return {
    content: message.content,
    receipt: {
      provider: "nvidia-build",
      model,
      skill: NVIDIA_BUILD_SKILL,
      version: NVIDIA_BUILD_VERSION,
    },
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

function uniqueModels(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter(isNonEmptyString))];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function asNonNegativeInteger(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0;
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
}
