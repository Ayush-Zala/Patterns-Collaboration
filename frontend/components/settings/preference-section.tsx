"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PreferenceSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function PreferenceSection({
  title,
  description,
  children,
  className,
}: PreferenceSectionProps) {
  return (
    <div className={cn("space-y-6 pb-12 border-b border-border/50 last:border-0", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="divide-y divide-border/30">
        {children}
      </div>
    </div>
  );
}
