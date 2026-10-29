export type ConversationFilter = "all" | "assigned" | "unassigned" | "open" | "pending" | "closed" | "snoozed" | "subscribed" | "test" | "later" | "done" | "drafts" | "sent" | "trash" | "spam";
export type ThreadStatus = "open" | "pending" | "closed" | "snoozed" | "trashed";

export type MockMessage = {
  id: string;
  from: string;
  to: string;
  sentAt: string;
  body: string;
  raw: Record<string, unknown>;
};

export type MockComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type MockConversation = {
  id: string;
  channelId?: string;
  channelEmail?: string;
  participants?: string[];
  sender: string;
  senderContact: string;
  subject: string;
  snippet: string;
  unreadCount: number;
  replyCount: number;
  assignedTo: string | null;
  status: ThreadStatus;
  lastActivityAt: string;
  createdAt?: string;
  snoozedUntil?: string | null;
  tags?: string[];
  assignmentState?: string;
  priority?: string;
  scope?: string;
  messages: MockMessage[];
  comments?: MockComment[];
};

const now = new Date("2026-03-27T10:00:00.000+05:30");

function minutesAgo(minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export const mockConversations: MockConversation[] = [
  {
    id: "thr-1001",
    sender: "Maya Johnson",
    senderContact: "maya@growthhq.ai",
    subject: "Pricing details for enterprise plan",
    snippet: "Can your team share enterprise pricing and onboarding timeline?",
    unreadCount: 2,
    replyCount: 5,
    assignedTo: "u-sales-1",
    status: "open",
    lastActivityAt: minutesAgo(7),
    messages: [
      {
        id: "msg-1001-1",
        from: "maya@growthhq.ai",
        to: "sales@company.com",
        sentAt: minutesAgo(120),
        body: "Hi team, we are evaluating solutions for Q2. Can you share pricing tiers?",
        raw: { source: "gmail", direction: "inbound" },
      },
      {
        id: "msg-1001-2",
        from: "sales@company.com",
        to: "maya@growthhq.ai",
        sentAt: minutesAgo(90),
        body: "Absolutely. Could you share your expected team size?",
        raw: { source: "smtp", direction: "outbound" },
      },
      {
        id: "msg-1001-3",
        from: "maya@growthhq.ai",
        to: "sales@company.com",
        sentAt: minutesAgo(7),
        body: "Around 180 users, and we need SSO from day one.",
        raw: { source: "gmail", direction: "inbound" },
      },
    ],
  },
  {
    id: "thr-1002",
    sender: "Rajat Verma",
    senderContact: "rajat@northlane.io",
    subject: "Demo follow-up and security checklist",
    snippet: "Thanks for the demo. Sharing our security review checklist.",
    unreadCount: 0,
    replyCount: 3,
    assignedTo: "u-sales-1",
    status: "pending",
    lastActivityAt: minutesAgo(42),
    messages: [
      {
        id: "msg-1002-1",
        from: "rajat@northlane.io",
        to: "sales@company.com",
        sentAt: minutesAgo(180),
        body: "Great meeting. Can we review SOC2 and data residency options?",
        raw: { source: "gmail", direction: "inbound" },
      },
      {
        id: "msg-1002-2",
        from: "sales@company.com",
        to: "rajat@northlane.io",
        sentAt: minutesAgo(120),
        body: "Yes, I have attached the latest compliance documents.",
        raw: { source: "smtp", direction: "outbound" },
      },
      {
        id: "msg-1002-3",
        from: "rajat@northlane.io",
        to: "sales@company.com",
        sentAt: minutesAgo(42),
        body: "Perfect, our legal team will revert by tomorrow.",
        raw: { source: "gmail", direction: "inbound" },
      },
    ],
  },
  {
    id: "thr-1003",
    sender: "Priya Narang",
    senderContact: "priya@orbita.app",
    subject: "Support request: invoices missing",
    snippet: "Our March invoice attachment seems blank for two seats.",
    unreadCount: 1,
    replyCount: 2,
    assignedTo: null,
    status: "open",
    lastActivityAt: minutesAgo(20),
    messages: [
      {
        id: "msg-1003-1",
        from: "priya@orbita.app",
        to: "support@company.com",
        sentAt: minutesAgo(70),
        body: "Invoice issue reported by our finance team.",
        raw: { source: "outlook", direction: "inbound" },
      },
      {
        id: "msg-1003-2",
        from: "support@company.com",
        to: "priya@orbita.app",
        sentAt: minutesAgo(55),
        body: "Checking with billing right now.",
        raw: { source: "smtp", direction: "outbound" },
      },
      {
        id: "msg-1003-3",
        from: "priya@orbita.app",
        to: "support@company.com",
        sentAt: minutesAgo(20),
        body: "Thanks. Please prioritize, renewal is blocked.",
        raw: { source: "outlook", direction: "inbound" },
      },
    ],
  },
  {
    id: "thr-1004",
    sender: "Akhil Kapoor",
    senderContact: "akhil@rayfield.co",
    subject: "Contract signed - next steps",
    snippet: "We signed. Please align implementation kickoff schedule.",
    unreadCount: 0,
    replyCount: 8,
    assignedTo: "u-lead-1",
    status: "closed",
    lastActivityAt: minutesAgo(1440),
    messages: [
      {
        id: "msg-1004-1",
        from: "akhil@rayfield.co",
        to: "sales@company.com",
        sentAt: minutesAgo(2200),
        body: "Contract approved from our side.",
        raw: { source: "gmail", direction: "inbound" },
      },
      {
        id: "msg-1004-2",
        from: "sales@company.com",
        to: "akhil@rayfield.co",
        sentAt: minutesAgo(2160),
        body: "Great news, introducing implementation team.",
        raw: { source: "smtp", direction: "outbound" },
      },
    ],
  },
  {
    id: "thr-1005",
    sender: "Nora Smith",
    senderContact: "nora@acornlabs.com",
    subject: "Need proposal revision",
    snippet: "Can you revise proposal to include annual billing discount?",
    unreadCount: 3,
    replyCount: 4,
    assignedTo: null,
    status: "pending",
    lastActivityAt: minutesAgo(15),
    messages: [
      {
        id: "msg-1005-1",
        from: "nora@acornlabs.com",
        to: "sales@company.com",
        sentAt: minutesAgo(55),
        body: "Pricing is a little above budget for this quarter.",
        raw: { source: "gmail", direction: "inbound" },
      },
      {
        id: "msg-1005-2",
        from: "sales@company.com",
        to: "nora@acornlabs.com",
        sentAt: minutesAgo(34),
        body: "Let me update the options for yearly commitment.",
        raw: { source: "smtp", direction: "outbound" },
      },
      {
        id: "msg-1005-3",
        from: "nora@acornlabs.com",
        to: "sales@company.com",
        sentAt: minutesAgo(15),
        body: "Please include implementation support in the quote.",
        raw: { source: "gmail", direction: "inbound" },
      },
    ],
  },
  {
    id: "thr-1006",
    sender: "Daniel Huang",
    senderContact: "daniel@heliumcrm.io",
    subject: "API rate limits clarification",
    snippet: "What are per-minute caps for webhook callbacks?",
    unreadCount: 0,
    replyCount: 6,
    assignedTo: "u-sales-1",
    status: "snoozed",
    lastActivityAt: minutesAgo(360),
    messages: [
      {
        id: "msg-1006-1",
        from: "daniel@heliumcrm.io",
        to: "support@company.com",
        sentAt: minutesAgo(500),
        body: "We need limit numbers before scaling launch.",
        raw: { source: "outlook", direction: "inbound" },
      },
      {
        id: "msg-1006-2",
        from: "support@company.com",
        to: "daniel@heliumcrm.io",
        sentAt: minutesAgo(360),
        body: "Shared the integration limits doc. Reaching out next week.",
        raw: { source: "smtp", direction: "outbound" },
      },
    ],
  },
  {
    id: "thr-1007",
    sender: "Lucia Perez",
    senderContact: "lucia@vistaops.net",
    subject: "Migrating from Zendesk",
    snippet: "Do you support historical thread import via API?",
    unreadCount: 4,
    replyCount: 1,
    assignedTo: null,
    status: "open",
    lastActivityAt: minutesAgo(5),
    messages: [
      {
        id: "msg-1007-1",
        from: "lucia@vistaops.net",
        to: "sales@company.com",
        sentAt: minutesAgo(5),
        body: "We are moving from Zendesk and need migration guidance.",
        raw: { source: "gmail", direction: "inbound" },
      },
    ],
  },
  {
    id: "thr-1008",
    sender: "Vikram Iyer",
    senderContact: "vikram@pulsegrid.dev",
    subject: "Pilot extension request",
    snippet: "Can we extend pilot by 14 days for procurement sign-off?",
    unreadCount: 1,
    replyCount: 9,
    assignedTo: "u-lead-1",
    status: "pending",
    lastActivityAt: minutesAgo(28),
    messages: [
      {
        id: "msg-1008-1",
        from: "vikram@pulsegrid.dev",
        to: "sales@company.com",
        sentAt: minutesAgo(80),
        body: "Need a little extra time due to internal procurement cycle.",
        raw: { source: "gmail", direction: "inbound" },
      },
      {
        id: "msg-1008-2",
        from: "sales@company.com",
        to: "vikram@pulsegrid.dev",
        sentAt: minutesAgo(50),
        body: "We can extend by two weeks if needed.",
        raw: { source: "smtp", direction: "outbound" },
      },
      {
        id: "msg-1008-3",
        from: "vikram@pulsegrid.dev",
        to: "sales@company.com",
        sentAt: minutesAgo(28),
        body: "Perfect, thanks for the flexibility.",
        raw: { source: "gmail", direction: "inbound" },
      },
    ],
  },
];

export function filterConversations(
  allConversations: MockConversation[],
  search: string,
  filter: ConversationFilter
): MockConversation[] {
  const searchTerm = search.trim().toLowerCase();

  return allConversations
    .filter((conversation) => {
      if (!searchTerm) return true;
      return (
        conversation.sender.toLowerCase().includes(searchTerm) ||
        conversation.senderContact.toLowerCase().includes(searchTerm) ||
        conversation.subject.toLowerCase().includes(searchTerm) ||
        conversation.snippet.toLowerCase().includes(searchTerm)
      );
    })
    .filter((conversation) => {
      if (filter === "all") return true;
      if (filter === "assigned") return Boolean(conversation.assignedTo);
      if (filter === "unassigned") return !conversation.assignedTo;
      if (filter === "later") return conversation.status === "snoozed";
      if (filter === "done") return conversation.status === "closed";
      if (filter === "subscribed") return conversation.id === "thr-1001" || conversation.id === "thr-1004"; // Mock logic
      if (filter === "test") return conversation.id === "thr-1007"; // Mock logic
      if (filter === "sent") return conversation.messages.some(m => m.from.includes("company.com"));
      if (filter === "trash") return conversation.status === "trashed";
      if (filter === "spam" || filter === "drafts") return false; // Mock empty
      
      // Fallback to direct status match
      return conversation.status === filter;
    })
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}
