import { CreateCustomFieldForm } from "@/components/create-custom-field-form";

export default function CreateCustomFieldPage() {
  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <CreateCustomFieldForm />
    </div>
  );
}
