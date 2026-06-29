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