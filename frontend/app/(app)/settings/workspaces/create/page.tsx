import { CreateWorkspaceForm } from "@/components/create-workspace-form";

export default function CreateWorkspacePage() {
  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <CreateWorkspaceForm />
    </div>
  );
}
