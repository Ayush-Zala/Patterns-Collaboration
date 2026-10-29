"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function TeammateNotificationsTab({ notifications }: { notifications: any }) {
  const [isCreating, setIsCreating] = useState(false);

  const [desktop, setDesktop] = useState("smart");
  const [mobile, setMobile] = useState("smart");
  const [email, setEmail] = useState("no");

  const handleCreate = async () => {
    setIsCreating(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreating(false);
  };

  const NotificationRadio = ({ id, name, value, state, setState }: { id: string, name: string, value: string, state: string, setState: (val: string) => void }) => (
    <div className="flex items-center gap-3 mb-4">
      <div 
        onClick={() => setState(value)}
        className="relative flex items-center justify-center size-4 rounded-full border border-zinc-600 cursor-pointer"
      >
        {state === value && (
          <div className="size-2 rounded-full bg-[#6b5eed]" />
        )}
      </div>
      <label className="text-sm text-muted-foreground font-medium cursor-pointer select-none" onClick={() => setState(value)}>
        {name}
      </label>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl">
      {/* Basic Section */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-6">Basic</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Desktop */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Desktop</h3>
            <NotificationRadio id="d_all" name="All notifications" value="all" state={desktop} setState={setDesktop} />
            <NotificationRadio id="d_smart" name="Smart notifications" value="smart" state={desktop} setState={setDesktop} />
            <NotificationRadio id="d_no" name="No notifications" value="no" state={desktop} setState={setDesktop} />
          </div>
          
          {/* Mobile */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Mobile</h3>
            <NotificationRadio id="m_all" name="All notifications" value="all" state={mobile} setState={setMobile} />
            <NotificationRadio id="m_smart" name="Smart notifications" value="smart" state={mobile} setState={setMobile} />
            <NotificationRadio id="m_no" name="No notifications" value="no" state={mobile} setState={setMobile} />
          </div>

          {/* Email */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Email</h3>
            <NotificationRadio id="e_all" name="All notifications" value="all" state={email} setState={setEmail} />
            <NotificationRadio id="e_smart" name="Smart notifications" value="smart" state={email} setState={setEmail} />
            <NotificationRadio id="e_no" name="No notifications" value="no" state={email} setState={setEmail} />
          </div>
        </div>
      </div>

      {/* Advanced Section */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-6">Advanced</h2>
        
        <div className="flex items-start justify-between mb-12">
          <div>
            <h3 className="text-base font-bold text-foreground mb-1">Notification rules</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Notifications rules allow to customize how a teammate is notified. Advanced notifications will override basic notifications.
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={handleCreate}
            disabled={isCreating}
            className="border-border bg-transparent text-foreground hover:bg-muted transition-colors"
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create notification rule
          </Button>
        </div>

        <div className="text-center py-12 border-t border-border">
          <p className="text-sm text-muted-foreground">You do not have any notification rules</p>
        </div>
      </div>
    </div>
  );
}
