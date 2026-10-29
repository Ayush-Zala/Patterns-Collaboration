import { Suspense } from "react";

import { ConnectChannelFlow } from "@/components/connect-channel-flow";

export const dynamic = "force-dynamic";

export default function ConnectChannelPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading connect flow...</div>}>
      <ConnectChannelFlow />
    </Suspense>
  );
}
