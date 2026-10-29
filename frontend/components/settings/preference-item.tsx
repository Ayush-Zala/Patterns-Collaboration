"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PreferenceItemProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PreferenceItem({
  title,
  description,
  children,
  className,
}: PreferenceItemProps) {
  return (
    <div className={cn("flex items-start justify-between py-6 first:pt-0 last:pb-0", className)}>
      <div className="space-y-1 pr-8">
        <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  );
}
