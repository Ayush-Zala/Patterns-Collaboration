"use client";

import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({ 
  title = "Coming Soon", 
  description = "We're currently building this module to provide you with the best experience. Stay tuned!" 
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="size-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-8 relative">
        <Construction className="size-12 text-amber-500" />
        <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-20" />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
        {title}
      </h1>
      
      <p className="text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          className="border-border bg-muted/50 hover:bg-muted text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4 mr-2" />
          Go Back
        </Button>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          Notify Me
        </Button>
      </div>
    </div>
  );
}
