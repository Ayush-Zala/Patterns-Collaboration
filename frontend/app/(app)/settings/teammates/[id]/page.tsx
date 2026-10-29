"use client";

import { use } from "react";
import { TeammateDetail } from "@/components/team/teammate-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeammatePage({ params }: PageProps) {
  const { id } = use(params);

  return <TeammateDetail teammateId={id} />;
}
