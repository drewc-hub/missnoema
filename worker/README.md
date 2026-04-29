# Worker

Background job worker entrypoint (`worker/index.ts`).

## Running

The recommended way to start the worker is via the pnpm script defined in
`package.json`:

```bash
pnpm worker
```

This expands to `dotenv -e .env -- tsx worker/index.ts` and works in any shell.

## Running `tsx` directly

If you want to invoke `tsx` directly from your shell, use the **space-separated**
form of `--env-file`:

```bash
pnpm tsx --env-file .env worker/index.ts
```

> ⚠️ Do **not** use `--env-file=.env` (with `=`) when invoking from `fish`
> (4.x). Fish parses the `=` and fails with:
>
> ```
> fish: Expected a string, but found a redirection
> ```
>
> The space form (`--env-file .env`) works in `bash`, `zsh`, and `fish`.

## Expected startup output

```
[worker] postgres-queue start { pollMs: 1500, concurrency: 2 }
```
