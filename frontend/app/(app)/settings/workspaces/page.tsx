import { SettingsWorkspaces } from "@/components/settings-workspaces";

export default function WorkspacesPage() {
  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <SettingsWorkspaces />
    </div>
  );
}
