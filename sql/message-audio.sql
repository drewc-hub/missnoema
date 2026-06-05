-- Message-level TTS cache used by POST /api/voice/message.
-- Run in the Supabase SQL editor before deploying the route.

begin;

create table if not exists public."MessageAudio" (
  id text primary key,
  "messageId" text not null unique references public."ChatMessage"(id) on delete cascade,
  "companionId" text not null,
  provider text not null,
  "voiceId" text not null,
  model text not null,
  "storageBucket" text not null,
  "storagePath" text not null,
  "audioUrl" text not null,
  "contentType" text not null default 'audio/mpeg',
  "urlExpiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "MessageAudio_companionId_createdAt_idx"
  on public."MessageAudio" ("companionId", "createdAt");

alter table public."MessageAudio" enable row level security;

revoke all on table public."MessageAudio" from anon, authenticated;
grant all on table public."MessageAudio" to service_role;

commit;
