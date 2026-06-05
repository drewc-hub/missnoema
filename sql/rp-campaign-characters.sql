-- Multi-character roster support for roleplay campaigns.
-- Run in the Supabase SQL editor before using "Add to cast".

begin;

create table if not exists public."RpCampaignCharacter" (
  id text primary key,
  "campaignId" text not null
    references public."RpCampaign"(id) on delete cascade,
  "companionId" text not null
    references public."Companion"(id) on delete cascade,
  role text not null default 'cast',
  "joinedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "RpCampaignCharacter_campaignId_companionId_key"
  on public."RpCampaignCharacter" ("campaignId", "companionId");

create index if not exists "RpCampaignCharacter_campaignId_joinedAt_idx"
  on public."RpCampaignCharacter" ("campaignId", "joinedAt");

create index if not exists "RpCampaignCharacter_companionId_idx"
  on public."RpCampaignCharacter" ("companionId");

alter table public."RpCampaignCharacter" enable row level security;

revoke all on table public."RpCampaignCharacter" from anon, authenticated;
grant all on table public."RpCampaignCharacter" to service_role;

commit;
