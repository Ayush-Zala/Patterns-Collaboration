"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // We allow everyone to access settings now that we have Individual scope
  }, [session, isPending, router]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-background text-foreground">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
