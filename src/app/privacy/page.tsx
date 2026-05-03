export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 text-zinc-200">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>

      <p className="mb-4">
        Noema collects basic account information such as email and usage data
        to provide and improve the service.
      </p>

      <p className="mb-4">
        We do not sell your personal data. Generated content and interactions
        may be stored to improve the experience.
      </p>

      <p className="mb-4">
        Payments are processed securely through Stripe. We do not store
        payment details.
      </p>

      <p className="mb-4">
        By using Noema, you agree to the collection and use of information
        in accordance with this policy.
      </p>

      <p className="text-sm text-zinc-400">
        Contact: andrew@noema-ai.net
      </p>
    </main>
  );
}
