import { SettingsInboxDetail } from "@/components/settings-inbox-detail";

type InboxDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SettingsInboxDetailPage({ params }: InboxDetailPageProps) {
  const { id } = await params;
  return <SettingsInboxDetail inboxId={id} />;
}
