import test from "node:test";
import assert from "node:assert/strict";

import {
  envFlag,
  getStoneTechnologyState,
  validEndpoint,
} from "../../src/lib/stone/technologyFabric.ts";

function withEnv(name: string, value: string | undefined, fn: () => void) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;

  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test("envFlag trims values and recognizes only explicit true values", () => {
  withEnv("STONE_TEST_FLAG", " true ", () => assert.equal(envFlag("STONE_TEST_FLAG"), true));
  withEnv("STONE_TEST_FLAG", "0", () => assert.equal(envFlag("STONE_TEST_FLAG"), false));
  withEnv("STONE_TEST_FLAG", "   ", () => assert.equal(envFlag("STONE_TEST_FLAG", true), true));
});

test("validEndpoint accepts only usable HTTP(S) URLs", () => {
  assert.equal(validEndpoint(" https://example.com/path "), true);
  assert.equal(validEndpoint("http://yao:5099"), true);
  assert.equal(validEndpoint("   "), false);
  assert.equal(validEndpoint("not-a-url"), false);
  assert.equal(validEndpoint("file:///tmp/socket"), false);
});

test("enabled endpoint-backed technology degrades when endpoint is invalid", () => {
  withEnv("STONE_YAO_ENABLED", "1", () => {
    withEnv("STONE_YAO_BASE_URL", "   ", () => {
      const yao = getStoneTechnologyState().find((item) => item.id === "yao");
      assert.equal(yao?.enabled, true);
      assert.equal(yao?.configured, false);
    });
  });
});

test("enabled endpoint-backed technology is configured with valid endpoint", () => {
  withEnv("STONE_YAO_ENABLED", "1", () => {
    withEnv("STONE_YAO_BASE_URL", "http://yao:5099", () => {
      const yao = getStoneTechnologyState().find((item) => item.id === "yao");
      assert.equal(yao?.enabled, true);
      assert.equal(yao?.configured, true);
    });
  });
});
