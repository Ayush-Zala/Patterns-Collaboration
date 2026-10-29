"use client";

import { Feather, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TeammateSignaturesTab({ signatures }: { signatures: any[] }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex-1 rounded-xl bg-transparent flex flex-col items-center justify-center min-h-[400px] p-8 text-center mt-10">
        <div className="size-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-6 shadow-inner">
          <Feather className="size-8 text-muted-foreground" fill="currentColor" />
        </div>
        
        <h3 className="text-lg font-bold text-foreground mb-3">No signatures</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
          Create a signature to use in your messages
        </p>
        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white rounded-md px-6"
        >
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create signature
        </Button>
      </div>
    </div>
  );
}
