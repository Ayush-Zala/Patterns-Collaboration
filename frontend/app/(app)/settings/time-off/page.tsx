import { redirect } from "next/navigation";

export default function SettingsTimeOffPage() {
  redirect("/settings/schedule?section=time-off");
}
