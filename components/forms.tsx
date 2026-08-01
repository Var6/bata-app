"use client";

import { useActionState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { ActionState } from "@/lib/actions/auth";
import type { UserActionState } from "@/lib/actions/users";
import { btnPrimary } from "@/components/ui";

type AnyState = ActionState & Partial<UserActionState>;

/**
 * Generic form wired to a Server Action via useActionState.
 * Renders error/success messages and (for account actions) a one-time
 * temporary password box. Resets fields after a successful submit.
 */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
}: {
  action: (prev: AnyState, formData: FormData) => Promise<AnyState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {} as AnyState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.success && !state.tempPassword) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="mt-3 rounded-lg bg-bata-50 px-3 py-2 text-sm font-medium text-bata-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {state.success}
        </p>
      )}
      {state.tempPassword && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Temporary password — share it securely, it is shown only once
          </p>
          <code className="mt-1 block select-all text-lg font-bold tracking-wider text-amber-900">
            {state.tempPassword}
          </code>
        </div>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  className = btnPrimary,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

/** Submit button that asks for confirmation first (used for deletes). */
export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
