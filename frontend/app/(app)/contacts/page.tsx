"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BriefcaseBusiness,
  Info,
  Lock,
  Plus,
  Search,
  UserRoundPlus,
  Users,
  CircleUser,
  Mail,
  Phone,
  Loader2,
  List,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWorkspaceStore } from "@/context/workspace-store";
import { authClient } from "@/lib/auth-client";

type ContactView = "shared" | "private" | "auto-created" | "lists" | "accounts";

type ContactRecord = {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone?: string;
  x?: string;
  description?: string;
  access: "Shared" | "Private" | "Auto-created";
  account?: string;
};

const viewConfig: Record<ContactView, {
  title: string;
  icon: typeof Users;
  helper?: {
    title: string;
    body: string;
  };
}> = {
  shared: {
    title: "Shared contacts",
    icon: Users,
  },
  private: {
    title: "Private contacts",
    icon: Lock,
    helper: {
      title: "What are private contacts?",
      body: "Contacts that you add to this list will be kept private. Their information will not be shared with anyone else on your team.",
    },
  },
  "auto-created": {
    title: "Auto-created contacts",
    icon: UserRoundPlus,
    helper: {
      title: "What are auto-created contacts?",
      body: "When someone reaches out to you or to an inbox you have access to, their contact information is added here automatically. Access follows the conversations that created the contact.",
    },
  },
  lists: {
    title: "Lists",
    icon: Users,
  },
  accounts: {
    title: "Accounts",
    icon: BriefcaseBusiness,
  },
};

function normalizeView(value: string | null): ContactView {
  if (value === "private" || value === "auto-created" || value === "lists" || value === "accounts") {
    return value;
  }
  return "shared";
}

function ContactAvatar({ initials }: { initials: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
      {initials}
    </span>
  );
}

