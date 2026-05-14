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

## Leonardo image provider

Set these server-side env vars to route image jobs through Leonardo instead of
Replicate:

```bash
IMAGE_PROVIDER=leonardo
LEONARDO_API_KEY=your-leonardo-api-key
LEONARDO_IMAGE_MODEL_ID=7b592283-e8a7-4c5a-9ba6-d18c31f258b9
LEONARDO_STYLE_UUID=111dc692-d470-4eec-b791-3475abac4c46
LEONARDO_IMAGE_WIDTH=768
LEONARDO_IMAGE_HEIGHT=1024
LEONARDO_PUBLIC=false
```

Restart the worker after changing env vars.

Leonardo returns an `nsfw` flag on generated images, but its public generation
API docs do not list `nsfw` as a request-body setting. To actually route jobs to
Leonardo, `IMAGE_PROVIDER=leonardo` must be set in the worker/runtime env.

## Replicate adult fallback

If `IMAGE_PROVIDER` is not set, the worker uses Replicate. Adult image jobs send
`nsfw: true` by default for models that support that input flag:

```bash
REPLICATE_ADULT_NSFW=true
```
