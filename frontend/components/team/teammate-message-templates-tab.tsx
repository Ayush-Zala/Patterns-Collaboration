"use client";

import { Input } from "@/components/ui/input";
import { Search, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TeammateMessageTemplatesTab({ templates }: { templates: any[] }) {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const handleCreateFolder = async () => {
    setIsCreatingFolder(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreatingFolder(false);
  };

  const handleCreateTemplate = async () => {
    setIsCreatingTemplate(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreatingTemplate(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6 bg-background p-1">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-9 rounded-md"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={handleCreateFolder}
            disabled={isCreatingFolder}
            className="h-9 border-border bg-muted/50 text-foreground hover:bg-muted transition-colors"
          >
            {isCreatingFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create folder
          </Button>
          <Button 
            onClick={handleCreateTemplate}
            disabled={isCreatingTemplate}
            className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white h-9 rounded-md"
          >
            {isCreatingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create template
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-border bg-background flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="size-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-6 shadow-inner">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-3">No message templates</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
          You can use message templates to reply quickly to conversations, and fill templates with dynamic content using variables.
        </p>
        <Button 
          onClick={handleCreateTemplate}
          disabled={isCreatingTemplate}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white rounded-md px-6"
        >
          {isCreatingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create template
        </Button>
      </div>
    </div>
  );
}
