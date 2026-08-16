import assert from "node:assert/strict";
import test from "node:test";
import { artworkVariant, formatMetric } from "./editorial-ui.ts";

test("artwork variants are deterministic", () => {
  assert.equal(artworkVariant("same-id"), artworkVariant("same-id"));
});

test("artwork variants stay within the available range", () => {
  assert.ok([0, 1, 2, 3].includes(artworkVariant("another-id")));
});

test("metrics stay exact below one thousand", () => {
  assert.equal(formatMetric(950), "950");
});

test("metrics use compact thousands and millions", () => {
  assert.equal(formatMetric(1_250), "1.3K");
  assert.equal(formatMetric(1_250_000), "1.3M");
});
