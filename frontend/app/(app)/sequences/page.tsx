"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ListTree } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export default function SequencesPage() {
  const router = useRouter();
  const [sequences, setSequences] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [senderName, setSenderName] = useState("");

  const fetchSequences = async () => {
    try {
      const res = await fetch("/api/sequences");
      if (res.ok) {
        const data = await res.json();
        setSequences(data.sequences || []);
      }
    } catch (error) {
      console.error("Failed to fetch sequences", error);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/settings/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch channels", error);
    }
  };

  useEffect(() => {
    fetchSequences();
    fetchChannels();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, channelId, cc, bcc, senderName }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsDialogOpen(false);
        router.push(`/sequences/${data.sequence.id}`);
      } else {
        alert("Failed to create sequence. Make sure required fields are filled.");
      }
    } catch (error) {
      console.error("Failed to create sequence", error);
    }
  };

  return (
    <div className="flex h-full w-full flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ListTree className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Sequences</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center font-normal">New sequence</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-semibold">Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="from" className="text-xs font-semibold">From <span className="text-red-500">*</span></Label>
                <Select value={channelId} onValueChange={setChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.email_address || c.emailAddress}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cc" className="text-xs font-semibold">Cc</Label>
                <Input id="cc" value={cc} onChange={(e) => setCc(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bcc" className="text-xs font-semibold">Bcc</Label>
                <Input id="bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sender" className="text-xs font-semibold">Sender name <span className="text-red-500">*</span></Label>
                <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>OK</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Stages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No sequences found.
                </TableCell>
              </TableRow>
            ) : (
              sequences.map((seq) => (
                <TableRow key={seq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/sequences/${seq.id}`)}>
                  <TableCell className="font-medium">{seq.name}</TableCell>
                  <TableCell>{seq.channel?.email_address || seq.channel?.emailAddress || "Unknown"}</TableCell>
                  <TableCell>{seq._count?.stages || 0}</TableCell>
                  <TableCell className="capitalize">{seq.status}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(seq.createdAt), { addSuffix: true })}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
