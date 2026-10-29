import { SettingsSchedule } from "@/components/settings-schedule";

type SchedulePageProps = {
  searchParams?: Promise<{
    section?: string;
  }>;
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const section = resolvedSearchParams.section;
  const initialSection =
    section === "shifts" || section === "business-hours" || section === "time-off"
      ? section
      : "time-off";

  return <SettingsSchedule initialSection={initialSection} />;
}
