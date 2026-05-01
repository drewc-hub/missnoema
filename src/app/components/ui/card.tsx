// file: src/app/companions/[slug]/page.tsx
// In your LEFT column, replace the old Profile JSON card with the builder.

import { CompanionBuilder } from "@/components/companion-builder";

// ... inside your page component (where you already have `companion`, `user`, `allowAdult`)
<section className="lg:col-span-7 space-y-4">
  <CompanionBuilder
    userEmail={user?.email ?? null}
    allowAdult={allowAdult}
    defaults={{
      companionId: companion.id,
      name: companion.name,
      description: companion.description,
      tags: companion.tags,
      contentRating: companion.contentRating,
      profile: companion.profile,
    }}
  />

  {/* keep your media/profile cards below if you want */}
</section>;
