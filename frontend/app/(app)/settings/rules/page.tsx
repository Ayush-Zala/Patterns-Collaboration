import { SettingsRules } from "@/components/settings-rules";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules | Settings",
  description: "Manage automated inbox rules",
};

export default function RulesPage() {
  return <SettingsRules />;
}
