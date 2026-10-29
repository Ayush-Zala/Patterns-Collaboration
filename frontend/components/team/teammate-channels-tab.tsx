"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Hash, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChannelData {
  id: string;
  name: string;
  provider: string;
}

export function TeammateChannelsTab({ channels }: { channels: ChannelData[] }) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsConnecting(false);
    alert("This would open the 'Connect Channel' wizard/modal.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-9 rounded-md"
          />
        </div>
        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white h-9 rounded-md transition-all"
        >
          {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect channel
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden min-h-[400px] flex flex-col">
        {channels && channels.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Provider</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr key={channel.id} className="border-b border-border hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Hash className="size-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium text-foreground">{channel.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-muted-foreground capitalize">
                      {channel.provider}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Package className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">No channels</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Connect a channel to start receiving messages in Patterns.
            </p>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white"
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add channel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
