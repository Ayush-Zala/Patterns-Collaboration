# Live Collaboration Workspace

A high-performance, real-time shared inbox solution built for teams. Manage multiple communication channels, collaborate on threads, and automate workflows from a single, unified interface.

## 🏗️ System Architecture

### Overview
The system follows a modern decoupled architecture with a **Next.js Frontend** acting as a secure gateway (Proxy) to a **Node.js/Express Backend** which handles heavy messaging logic and database persistence.

```mermaid
graph TD
    subgraph "Client Tier"
        UI[Next.js App]
        WS_C[Socket.io Client]
    end

    subgraph "Application Gateway (Frontend Proxy)"
        BA[Better Auth]
        PRX[Identity Proxy Middleware]
    end

    subgraph "Core Backend Services"
        API[Express API]
        TS[Thread Service]
        MS[Mail Service]
        WS_S[Socket.io Server]
        DL[Draft Lock Manager]
    end

    subgraph "Data & External"
        DB[(PostgreSQL / Prisma)]
        GMAIL[Gmail / Google OAuth]
    end

    UI --> BA
    UI --> PRX
    PRX -- "Auth Headers (X-Org-ID)" --> API
    API --> TS
    TS --> DL
    TS --> MS
    MS --> GMAIL
    TS --> DB
    WS_S <--> WS_C
    API -.-> WS_S
```

## 🔄 Core Data Flows

### 1. Inbound Messaging (Webhooks)
When a new email arrives in a connected Gmail account:
1. **Google Pub/Sub** notifies our backend.
2. **MailService** fetches the full message and attachments.
3. **ThreadService** resolves or creates a `Thread` and saves the `Message`.
4. **WebSocket Server** emits a `new_message` event to all subscribed team members.
5. **Frontend UI** updates instantly without a page refresh.

### 2. Outbound Messaging (The "Reply" Flow)
1. **User** types a reply in the UI and hits Send.
2. **Frontend Proxy** attaches the user's `Identity` and `Organization ID` headers.
3. **Backend** verifies `Delegation` permissions (does this user have access to this inbox?).
4. **DraftLockManager** ensures no two agents are drafting/sending simultaneously.
5. **MailService** sends the email via the provider's API.
6. **DatabaseStore** persists the outbound message and updates the thread's "Last Activity".

### 3. Analytics Event Engine
1. **Action Occurs:** Thread is created, assigned, replied to, or closed.
2. **Event Dispatch:** A lightweight `AnalyticsEventBus` publishes the event asynchronously.
3. **Aggregation:** `AnalyticsAggregator` catches the event and processes the deltas (e.g., calculates response times, increments workload counters).
4. **Persistence:** The `AnalyticsStore` instantly updates its fast in-memory map (write-through cache) and asynchronously upserts a JSON snapshot to the `analyticsmetric` table in the database to survive server restarts.
5. **Real-time Broadcast:** Socket.IO pushes the updated snapshot directly to the frontend Analytics dashboard.

### 4. Role-Based Access Control (RBAC)
*   **Admins**: Full visibility across all company inboxes and teammate management.
*   **Members**: Restricted to "Individual" scope. They only see inboxes specifically **delegated** to them by an Admin.
*   **Delegations**: A granular permission system mapping Users -> Inboxes.

### 5. Hybrid Email Delivery Architecture
The system employs a dual-delivery model to ensure both true inbox sync and high deliverability:
*   **Core Inbox & Sequences (Google API)**: Outbound replies to threads and sequence stages are routed directly through the user's connected Google Workspace OAuth channel. This ensures emails appear in the user's actual Gmail "Sent" folder, preserving a true 1:1 bidirectional sync.
*   **Transactional Emails (Resend)**: System-level emails (such as "Invite Teammates" and password resets) are dispatched via the **Resend SDK**. This completely decouples core app notifications from the user's personal inbox while guaranteeing high deliverability.

## 🛠️ Technology Stack

*   **Frontend**: Next.js 15 (App Router), Tailwind CSS, Lucide Icons, Shadcn UI.
*   **Backend**: Node.js, Express, Socket.io.
*   **Database**: PostgreSQL (pgvector enabled) with Prisma ORM.
*   **Authentication**: Better Auth with Prisma Adapter.
*   **External Integrations**: Google OAuth 2.0, Gmail API.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (for running the PostgreSQL database with `pgvector` extensions)

### Database Setup
Spin up the PostgreSQL container locally using Docker:
```bash
docker run --name shared-inbox-postgres -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d pgvector/pgvector:pg16
```

Configure your `.env` and `frontend/.env.local` files to point to `postgresql://postgres:postgres@127.0.0.1:5433/postgres?schema=public` (see `.env.example`).

### Installation
```bash
# Install dependencies for both projects
npm install
cd frontend && npm install
cd ..

# Initialize Database and Seed Data
npx prisma db push
npm run db:seed
```

### Default Admin Credentials
When you run the seed script (`npm run db:seed`), it will automatically create a mock admin account for you to access the dashboard:
- **Email:** `admin@company.com`
- **Password:** `password123`

### Running Locally
```bash
# Start the Backend (Port 4000)
npm run start

# In a new terminal, Start the Frontend (Port 3000)
cd frontend
npm run dev
```

---
*Created by Achal Trivedi*
