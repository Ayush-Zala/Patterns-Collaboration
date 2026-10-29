"use client";

import { Loader2, Umbrella } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";

export function TeammateTimeOffTab({ timeOff }: { timeOff: any[] }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6 bg-background p-1">
        <Button 
          variant="outline"
          className="h-9 border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Exclude past time off
        </Button>

        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white h-9 rounded-md"
        >
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create time off
        </Button>
      </div>

      <div className="flex-1 rounded-xl bg-background flex flex-col items-center justify-center min-h-[400px] p-8 text-center mt-10">
        {/* Mocking the graphic from the screenshot */}
        <div className="relative w-24 h-24 mb-6 opacity-80 flex items-center justify-center">
          <div className="absolute w-16 h-4 bg-zinc-700 -rotate-[20deg] rounded-sm shadow-lg z-10 top-8 left-2" />
          <div className="absolute w-12 h-4 bg-muted rounded-sm top-12 left-8" />
          <div className="absolute size-8 rounded-full bg-muted top-10 right-4" />
        </div>
        
        <h3 className="text-lg font-bold text-foreground mb-3">No time off yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-2 leading-relaxed">
          Make sure your status remains "out of office" while on vacation or out sick by adding your time off.
        </p>
        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white rounded-md px-6"
        >
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create time off
        </Button>
      </div>
    </div>
  );
}
