import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  NVIDIA_BUILD_SEED_MODEL,
  NvidiaBuildConsumer,
  type NvidiaBuildFetch,
} from "../../../open-sse/services/nvidiaBuildConsumer.ts";

const previousKey = process.env.NVIDIA_API_KEY;
afterEach(() => {
  if (previousKey === undefined) delete process.env.NVIDIA_API_KEY;
  else process.env.NVIDIA_API_KEY = previousKey;
});

test("discovers models dynamically while retaining the seed", async () => {
  process.env.NVIDIA_API_KEY = "test-only-not-a-secret";
  const fetchImpl: NvidiaBuildFetch = async () =>
    Response.json({ data: [{ id: "vendor/dynamic" }, { id: NVIDIA_BUILD_SEED_MODEL }] });
  const models = await new NvidiaBuildConsumer(fetchImpl).listModels();
  assert.deepEqual(models, [NVIDIA_BUILD_SEED_MODEL, "vendor/dynamic"]);
});

test("falls back on 429, 5xx, and timeout and emits provenance", async () => {
  process.env.NVIDIA_API_KEY = "test-only-not-a-secret";
  const attempted: string[] = [];
  const outcomes: Array<Response | Error> = [
    new Response(null, { status: 429 }),
    new Response(null, { status: 503 }),
    Object.assign(new Error("slow"), { name: "TimeoutError" }),
    Response.json({
      model: "vendor/fallback-3",
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
    }),
  ];
  const fetchImpl: NvidiaBuildFetch = async (_url, init) => {
    attempted.push(JSON.parse(String(init?.body)).model);
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    return outcome as Response;
  };

  const result = await new NvidiaBuildConsumer(fetchImpl).complete({
    messages: [{ role: "user", content: "hello" }],
    model: "vendor/fallback-1",
    fallbackModels: ["vendor/fallback-2", "vendor/fallback-3"],
  });

  assert.deepEqual(attempted, [
    NVIDIA_BUILD_SEED_MODEL,
    "vendor/fallback-1",
    "vendor/fallback-2",
    "vendor/fallback-3",
  ]);
  assert.deepEqual(result.receipt, {
    provider: "nvidia-build",
    model: "vendor/fallback-3",
    skill: "nvidia-build-consumer",
    version: "1.0.0",
  });
});

test("fails closed before network for consequential work without authority", async () => {
  process.env.NVIDIA_API_KEY = "test-only-not-a-secret";
  let calls = 0;
  const consumer = new NvidiaBuildConsumer(async () => {
    calls += 1;
    return Response.json({});
  });
  await assert.rejects(
    consumer.complete({
      messages: [{ role: "user", content: "act" }],
      consequential: true,
    }),
    /explicit authority/i,
  );
  assert.equal(calls, 0);
});
