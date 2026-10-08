"use client";

/**
 * Catches unexpected failures inside the dashboard (for example a request body
 * that is too large for a Server Action) so the user sees a recoverable message
 * instead of a blank crash page.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tooLarge = /body exceeded|413|too large/i.test(error.message);

  return (
    <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-bata-200 bg-bata-50 p-6">
      <h1 className="text-lg font-bold text-bata-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-bata-700">
        {tooLarge
          ? "The images you attached are too large to upload in one go. Try fewer or smaller photos (under 5 MB each)."
          : "The last action could not be completed. Please try again; if it keeps happening, tell the Bata CSR team what you were doing."}
      </p>
      {error.digest && <p className="mt-2 text-xs text-bata-500">Reference: {error.digest}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-bata-700"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-bata-200 bg-white px-4 py-2 text-sm font-semibold text-bata-700 transition hover:bg-bata-100"
        >
          Back to overview
        </a>
      </div>
    </div>
  );
}
