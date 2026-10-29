import { SettingsCustomFields } from "@/components/settings-custom-fields";

export default function CustomFieldsPage() {
  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <SettingsCustomFields />
    </div>
  );
}
