import { RuleBuilder } from "@/components/rule-builder";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Rule | Settings",
  description: "Build an automated inbox rule",
};

export default function NewRulePage() {
  return <RuleBuilder />;
}
