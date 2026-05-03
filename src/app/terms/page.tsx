export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 text-zinc-200">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>

      <p className="mb-4">
        By using Noema, you agree to use the service responsibly and in
        compliance with applicable laws.
      </p>

      <p className="mb-4">
        You must be at least 18 years old to use features involving adult
        content.
      </p>

      <p className="mb-4">
        Noema provides AI-generated content for entertainment purposes.
        We are not responsible for user-generated prompts or interactions.
      </p>

      <p className="mb-4">
        Abuse, exploitation, or illegal use of the platform will result in
        account termination.
      </p>

      <p className="mb-4">
        Subscriptions and payments are handled by Stripe and are subject
        to their terms.
      </p>

      <p className="text-sm text-zinc-400">
        Contact: andrew@noema-ai.net
      </p>
    </main>
  );
}
