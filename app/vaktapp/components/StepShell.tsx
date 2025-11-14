"use client";

import type { ReactNode } from "react";

interface StepShellProps {
  children: ReactNode;
  onNext: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  belowButtons?: ReactNode;
}

export default function StepShell({
  children,
  onNext,
  onPrev,
  canNext = true,
  belowButtons,
}: StepShellProps) {
  return (
    <div className="mx-auto w-full max-w-md p-4 text-gray-900">
      <div className="bg-white rounded-2xl shadow p-4">
        {children}
        <div className="mt-4 flex gap-2">
          {onPrev && (
            <button
              onClick={onPrev}
              className="flex-1 py-3 rounded-xl border border-gray-300"
            >
              Tilbake
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!canNext}
            className="flex-1 py-3 rounded-xl bg-black text-white disabled:opacity-40"
          >
            Neste
          </button>
        </div>
        {belowButtons && <div className="mt-4">{belowButtons}</div>}
      </div>
    </div>
  );
}

