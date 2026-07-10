export type ImportQueueJob = {
  id: string;
  title?: string | null;
  composer?: string | null;
  source_url?: string | null;
  license?: string | null;
  genre?: string | null;
  status?: string | null;
};

export type ImportDeleteResult = {
  deletedIds: string[];
  failures: Array<{ id: string; error: string }>;
};

export type ImportJobIdValidation =
  | { ids: string[] }
  | { error: string };

const RECORD_ID_PATTERN = /^[a-zA-Z0-9]{15}$/;

export function filterImportJobs<T extends ImportQueueJob>(
  jobs: readonly T[],
  query: string,
  status: string
): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (status !== "all" && job.status !== status) return false;
    if (!normalizedQuery) return true;

    return [
      job.title,
      job.composer,
      job.source_url,
      job.license,
      job.genre,
      job.status,
    ]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

export function selectedVisibleIds<T extends ImportQueueJob>(
  visibleJobs: readonly T[],
  selectedIds: ReadonlySet<string>
): string[] {
  return visibleJobs
    .map((job) => job.id)
    .filter((id) => selectedIds.has(id));
}

export function containsImportedJobs<T extends ImportQueueJob>(
  jobs: readonly T[],
  ids: readonly string[]
): boolean {
  const targets = new Set(ids);
  return jobs.some((job) => targets.has(job.id) && job.status === "imported");
}

export function validateImportJobIds(
  value: unknown,
  max = 200
): ImportJobIdValidation {
  if (!value || typeof value !== "object" || !("ids" in value)) {
    return { error: "Import job IDs must be provided as an array." };
  }

  const idsValue = (value as { ids?: unknown }).ids;
  if (!Array.isArray(idsValue)) {
    return { error: "Import job IDs must be provided as an array." };
  }


  const ids = Array.from(
    new Set(
      idsValue.map((id) => (typeof id === "string" ? id.trim() : ""))
    )
  );

  if (ids.length === 0 || ids.every((id) => id.length === 0)) {
    return { error: "Select at least one import job." };
  }
  if (ids.length > max) {
    return { error: `You can delete at most ${max} import jobs at once.` };
  }

  if (ids.some((id) => !RECORD_ID_PATTERN.test(id))) {
    return { error: "One or more import job IDs are invalid." };
  }

  return { ids };
}

export function reconcileDeletedJobs<T extends ImportQueueJob>(
  jobs: readonly T[],
  selectedIds: ReadonlySet<string>,
  result: ImportDeleteResult
): { jobs: T[]; selectedIds: Set<string> } {
  const deleted = new Set(result.deletedIds);
  const failed = new Set(result.failures.map((failure) => failure.id));

  return {
    jobs: jobs.filter((job) => !deleted.has(job.id)),
    selectedIds: new Set(
      Array.from(selectedIds).filter(
        (id) => !deleted.has(id) || failed.has(id)
      )
    ),
  };
}

export function toggleVisibleSelection(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[]
): Set<string> {
  const next = new Set(selectedIds);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => next.has(id));

  visibleIds.forEach((id) => {
    if (allVisibleSelected) next.delete(id);
    else next.add(id);
  });

  return next;
}
