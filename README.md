# PartPulse Orders — Frontend v2

A modern React 18 + TypeScript SPA for the PartPulse industrial procurement system.
Built by Perplexity Computer — replaces the original vanilla JS frontend.

## Stack
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (dark industrial theme)
- TanStack Query (data fetching)
- Wouter (hash-based routing)
- Recharts (analytics charts)
- Lucide React (icons)

## Features by Role
- **Requester** — Create orders with intelligent autocomplete, track status
- **Procurement** — Work queue, claim/release orders, quote wizard with AI supplier suggestions, PO lifecycle
- **Manager** — Approval card queue, spend analytics, activity feed
- **Admin** — Full system: users, buildings, cost centers, all above

## Quick Start

```bash
npm install
npm run dev        # dev server on :5000
npm run build      # production build → dist/
```

## Connect to Backend

The frontend connects to the existing PartPulse MySQL backend.
Edit `client/src/lib/api.ts` to set `API_BASE` to your backend URL:

```ts
const API_BASE = 'https://your-server.com/api';
```

Or deploy both together — the Express server in `server/` serves the built frontend
from `dist/public` and proxies all `/api/*` calls to the existing backend.

## Deployment on Ubuntu Server

```bash
git clone -b frontend-v2 https://github.com/SKuytov/ORD_PROTOTYPE.git partpulse-frontend
cd partpulse-frontend
npm install
npm run build

# To serve: copy dist/public to your nginx/apache root
# OR run with the built-in Express server:
NODE_ENV=production node dist/index.cjs
```

## Environment Variables (server mode)
```
PORT=5000
NODE_ENV=production
```

## Pages
| Route | Page | Access |
|-------|------|--------|
| `/` | Role-based Dashboard | All |
| `/orders` | Orders List + Detail | All |
| `/new-order` | Create Order Form | Requester |
| `/procurement` | Procurement Workspace | Procurement/Admin |
| `/quotes` | Quote Management | Procurement/Admin |
| `/approvals` | Approval Queue | Manager/Admin |
| `/suppliers` | Supplier Directory | Procurement/Admin |
| `/analytics` | Charts & KPIs | Manager/Admin |
| `/admin` | System Admin | Admin only |