function EmptyState({
  view,
  onCreateClick,
  onImportClick,
}: {
  view: ContactView;
  onCreateClick: () => void;
  onImportClick: () => void;
}) {
  const titles = {
    shared: "No shared contacts",
    private: "No private contacts",
    "auto-created": "No auto-created contacts",
    lists: "No lists found",
    accounts: "No accounts found",
  };

  const descriptions = {
    shared: "Shared Contacts allow you to manage contact information that is shared across your entire company within the app.",
    private: "Private Contacts are only visible to you. Their information will not be shared with anyone else on your team.",
    "auto-created": "Auto-created contacts are added when someone reaches out to a shared or private inbox. Access follows conversation history.",
    lists: "Lists allow you to group contacts together for outreach campaigns and organization.",
    accounts: "Accounts represent companies or organizations that your contacts belong to.",
  };

  const title = titles[view] || "No contacts found";
  const desc = descriptions[view] || "";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted/40 border border-border/50 text-muted-foreground">
        <Users className="size-8 opacity-70" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{desc}</p>
      {(view === "shared" || view === "private") && (
        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onCreateClick}>
            <Plus className="size-4 mr-1" />
            Create
          </Button>
          <Button size="sm" onClick={onImportClick} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <ArrowDownToLine className="size-4 mr-1" />
            Import
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setActiveView } = useWorkspaceStore();
  const { data: orgData } = authClient.useActiveOrganization();

  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [contactLists, setContactLists] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dropdown options
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [availableLists, setAvailableLists] = useState<any[]>([]);

  // Create Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState<"Shared" | "Private">("Shared");
  const [selectedAccountId, setSelectedAccountId] = useState("none");
  const [selectedListId, setSelectedListId] = useState("none");

  // Create List Form States
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListVisibility, setNewListVisibility] = useState<"Shared" | "Private">("Shared");

  // Create Account Form States
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [accountTab, setAccountTab] = useState<"about" | "contacts">("about");
  const [accountContacts, setAccountContacts] = useState<ContactRecord[]>([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountDomain, setNewAccountDomain] = useState("");
  const [newAccountDescription, setNewAccountDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Export Modal States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportType, setExportType] = useState<"shared" | "private" | "shared-auto">("shared");
  const [isGeneratingExport, setIsGeneratingExport] = useState(false);

  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const view = normalizeView(searchParams.get("view"));
  const config = viewConfig[view];
  const ActiveIcon = config.icon;

  const listIdParam = searchParams.get("listId");
  const accountIdParam = searchParams.get("accountId");

  const handleSaveList = async () => {
    if (!newListName.trim()) return;
    setIsSaving(true);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (orgData?.id) {
        headers["x-org-id"] = orgData.id;
      }
      const response = await fetch("/api/contacts/lists", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newListName.trim(),
          visibility: newListVisibility,
        }),
      });

      if (response.ok) {
        setNewListName("");
        setNewListVisibility("Shared");
        setIsCreateListOpen(false);
        void loadData();
        // Refresh list options in contact drawer
        fetch("/api/contacts/lists", { headers, cache: "no-store" })
          .then(res => res.ok ? res.json() : { lists: [] })
          .then(data => setAvailableLists(data.lists || []));
        // Refresh sidebar
        window.dispatchEvent(new CustomEvent("contacts-data-changed"));
      } else {
        alert("Failed to create list.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete list "${name}"?`)) return;
    setIsSaving(true);
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
      const response = await fetch(`/api/contacts/lists/${id}`, {
        method: "DELETE",
        headers,
      });
      if (response.ok) {
        router.push("/contacts?view=lists");
        void loadData();
        // Refresh list options in contact drawer
        fetch("/api/contacts/lists", { headers, cache: "no-store" })
          .then(res => res.ok ? res.json() : { lists: [] })
          .then(data => setAvailableLists(data.lists || []));
        // Refresh sidebar
        window.dispatchEvent(new CustomEvent("contacts-data-changed"));
      } else {
        alert("Failed to delete list.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditAccount = async (account: any) => {
    setEditingAccount(account);
    setNewAccountName(account.name || "");
    setNewAccountDomain(account.domain || "");
    setNewAccountDescription(account.description && account.description !== "--" ? account.description : "");
    setAccountTab("about");
    setIsCreateAccountOpen(true);
    
    // Fetch associated contacts
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
      const res = await fetch(`/api/contacts?accountId=${account.id}`, { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAccountContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAccount = async () => {
    if (!newAccountName.trim()) return;
    setIsSaving(true);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (orgData?.id) {
        headers["x-org-id"] = orgData.id;
      }
      
      const url = editingAccount ? `/api/contacts/accounts/${editingAccount.id}` : "/api/contacts/accounts";
      const method = editingAccount ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: newAccountName.trim(),
          domain: newAccountDomain.trim() || null,
          description: newAccountDescription.trim() || null,
        }),
      });

      if (response.ok) {
        setNewAccountName("");
        setNewAccountDomain("");
        setNewAccountDescription("");
        setEditingAccount(null);
        setIsCreateAccountOpen(false);
        void loadData();
        // Refresh account options in contact drawer
        fetch("/api/contacts/accounts", { headers, cache: "no-store" })
          .then(res => res.ok ? res.json() : { accounts: [] })
          .then(data => setAvailableAccounts(data.accounts || []));
        // Refresh sidebar
        window.dispatchEvent(new CustomEvent("contacts-data-changed"));
      } else {
        alert("Failed to create account.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete account "${name}"?`)) return;
    setIsSaving(true);
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
      const response = await fetch(`/api/contacts/accounts/${id}`, {
        method: "DELETE",
        headers,
      });
      if (response.ok) {
        router.push("/contacts?view=accounts");
        void loadData();
        // Refresh account options in contact drawer
        fetch("/api/contacts/accounts", { headers, cache: "no-store" })
          .then(res => res.ok ? res.json() : { accounts: [] })
          .then(data => setAvailableAccounts(data.accounts || []));
        // Refresh sidebar
        window.dispatchEvent(new CustomEvent("contacts-data-changed"));
      } else {
        alert("Failed to delete account.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setActiveView("contacts");
  }, [setActiveView]);

  useEffect(() => {
    if (!searchParams.get("view")) {
      router.replace("/contacts?view=shared");
    }
  }, [router, searchParams]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;

      if (listIdParam) {
        const params = new URLSearchParams();
        params.set("listId", listIdParam);
        if (query.trim()) {
          params.set("query", query.trim());
        }
        const res = await fetch(`/api/contacts?${params.toString()}`, { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } else if (accountIdParam) {
        const params = new URLSearchParams();
        params.set("accountId", accountIdParam);
        if (query.trim()) {
          params.set("query", query.trim());
        }
        const res = await fetch(`/api/contacts?${params.toString()}`, { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } else if (view === "lists") {
        const res = await fetch("/api/contacts/lists", { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setContactLists(data.lists || []);
        }
      } else if (view === "accounts") {
        const res = await fetch("/api/contacts/accounts", { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
        }
      } else {
        const params = new URLSearchParams();
        params.set("view", view);
        if (query.trim()) {
          params.set("query", query.trim());
        }
        const res = await fetch(`/api/contacts?${params.toString()}`, { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      }
    } catch (error) {
      console.error("Failed to load contacts data", error);
    } finally {
      setIsLoading(false);
    }
  }, [orgData?.id, view, query, listIdParam, accountIdParam]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);

  // Load dropdown resources
  useEffect(() => {
    const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
    fetch("/api/contacts/accounts", { headers, cache: "no-store" })
      .then(res => res.ok ? (res.json() as Promise<any>) : { accounts: [] })
      .then(data => setAvailableAccounts(data.accounts || []))
      .catch(console.error);

    fetch("/api/contacts/lists", { headers, cache: "no-store" })
      .then(res => res.ok ? (res.json() as Promise<any>) : { lists: [] })
      .then(data => setAvailableLists(data.lists || []))
      .catch(console.error);
  }, [orgData?.id]);

  useEffect(() => {
    if (isCreateOpen && !editingContact) {
      if (view === "private") {
        setAccess("Private");
      } else {
        setAccess("Shared");
      }
    }
  }, [isCreateOpen, editingContact, view]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setXHandle("");
    setDescription("");
    setSelectedAccountId("none");
    setSelectedListId("none");
    setAccess(view === "private" ? "Private" : "Shared");
    setEditingContact(null);
  };

  const openEditContact = (contact: ContactRecord) => {
    setEditingContact(contact);
    setName(contact.name || "");
    setEmail(contact.email || "");
    setPhone(contact.phone && contact.phone !== "--" ? contact.phone : "");
    setXHandle(contact.x && contact.x !== "--" ? contact.x : "");
    setDescription(contact.description && contact.description !== "--" ? contact.description : "");
    setAccess(contact.access === "Private" ? "Private" : "Shared");
    
    const matchedAccount = availableAccounts.find(acc => acc.name === contact.account);
    setSelectedAccountId(matchedAccount ? matchedAccount.id : "none");
    setSelectedListId("none");
    setIsCreateOpen(true);
  };

  const handleSaveContact = async () => {
    if (!name.trim() || (!email.trim() && !phone.trim() && !xHandle.trim())) return;
    setIsSaving(true);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (orgData?.id) {
        headers["x-org-id"] = orgData.id;
      }
      
      const url = editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts";
      const method = editingContact ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          x: xHandle.trim() || null,
          description: description.trim() || null,
          access,
          accountId: selectedAccountId !== "none" ? selectedAccountId : null,
          listId: selectedListId !== "none" ? selectedListId : null,
        }),
      });

      if (response.ok) {
        resetForm();
        setIsCreateOpen(false);
        void loadData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save contact.");
      }
    } catch (error) {
      console.error("Save contact error", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!editingContact) return;
    if (!window.confirm(`Are you sure you want to delete ${editingContact.name}?`)) return;

    setIsSaving(true);
    try {
      const headers: Record<string, string> = {};
      if (orgData?.id) {
        headers["x-org-id"] = orgData.id;
      }
      const response = await fetch(`/api/contacts/${editingContact.id}`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        resetForm();
        setIsCreateOpen(false);
        void loadData();
      } else {
        alert("Failed to delete contact.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateExport = async () => {
    setIsGeneratingExport(true);
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
      let exportedContacts: ContactRecord[] = [];

      if (exportType === "shared") {
        const res = await fetch("/api/contacts?view=shared", { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          exportedContacts = data.contacts || [];
        }
      } else if (exportType === "private") {
        const res = await fetch("/api/contacts?view=private", { headers, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          exportedContacts = data.contacts || [];
        }
      } else {
        const [resShared, resAuto] = await Promise.all([
          fetch("/api/contacts?view=shared", { headers, cache: "no-store" }),
          fetch("/api/contacts?view=auto-created", { headers, cache: "no-store" }),
        ]);
        const sData = resShared.ok ? await resShared.json() : {};
        const aData = resAuto.ok ? await resAuto.json() : {};
        exportedContacts = [...(sData.contacts || []), ...(aData.contacts || [])];
      }

      if (exportedContacts.length === 0) {
        alert("No contacts found to export.");
        setIsExportOpen(false);
        return;
      }

      const csvData = exportedContacts.map(c => ({
        Name: c.name,
        Email: c.email || "",
        Phone: c.phone || "",
        X: c.x || "",
        Description: c.description || "",
        Access: c.access,
        Account: c.account || "",
      }));

      const csvString = Papa.unparse(csvData);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `contacts-export-${exportType}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExportOpen(false);
    } catch (err) {
      console.error("Export error", err);
      alert("Failed to export contacts.");
    } finally {
      setIsGeneratingExport(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedRows = results.data as any[];
        const contactsToImport = parsedRows
          .map(row => ({
            name: row.Name || row.name || "",
            email: row.Email || row.email || null,
            phone: row.Phone || row.phone || null,
            x: row.X || row.x || null,
            description: row.Description || row.description || null,
            access: row.Access || row.access || "Shared",
            account: row.Account || row.account || null,
            listId: listIdParam || undefined,
            accountId: accountIdParam || undefined,
          }))
          .filter(c => c.name && (c.email || c.phone || c.x));

        if (contactsToImport.length === 0) {
          alert("No valid contacts found. Verify column headers: Name, and at least one of: Email, Phone, X.");
          return;
        }

        try {
          const headers: Record<string, string> = { "content-type": "application/json" };
          if (orgData?.id) {
            headers["x-org-id"] = orgData.id;
          }

          const res = await fetch("/api/contacts/batch", {
            method: "POST",
            headers,
            body: JSON.stringify({ contacts: contactsToImport }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.errors && data.errors.length > 0) {
              alert(`Successfully imported ${data.createdCount} contacts. ${data.errors.length} contacts failed (e.g. duplicate email).`);
            } else {
              alert(`Successfully imported ${data.createdCount} contacts!`);
            }
            void loadData();
          } else {
            alert("Failed to batch import contacts.");
          }
        } catch (err) {
          console.error(err);
          alert("Import error.");
        }
      },
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBackToAllLists = () => {
    router.push("/contacts?view=lists");
  };

  const handleBackToAllAccounts = () => {
    router.push("/contacts?view=accounts");
  };

  const activeListName = useMemo(() => {
    if (!listIdParam) return null;
    return availableLists.find((l) => l.id === listIdParam)?.name || "List";
  }, [listIdParam, availableLists]);

  const activeAccountName = useMemo(() => {
    if (!accountIdParam) return null;
    return availableAccounts.find((a) => a.id === accountIdParam)?.name || "Account";
  }, [accountIdParam, availableAccounts]);

  const isContactTable = view === "shared" || view === "private" || view === "auto-created" || !!listIdParam || !!accountIdParam;

  const handleCreateClick = () => {
    if (view === "lists" && !listIdParam) {
      setIsCreateListOpen(true);
    } else if (view === "accounts" && !accountIdParam) {
      setEditingAccount(null);
      setNewAccountName("");
      setNewAccountDomain("");
      setNewAccountDescription("");
      setAccountTab("about");
      setIsCreateAccountOpen(true);
    } else {
      resetForm();
      if (listIdParam) {
        setSelectedListId(listIdParam);
      }
      if (accountIdParam) {
        setSelectedAccountId(accountIdParam);
      }
      setIsCreateOpen(true);
    }
  };

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden bg-background text-foreground">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-border/70 px-8 py-5">
          <div className="flex min-w-0 items-center gap-3">
            {listIdParam ? (
              <div className="flex items-center gap-2">
                <button onClick={handleBackToAllLists} className="mr-1 rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <ActiveIcon className="size-5 text-muted-foreground" />
                <h1 className="truncate text-xl font-semibold tracking-normal">
                  Lists <span className="text-muted-foreground/60 mx-1">/</span> {activeListName}
                </h1>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 ml-2 font-semibold" onClick={() => handleDeleteList(listIdParam, activeListName)}>
                  Delete List
                </Button>
              </div>
            ) : accountIdParam ? (
              <div className="flex items-center gap-2">
                <button onClick={handleBackToAllAccounts} className="mr-1 rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <ActiveIcon className="size-5 text-muted-foreground" />
                <h1 className="truncate text-xl font-semibold tracking-normal">
                  Accounts <span className="text-muted-foreground/60 mx-1">/</span> {activeAccountName}
                </h1>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 ml-2 font-semibold" onClick={() => handleDeleteAccount(accountIdParam, activeAccountName)}>
                  Delete Account
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-3">
                <ActiveIcon className="size-5 text-muted-foreground" />
                <h1 className="truncate text-xl font-semibold tracking-normal">{config.title}</h1>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleImportCSV}
            />
            {isContactTable && (
              <>
                <Button variant="outline" size="lg" onClick={() => setIsExportOpen(true)}>
                  <ArrowUpFromLine className="size-4" />
                  Export
                </Button>
                <Button size="lg" onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
                  <ArrowDownToLine className="size-4" />
                  Import
                </Button>
              </>
            )}
            <Button variant="outline" size="lg" onClick={handleCreateClick}>
              <Plus className="size-4" />
              Create
            </Button>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 gap-8 overflow-hidden px-8 py-7">
          <div className="min-w-0 flex-1 overflow-auto">
            <div className="mb-5 flex max-w-xl items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3">
              <Search className="size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search contacts"
                className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-5 animate-spin" />
                Loading contacts...
              </div>
            ) : (
              <>
                {isContactTable && contacts.length === 0 ? (
                  <EmptyState
                    view={view}
                    onCreateClick={handleCreateClick}
                    onImportClick={() => fileInputRef.current?.click()}
                  />
                ) : (
                  <>
                    {isContactTable && (
                      <div className="overflow-hidden rounded-md border border-border/70">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[32%] px-6 text-muted-foreground">Name</TableHead>
                              <TableHead className="text-muted-foreground">Email</TableHead>
                              <TableHead className="text-muted-foreground">Phone Number</TableHead>
                              <TableHead className="text-muted-foreground">X</TableHead>
                              <TableHead className="text-muted-foreground">Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contacts.map((contact) => (
                              <TableRow
                                key={contact.id}
                                className="border-border/60 cursor-pointer hover:bg-muted/40 transition-colors"
                                onClick={() => openEditContact(contact)}
                              >
                                <TableCell className="px-6">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <ContactAvatar initials={contact.initials} />
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold">{contact.name}</p>
                                      {contact.account && (
                                        <p className="truncate text-xs text-muted-foreground">{contact.account}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {contact.email ? (
                                    <a className="text-primary hover:underline" href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
                                      {contact.email}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground/60">--</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{contact.phone || "--"}</TableCell>
                                <TableCell className="text-muted-foreground">{contact.x || "--"}</TableCell>
                                <TableCell className="text-muted-foreground">{contact.description || "--"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {view === "lists" && !listIdParam && (
                      <div className="overflow-hidden rounded-md border border-border/70">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="px-6 text-muted-foreground">List</TableHead>
                              <TableHead className="text-muted-foreground">Visibility</TableHead>
                              <TableHead className="text-muted-foreground">Contacts</TableHead>
                              <TableHead className="text-muted-foreground">Owner</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contactLists.map((list) => (
                              <TableRow key={list.id} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => router.push(`/contacts?view=shared&listId=${list.id}`)}>
                                <TableCell className="px-6 font-semibold flex items-center gap-2">
                                  <List className="size-4 text-muted-foreground" />
                                  {list.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{list.visibility}</TableCell>
                                <TableCell className="text-muted-foreground">{list.contacts}</TableCell>
                                <TableCell className="text-muted-foreground">{list.owner}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {contactLists.length === 0 && <EmptyState view={view} onCreateClick={handleCreateClick} onImportClick={() => {}} />}
                      </div>
                    )}

                    {view === "accounts" && !accountIdParam && (
                      <div className="overflow-hidden rounded-md border border-border/70">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="px-6 text-muted-foreground">Account</TableHead>
                              <TableHead className="text-muted-foreground">Domain</TableHead>
                              <TableHead className="text-muted-foreground">Contacts</TableHead>
                              <TableHead className="text-muted-foreground">Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accounts.map((account) => (
                              <TableRow key={account.id} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => openEditAccount(account)}>
                                <TableCell className="px-6 font-semibold flex items-center gap-2">
                                  <BriefcaseBusiness className="size-4 text-muted-foreground" />
                                  {account.name}
                                </TableCell>
                                <TableCell>
                                  <a className="text-primary hover:underline" href={`https://${account.domain}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                    {account.domain}
                                  </a>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{account.contacts}</TableCell>
                                <TableCell className="text-muted-foreground">{account.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {accounts.length === 0 && <EmptyState view={view} onCreateClick={handleCreateClick} onImportClick={() => {}} />}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {config.helper && (
            <aside className="hidden w-80 shrink-0 lg:block">
              <div className="rounded-lg border border-border/50 bg-card/70 p-6 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <h2 className="text-base font-semibold leading-snug">{config.helper.title}</h2>
                </div>
                <p className="text-sm leading-6 text-foreground/90">{config.helper.body}</p>
              </div>
            </aside>
          )}
        </section>
      </div>

      {/* Right side popup Sheet for creating or editing contact */}
      <Sheet open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) resetForm();
      }}>
        <SheetContent className="w-full sm:max-w-md border-l border-border/70 flex flex-col p-0 bg-popover text-popover-foreground">
          <SheetHeader className="px-6 py-5 border-b border-border/70 flex flex-row items-center justify-between shrink-0">
            <div>
              <SheetTitle className="text-lg font-semibold tracking-tight">
                {editingContact ? "Edit contact" : "New contact"}
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Avatar & Add Name */}
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted border border-border/70 text-muted-foreground">
                <CircleUser className="size-8 opacity-65" />
              </div>
              <div className="flex-1">
                <Input
                  className="h-10 text-lg font-semibold border-0 border-b border-border/70 focus-visible:ring-0 focus-visible:border-primary rounded-none px-0 bg-transparent shadow-none"
                  placeholder="Add name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Access selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access *</label>
              <Select value={access} onValueChange={(val: any) => setAccess(val)}>
                <SelectTrigger className="h-9 w-full bg-background border-border/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shared">
                    <span className="flex items-center gap-2">
                      <Users className="size-3.5" />
                      Shared
                    </span>
                  </SelectItem>
                  <SelectItem value="Private">
                    <span className="flex items-center gap-2">
                      <Lock className="size-3.5" />
                      Private
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-9 w-full bg-background border-border/70">
                  <SelectValue placeholder="Add to account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Add to account</SelectItem>
                  {availableAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
                        {acc.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between uppercase tracking-wider">
                  <span>Contact Information *</span>
                  <span className="text-[10px] font-normal italic text-muted-foreground/80 normal-case">(at least one required)</span>
                </label>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/75" />
                <Input
                  className="pl-9 h-9 border-border/70 bg-background"
                  placeholder="Add email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/75" />
                <Input
                  className="pl-9 h-9 border-border/70 bg-background"
                  placeholder="Add phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="relative">
                <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/75 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <Input
                  className="pl-9 h-9 border-border/70 bg-background"
                  placeholder="Add X handle"
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                />
              </div>
            </div>

            {/* Description textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea
                className="min-h-24 bg-background border-border/70 text-sm"
                placeholder="Add description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Lists selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lists</label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="h-9 w-full bg-background border-border/70">
                  <SelectValue placeholder="Add to list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Add to list</SelectItem>
                  {availableLists.map(lst => (
                    <SelectItem key={lst.id} value={lst.id}>
                      <span className="flex items-center gap-2">
                        <Users className="size-3.5 text-muted-foreground" />
                        {lst.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline text-left block"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Show less" : "Show more"}
            </button>

            {showMore && (
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground space-y-1.5 animate-in fade-in duration-200">
                <p><strong>Additional Details:</strong></p>
                <p>Organization Context: {orgData?.name || "Global"}</p>
                <p>System UID: Auto-generated on save</p>
              </div>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border/70 flex items-center justify-end gap-3 bg-muted/10 shrink-0">
            {editingContact && (
              <Button
                variant="ghost"
                onClick={handleDeleteContact}
                disabled={isSaving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 mr-auto font-semibold"
              >
                Delete contact
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false);
              resetForm();
            }} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveContact}
              disabled={isSaving || !name.trim() || (!email.trim() && !phone.trim() && !xHandle.trim())}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? "Saving..." : editingContact ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Export contacts modal popup dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md border border-border/70 bg-popover text-popover-foreground rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-lg">Export contacts</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Select value={exportType} onValueChange={(val: any) => setExportType(val)}>
              <SelectTrigger className="h-10 w-full bg-background border-border/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">
                  <span className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    Shared contacts
                  </span>
                </SelectItem>
                <SelectItem value="private">
                  <span className="flex items-center gap-2">
                    <Lock className="size-4 text-muted-foreground" />
                    Private contacts
                  </span>
                </SelectItem>
                <SelectItem value="shared-auto">
                  <span className="flex items-center justify-between w-full min-w-[200px]">
                    <span className="flex items-center gap-2">
                      <UserRoundPlus className="size-4 text-muted-foreground" />
                      Shared and auto-created
                    </span>
                    <Info className="size-3.5 text-muted-foreground/60 ml-2" />
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsExportOpen(false)} disabled={isGeneratingExport}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateExport}
              disabled={isGeneratingExport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              {isGeneratingExport ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                "Generate export"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create List Modal */}
      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent className="sm:max-w-md border border-border/70 bg-popover text-popover-foreground rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-lg">New contact list</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">List Name *</label>
              <Input
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Q2 Outreach"
                className="h-10 border-border/70"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Visibility</label>
              <Select value={newListVisibility} onValueChange={(val: any) => setNewListVisibility(val)}>
                <SelectTrigger className="h-10 w-full bg-background border-border/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shared">
                    <span className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      Shared (everyone on your team)
                    </span>
                  </SelectItem>
                  <SelectItem value="Private">
                    <span className="flex items-center gap-2">
                      <Lock className="size-4 text-muted-foreground" />
                      Private (only visible to you)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateListOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveList}
              disabled={isSaving || !newListName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              {isSaving ? "Creating..." : "Create list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Modal */}
      <Sheet open={isCreateAccountOpen} onOpenChange={(open) => {
        setIsCreateAccountOpen(open);
        if (!open) {
          setEditingAccount(null);
          setNewAccountName("");
          setNewAccountDomain("");
          setNewAccountDescription("");
        }
      }}>
        <SheetContent className="w-full sm:max-w-md border-l border-border/70 flex flex-col p-0 bg-popover text-popover-foreground">
          <SheetHeader className="px-6 py-5 border-b border-border/70 flex flex-col shrink-0">
            <SheetTitle className="text-lg font-semibold tracking-tight">
              {editingAccount ? "Account details" : "New account"}
            </SheetTitle>
            {editingAccount && (
              <div className="flex items-center gap-4 mt-4 text-sm font-medium border-b border-border/50 pb-2">
                <button
                  onClick={() => setAccountTab("about")}
                  className={`pb-2 ${accountTab === "about" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  About
                </button>
                <button
                  onClick={() => setAccountTab("contacts")}
                  className={`pb-2 ${accountTab === "contacts" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Contacts
                </button>
              </div>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {accountTab === "about" || !editingAccount ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Account Name *</label>
                  <Input
                    required
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="h-10 border-border/70"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Domain</label>
                  <Input
                    value={newAccountDomain}
                    onChange={(e) => setNewAccountDomain(e.target.value)}
                    placeholder="e.g. acme.com"
                    className="h-10 border-border/70"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                  <Textarea
                    value={newAccountDescription}
                    onChange={(e) => setNewAccountDescription(e.target.value)}
                    placeholder="Add brief details about the company..."
                    className="min-h-20 border-border/70"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Associated Contacts</h3>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsCreateAccountOpen(false);
                    resetForm();
                    setSelectedAccountId(editingAccount.id);
                    setIsCreateOpen(true);
                  }}>
                    <Plus className="size-4 mr-1" />
                    Add contact
                  </Button>
                </div>
                {accountContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No contacts found for this account.</p>
                ) : (
                  <div className="space-y-2">
                    {accountContacts.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/40 cursor-pointer" onClick={() => {
                        setIsCreateAccountOpen(false);
                        openEditContact(c);
                      }}>
                        <ContactAvatar initials={c.initials} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border/70 flex items-center justify-end gap-3 bg-muted/10 shrink-0">
            {editingAccount && (
              <Button
                variant="ghost"
                onClick={() => {
                  handleDeleteAccount(editingAccount.id, editingAccount.name);
                  setIsCreateAccountOpen(false);
                }}
                disabled={isSaving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 mr-auto font-semibold"
              >
                Delete account
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsCreateAccountOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            {accountTab === "about" && (
              <Button
                onClick={handleSaveAccount}
                disabled={isSaving || !newAccountName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {isSaving ? "Saving..." : editingAccount ? "Save" : "Create"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  );
}
