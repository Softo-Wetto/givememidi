# GiveMeMIDI Import Inbox

Use the website at `/admin/imports` to queue source URLs and review drafts.

Local worker commands:

```bash
npm run import:midis -- --dry-run --file=imports/midi-import-list.example.csv
npm run import:midis -- --commit --file=imports/midi-import-list.csv
npm run import:midis -- --dry-run --jobs
npm run import:midis -- --commit --jobs
```

Rules:
- Only import files you own, public-domain files, Creative Commons files, or files you have permission to redistribute.
- Put local files under `imports/files/` or use paths relative to the `givememidi` project root.
- Jobs from `/admin/imports` must be marked `ready` and include `midi_path` before the local worker can import them.
- `--dry-run` is the default. Use `--commit` to upload to PocketBase.

The worker writes source/license/hash metadata into `music_files` and skips duplicates by `source_url` or `file_hash`.
## GUI-triggered LibreScore worker

The `/admin/imports` page can start imports from the web UI, but the download work runs on a VPS-side Node worker, not inside Cloudflare.

Set these environment variables on the deployed GiveMeMIDI app:

```bash
IMPORT_WORKER_URL=https://your-private-worker-url
IMPORT_WORKER_KEY=use-a-long-random-secret
```

Set these on the VPS process that runs the worker:

```bash
IMPORT_WORKER_KEY=use-the-same-long-random-secret
IMPORT_WORKER_HOST=127.0.0.1
IMPORT_WORKER_PORT=8789
POCKETBASE_SUPERUSER_EMAIL=...
POCKETBASE_SUPERUSER_PASSWORD=...
NEXT_PUBLIC_POCKETBASE_URL=https://api-midi.softowetto.com
```

Start the worker on the VPS from the `givememidi` project root:

```bash
npm run import:worker
```

The web flow is:

1. Queue URLs from `/admin/imports`.
2. Click `Run import`.
3. The web app calls `/api/import/run`.
4. `/api/import/run` calls the VPS worker `/run` endpoint.
5. The worker runs `scripts/download-librescore-jobs.mjs --commit --import`.
6. Jobs move through `pending`, `importing`, `ready`, and `imported` or `error`.

Do not expose the worker without a reverse proxy, firewall rule, or private network restriction. The bearer key is required, but network-level restriction is still recommended.