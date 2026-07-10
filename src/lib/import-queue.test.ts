import assert from "node:assert/strict";
import test from "node:test";
import {
  containsImportedJobs,
  filterImportJobs,
  reconcileDeletedJobs,
  selectedVisibleIds,
  validateImportJobIds,
} from "./import-queue.ts";

const jobs = [
  {
    id: "aaaaaaaaaaaaaaa",
    title: "Moonlight Sonata",
    composer: "Beethoven",
    source_url: "https://example.com/moonlight",
    license: "Public domain",
    genre: "Classical",
    status: "pending",
  },
  {
    id: "bbbbbbbbbbbbbbb",
    title: "Prelude in C",
    composer: "Bach",
    source_url: "https://example.com/prelude",
    license: "Needs review",
    genre: "Classical",
    status: "error",
  },
  {
    id: "ccccccccccccccc",
    title: "Blue Train",
    composer: "Coltrane",
    source_url: "https://example.com/blue-train",
    license: "Licensed",
    genre: "Jazz",
    status: "imported",
  },
];

test("filters import jobs by status and search text", () => {
  assert.deepEqual(
    filterImportJobs(jobs, "bach", "error").map((job) => job.id),
    ["bbbbbbbbbbbbbbb"]
  );
});

test("returns selected IDs that are visible", () => {
  assert.deepEqual(
    selectedVisibleIds(jobs.slice(0, 2), new Set(["aaaaaaaaaaaaaaa", "ccccccccccccccc"])),
    ["aaaaaaaaaaaaaaa"]
  );
});

test("detects imported jobs inside a deletion set", () => {
  assert.equal(containsImportedJobs(jobs, ["ccccccccccccccc"]), true);
  assert.equal(containsImportedJobs(jobs, ["aaaaaaaaaaaaaaa"]), false);
});

test("validates and deduplicates PocketBase record IDs", () => {
  assert.deepEqual(
    validateImportJobIds({ ids: ["aaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaa"] }),
    { ids: ["aaaaaaaaaaaaaaa"] }
  );
  assert.deepEqual(validateImportJobIds({ ids: [] }), {
    error: "Select at least one import job.",
  });
});

test("keeps failed deletions visible and selected", () => {
  const result = reconcileDeletedJobs(
    jobs,
    new Set(["aaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbb"]),
    {
      deletedIds: ["aaaaaaaaaaaaaaa"],
      failures: [{ id: "bbbbbbbbbbbbbbb", error: "Denied" }],
    }
  );

  assert.deepEqual(result.jobs, jobs.filter((job) => job.id !== "aaaaaaaaaaaaaaa"));
  assert.deepEqual(result.selectedIds, new Set(["bbbbbbbbbbbbbbb"]));
});
