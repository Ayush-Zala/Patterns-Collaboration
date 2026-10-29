"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, MoreVertical, Paperclip, Smile, Image as ImageIcon, Link2, List, ListOrdered, Bold, Italic, Underline, Strikethrough, RemoveFormatting, Type, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/rich-text-editor";
import { toast } from "sonner";

export default function SequenceEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [sequence, setSequence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [manualEmail, setManualEmail] = useState("");

  // Edit Sequence States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editChannelId, setEditChannelId] = useState("");
  const [editCc, setEditCc] = useState("");
  const [editBcc, setEditBcc] = useState("");
  const [editSenderName, setEditSenderName] = useState("");
  const [channels, setChannels] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/sequences/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSequence(data.sequence);
        if (!activeStageId) {
          if (data.sequence.stages && data.sequence.stages.length > 0) {
            setActiveStageId("recipients");
          } else {
            setActiveStageId("recipients");
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch sequence", error);
    } finally {
      setLoading(false);
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
    if (id) {
      fetchSequence();
      fetchChannels();
    }
  }, [id]);

  const handleCreateStage = async () => {
    try {
      const res = await fetch(`/api/sequences/${id}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSequence((prev: any) => ({
          ...prev,
          stages: [...(prev.stages || []), data.stage]
        }));
        setActiveStageId(data.stage.id);
      }
    } catch (error) {
      console.error("Failed to create stage", error);
    }
  };

  const handleUpdateStage = async (stageId: string, updates: any) => {
    setSequence((prev: any) => ({
      ...prev,
      stages: prev.stages.map((s: any) => s.id === stageId ? { ...s, ...updates } : s)
    }));

    try {
      await fetch(`/api/sequences/${id}/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to update stage", error);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;

    setSequence((prev: any) => ({
      ...prev,
      stages: prev.stages.filter((s: any) => s.id !== stageId)
    }));
    setActiveStageId("recipients");

    try {
      await fetch(`/api/sequences/${id}/stages/${stageId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete stage", error);
    }
  };

  const handleDeleteSequence = async () => {
    if (!confirm("Are you sure you want to delete this sequence?")) return;
    try {
      await fetch(`/api/sequences/${id}`, { method: "DELETE" });
      router.push("/sequences");
    } catch (error) {
      console.error("Failed to delete sequence", error);
    }
  };

  const openEditDialog = () => {
    if (sequence) {
      setEditName(sequence.name || "");
      setEditChannelId(sequence.channelId || "");
      setEditCc(sequence.cc || "");
      setEditBcc(sequence.bcc || "");
      setEditSenderName(sequence.senderName || "");
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateSequence = async () => {
    try {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          channelId: editChannelId,
          cc: editCc,
          bcc: editBcc,
          senderName: editSenderName,
        }),
      });
      if (res.ok) {
        setIsEditDialogOpen(false);
        fetchSequence();
      }
    } catch (error) {
      console.error("Failed to update sequence", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const emails = text
        .split(/[\r\n]+/)
        .map(line => line.trim())
        .filter(line => line && line.includes('@'))
        .map(email => ({ email }));

      const limitedEmails = emails.slice(0, 200);

      // Update local state
      setSequence((prev: any) => ({ ...prev, recipients: limitedEmails }));

      // Update backend
      try {
        await fetch(`/api/sequences/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients: limitedEmails }),
        });
      } catch (error) {
        console.error("Failed to update recipients", error);
      }
    };
    reader.readAsText(file);
  };

  const handleAddManualEmail = async () => {
    if (!manualEmail || !manualEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const currentRecipients = Array.isArray(sequence?.recipients) ? sequence.recipients : [];
    if (currentRecipients.length >= 200) {
      toast.error("Recipient limit reached (200).");
      return;
    }

    // Check for duplicates
    if (currentRecipients.some((r: any) => r.email === manualEmail.trim())) {
      toast.error("This email is already in the recipient list.");
      return;
    }

    const newRecipients = [{ email: manualEmail.trim() }, ...currentRecipients];
    setSequence((prev: any) => ({ ...prev, recipients: newRecipients }));
    setManualEmail("");

    try {
      await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: newRecipients }),
      });
      toast.success("Recipient added successfully!");
    } catch (error) {
      console.error("Failed to add recipient", error);
      toast.error("Failed to add recipient.");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const recipientsList = Array.isArray(sequence?.recipients) ? sequence.recipients : [];
      setSelectedRecipients(recipientsList.map((_: any, i: number) => i));
    } else {
      setSelectedRecipients([]);
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedRecipients(prev => [...prev, index]);
    } else {
      setSelectedRecipients(prev => prev.filter(i => i !== index));
    }
  };

  const handleDeleteSelected = async () => {
    if (!sequence || selectedRecipients.length === 0) return;
    
    const currentRecipients = Array.isArray(sequence.recipients) ? sequence.recipients : [];
    const newRecipients = currentRecipients.filter((_: any, i: number) => !selectedRecipients.includes(i));
    
    setSequence((prev: any) => ({ ...prev, recipients: newRecipients }));
    setSelectedRecipients([]);

    try {
      await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: newRecipients }),
      });
    } catch (error) {
      console.error("Failed to delete recipients", error);
    }
  };

  const handleSendTestEmail = async () => {
    toast.success("Test email sent to your inbox!");
  };

  const handleStartSequence = async () => {
    if (!recipients || recipients.length === 0) {
      toast.error("Please add recipients before starting the sequence.");
      return;
    }
    if (!sequence.stages || sequence.stages.length === 0) {
      toast.error("Please add at least one stage before starting the sequence.");
      return;
    }
    try {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (res.ok) {
        toast.success("Sequence started successfully!");
        router.push("/sequences");
      } else {
        toast.error("Failed to start sequence.");
      }
    } catch (error) {
      console.error("Failed to start sequence", error);
      toast.error("An error occurred while starting the sequence.");
    }
  };

  if (loading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!sequence) {
    return <div className="p-8 text-center">Sequence not found.</div>;
  }

  const activeStage = sequence.stages?.find((s: any) => s.id === activeStageId);
  const recipients = Array.isArray(sequence.recipients) ? sequence.recipients : [];

  return (
    <div className="flex h-full w-full bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-[280px] flex-shrink-0 border-r border-border p-6 flex flex-col space-y-6">
        <div className="flex items-center space-x-2 text-foreground">
          <h2 className="text-xl font-bold truncate">{sequence.name}</h2>
          <Edit2 className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" onClick={openEditDialog} />
        </div>
        
        <div className="flex flex-col space-y-1">
          <div 
            onClick={() => setActiveStageId("recipients")}
            className={`flex items-center space-x-3 px-2 py-2 rounded-md cursor-pointer text-sm transition-colors ${activeStageId === "recipients" ? 'bg-muted text-blue-500 font-medium' : 'hover:bg-muted/50'}`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${activeStageId === "recipients" ? 'border-blue-500 text-blue-500' : 'border-blue-600 text-blue-600'}`}>1</div>
            <span>Define recipients list</span>
          </div>
          
          {sequence.stages?.map((stage: any, index: number) => (
            <div 
              key={stage.id} 
              onClick={() => setActiveStageId(stage.id)}
              className={`group flex items-center justify-between px-2 py-2 rounded-md cursor-pointer text-sm transition-colors ${activeStageId === stage.id ? 'bg-muted text-blue-500 font-medium' : 'hover:bg-muted/50'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStageId === stage.id ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {index + 2}
                </div>
                <span>{stage.name}</span>
              </div>
              <Trash2 
                className="w-4 h-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }}
              />
            </div>
          ))}
          
          <div 
            onClick={handleCreateStage}
            className="flex items-center space-x-3 px-2 py-2 mt-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm text-blue-500"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <span className="text-lg">+</span>
            </div>
            <span>Add stage</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8">
        <div className="flex justify-end mb-8">
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1.5 rounded-full border border-border bg-muted text-sm text-muted-foreground">
              From: {sequence.channel?.email_address || sequence.channel?.emailAddress}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                <DropdownMenuItem className="text-destructive focus:bg-muted cursor-pointer" onClick={handleDeleteSequence}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete sequence
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {activeStageId === "recipients" && (
          <div className="max-w-4xl flex flex-col h-full">
            <h1 className="text-2xl font-bold text-foreground mb-2">Import recipients list</h1>
            <p className="text-muted-foreground text-sm mb-6">The recipient list is limited to 200.</p>
            
            <div className="flex items-center space-x-4 mb-8 flex-wrap gap-y-4">
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Button 
                variant="outline" 
                className="bg-transparent border-border text-foreground hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload .csv file
              </Button>
              
              <div className="flex items-center space-x-2 border-l border-border pl-4 ml-4">
                <Input 
                  placeholder="name@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddManualEmail()}
                  className="bg-background border-input text-foreground w-[250px]"
                />
                <Button 
                  variant="secondary"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleAddManualEmail}
                >
                  Add
                </Button>
              </div>
              
              <a href="#" className="text-blue-500 text-sm hover:underline ml-auto">Why is there a limit? ↗</a>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{recipients.length} recipients</p>
            {selectedRecipients.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mb-4 bg-transparent border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedRecipients.length} selected
              </Button>
            )}
            
            <div className="border border-border rounded-md overflow-hidden bg-card">
              <div className="flex items-center border-b border-border px-4 py-3 bg-muted/50">
                <div className="w-12 flex justify-center">
                  <Checkbox 
                    className="border-primary" 
                    checked={recipients.length > 0 && selectedRecipients.length === recipients.length}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </div>
                <div className="flex-1 text-sm font-semibold text-green-500 flex items-center space-x-2">
                  <List className="w-4 h-4" />
                  <span>Email</span>
                </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {recipients.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No recipients added yet.
                  </div>
                ) : (
                  recipients.map((r: any, i: number) => (
                    <div key={i} className="flex items-center border-b border-border px-4 py-3 hover:bg-muted/30">
                      <div className="w-12 flex justify-center">
                        <Checkbox 
                          className="border-primary" 
                          checked={selectedRecipients.includes(i)}
                          onCheckedChange={(checked) => handleSelectRow(i, checked as boolean)}
                        />
                      </div>
                      <div className="flex-1 text-sm text-foreground">{r.email}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-auto pt-6 flex justify-end">
              <div className="flex space-x-3 items-center border-t border-border w-full justify-end pt-6">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setActiveStageId(sequence.stages?.[0]?.id || null)}
                  disabled={!sequence.stages?.length}
                >
                  Next: {sequence.stages?.[0]?.name || "Stage A"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStage && (
          <div className="max-w-3xl space-y-6 flex flex-col h-full">
            {(() => {
              const currentDate = activeStage.sendDate ? new Date(activeStage.sendDate) : new Date();
              const dateValue = currentDate.getFullYear() + "-" + String(currentDate.getMonth() + 1).padStart(2, '0') + "-" + String(currentDate.getDate()).padStart(2, '0');
              const timeValue = String(currentDate.getHours()).padStart(2, '0') + ":" + String(currentDate.getMinutes()).padStart(2, '0');
              
              return (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Send date and time</Label>
                  <div className="flex items-center space-x-3">
                    <Input 
                      type="date" 
                      value={dateValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [year, month, day] = val.split('-');
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(Number(year), Number(month) - 1, Number(day));
                        handleUpdateStage(activeStage.id, { sendDate: newDate.toISOString() });
                      }}
                      className="bg-background border-input w-[160px] text-foreground" 
                    />
                    <span className="text-muted-foreground">at</span>
                    <Input 
                      type="time" 
                      value={timeValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [hours, minutes] = val.split(':');
                        const newDate = new Date(currentDate);
                        newDate.setHours(Number(hours), Number(minutes), 0, 0);
                        handleUpdateStage(activeStage.id, { sendDate: newDate.toISOString() });
                      }}
                      className="bg-background border-input w-[120px] text-foreground" 
                    />
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Subject</Label>
              <Input 
                placeholder="Subject" 
                value={activeStage.subject || ""}
                onChange={(e) => handleUpdateStage(activeStage.id, { subject: e.target.value })}
                className="bg-background border-input text-foreground" 
              />
            </div>

            <RichTextEditor 
              content={activeStage.bodyHtml || ""}
              onChange={(html) => handleUpdateStage(activeStage.id, { bodyHtml: html })}
            />
            
            <p className="text-xs text-muted-foreground">
              You can use variables that will be replaced dynamically. <a href="#" className="text-blue-500 hover:underline">Learn more</a>
            </p>
            
            <div className="mt-auto pt-6 flex justify-end">
              <div className="flex space-x-3 items-center border-t border-border w-full justify-end pt-6">
                <Button variant="outline" className="bg-transparent border-border text-foreground hover:bg-muted" onClick={handleCreateStage}>
                  Add stage
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleStartSequence}
                >
                  Start sequence
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Sequence Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-center font-normal">Edit sequence</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-background border-input" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="from" className="text-xs font-semibold text-foreground">From <span className="text-destructive">*</span></Label>
              <Select value={editChannelId} onValueChange={setEditChannelId}>
                <SelectTrigger className="bg-background border-input">
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
              <Label htmlFor="cc" className="text-xs font-semibold text-foreground">Cc</Label>
              <Input id="cc" value={editCc} onChange={(e) => setEditCc(e.target.value)} className="bg-background border-input" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bcc" className="text-xs font-semibold text-foreground">Bcc</Label>
              <Input id="bcc" value={editBcc} onChange={(e) => setEditBcc(e.target.value)} className="bg-background border-input" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sender" className="text-xs font-semibold text-foreground">Sender name <span className="text-destructive">*</span></Label>
              <Input id="sender" value={editSenderName} onChange={(e) => setEditSenderName(e.target.value)} className="bg-background border-input" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="hover:bg-muted">Cancel</Button>
            <Button onClick={handleUpdateSequence} className="bg-blue-600 hover:bg-blue-700 text-white">OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
