"use client";

import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  children: ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-3">
      <div className="text-base font-medium text-gray-900 mb-1">{title}</div>
      {children}
    </div>
  );
}

