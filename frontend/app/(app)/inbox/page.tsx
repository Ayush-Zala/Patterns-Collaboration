import { Suspense } from "react";
import { MessagesInbox } from "@/components/messages-inbox";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInbox />
    </Suspense>
  );
}
