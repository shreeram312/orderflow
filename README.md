# OrderFlow

## Event-Driven Restaurant Order Processing System

OrderFlow is a backend-focused restaurant ordering application built to learn **asynchronous communication, event-driven architecture, message queues, independent workers, and eventual consistency**.

It has two interfaces backed by one API:

1. **Customer Dashboard** — sign in, top up a wallet, browse the menu, place orders, track status, cancel.
2. **Kitchen Dashboard** — sign in as staff, manage the menu, open and close the restaurant, watch the live order queue, mark orders ready and collected.

The goal is not to build a complete food-delivery platform. The goal is to demonstrate how multiple backend services coordinate asynchronously through RabbitMQ, and what it takes to keep that correct when things fail.

---

# 1. Project Goals

Demonstrate:

- Synchronous HTTP communication between frontend and API.
- Asynchronous communication between backend services.
- RabbitMQ producers and consumers.
- Independent background workers.
- Event-driven architecture.
- Eventual consistency.
- Database transactions.
- Message acknowledgement.
- Retry handling.
- Idempotent event processing.
- Compensating transactions (refunds).
- Failure handling.
- Structured logging and basic monitoring.
- Authentication and role-based access.
- A clean backend architecture.
- Two user experiences on one backend.

## The one-paragraph explanation

> The Order API authenticates the customer, prices the order, debits their wallet inside a single database transaction, saves the order as `PENDING`, and returns immediately after publishing an `OrderCreated` event. It deliberately does **not** decide whether the restaurant can fulfill the order. The Order Worker consumes that event and validates against live state — is the restaurant open, are all the items still active — publishing `OrderConfirmed` or `OrderRejected`. The Kitchen Worker consumes `OrderConfirmed` and moves the order through `PREPARING` to `READY`. When an order is rejected or cancelled, the Payment Worker consumes that event and refunds the wallet — a compensating transaction, because the debit already committed in a different service's transaction.

---

# 2. Main Application Flow

```text
Customer Dashboard
        |
        | POST /orders   (authenticated)
        v
   Order API
        |
        |  ── single DB transaction ──
        |     check wallet balance
        |     debit wallet + write ledger row
        |     insert order (PENDING) + items
        |  ─────────────────────────
        |
        | publish OrderCreated
        v
    RabbitMQ
        |
        v
  Order Worker                 validates against LIVE state:
        |                        - is the restaurant open?
        |                        - are all items still ACTIVE?
        |
        +── accepted ──> status CONFIRMED
        |                publish OrderConfirmed
        |                        |
        |                        v
        |                  Kitchen Worker
        |                        |
        |               status PREPARING
        |               ... simulated cooking ...
        |               status READY
        |                        |
        |               kitchen marks COMPLETED
        |
        +── rejected ──> status REJECTED (with a reason)
                         publish OrderRejected
                                 |
                                 v
                          Payment Worker
                                 |
                          refund the wallet
        v
   PostgreSQL
        |
        +--------------------------+
        |                          |
        v                          v
Customer Dashboard         Kitchen Dashboard
```

Both dashboards poll the API. WebSockets are a later improvement, not a requirement.

## Why the API does not check availability

This is the central design decision, so it is worth stating plainly.

The API's job is to **authenticate, price, take payment, and record intent**. Deciding whether the restaurant can actually make the food belongs to the restaurant, and it happens asynchronously.

That split is what makes the rejection path real rather than contrived. The menu the customer is looking at is a **stale snapshot** — fetched seconds or minutes ago. The kitchen pauses Pizza at 12:04:10; the customer's browser still shows it and they order at 12:04:09. If the API validated availability, the check would happen microseconds after the read and would essentially never fail. Moving it into a worker puts a real time gap there, which is exactly the condition the rejection path exists to handle.

---

# 3. Users and Roles

One `User` table, two roles.

| Role       | Can do                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| `CUSTOMER` | Top up wallet, browse menu, place orders, view own orders, cancel own orders   |
| `KITCHEN`  | Manage menu items, open/close the restaurant, view all orders, accept/reject, mark ready and collected |

A customer can only ever see their own orders. Kitchen staff see every order but have no wallet and place no orders.

---

# 4. User Interfaces

## 4.1 Customer Dashboard

Screens:

- Sign up / sign in
- Wallet (balance, top up, transaction history)
- Menu and cart
- Order confirmation
- Order detail with status timeline
- Order history

### Example customer screen

```text
OrderFlow                         Wallet: Rs 1,200   [Top up]

Menu                                          OPEN

Burger       Rs 150    [-] 2 [+]
Pizza        Rs 250    [-] 1 [+]

Total: Rs 550

[Place Order]
```

### Order status timeline

```text
Order Placed        12:04   done
Confirmed           12:04   done
Preparing           12:05   done
Ready               12:11   done
Collected           12:14   done

[Cancel Order]   — shown only while PENDING or CONFIRMED
```

Rejected orders show the reason and the refund:

```text
Order #102        REJECTED
Pizza is currently unavailable
Rs 250 refunded to your wallet
```

## 4.2 Kitchen Dashboard

Two tabs plus an open/closed switch.

**Orders** — the live queue:

```text
Kitchen Dashboard              Restaurant: [OPEN]      Orders | Menu

Order #101   Shreeram            placed 2m ago
- Burger x2
- Pizza  x1
Total Rs 550                     Status: PREPARING

[Mark Ready]   [Reject]
```

**Menu** — catalogue management:

```text
Menu Items                                     [+ Add Item]

Burger    Rs 150    ACTIVE     [Edit]  [Pause]
Pizza     Rs 250    ACTIVE     [Edit]  [Pause]
Pasta     Rs 200    PAUSED     [Edit]  [Resume]
```

Pausing an item is how "we ran out" is expressed. There is no stock count to maintain.

---

# 5. Recommended Tech Stack

## Backend

| Technology         | Purpose                       |
| ------------------ | ----------------------------- |
| Node.js            | Runtime                       |
| TypeScript         | Type-safe backend development |
| Fastify            | HTTP API                      |
| PostgreSQL         | Persistent database           |
| Prisma             | ORM and migrations            |
| RabbitMQ           | Message broker                |
| amqplib            | RabbitMQ client               |
| argon2             | Password hashing              |
| jsonwebtoken       | Session tokens                |
| Zod                | Request and event validation  |
| Pino               | Structured logging            |
| dotenv or env-var  | Environment configuration     |
| Vitest             | Unit and integration tests    |
| Docker Compose     | Local infrastructure          |

## Frontend

| Technology            | Purpose                  |
| --------------------- | ------------------------ |
| React                 | UI                       |
| TypeScript            | Type-safe frontend       |
| Vite                  | Build tool               |
| React Router          | Customer/Kitchen routes  |
| TanStack Query        | API fetching and polling |
| Tailwind CSS          | Styling                  |
| React Hook Form       | Auth and menu forms      |

## Infrastructure

| Technology             | Purpose                      |
| ---------------------- | ---------------------------- |
| Docker Compose         | PostgreSQL and RabbitMQ      |
| RabbitMQ Management UI | Inspect queues and messages  |
| GitHub Actions         | Optional CI                  |

---

# 6. Monorepo: pnpm workspaces, not Turborepo

Use **pnpm workspaces**. Do not add Turborepo yet.

Turborepo pays for itself through task caching and orchestrated build pipelines. Here, builds are `tsc` over a few hundred files and development runs on `tsx watch`, which never touches the build pipeline at all. The one real benefit — a single command that runs everything — costs one line:

```json
"dev": "concurrently -n api,ord,kit,web -c blue,green,yellow,magenta \"pnpm -F api dev\" \"pnpm -F order-worker dev\" \"pnpm -F kitchen-worker dev\" \"pnpm -F web dev\""
```

The folder layout is identical with or without Turborepo, so adding it later is dropping in a `turbo.json` and swapping the root scripts. The decision is fully reversible, which is exactly why it should not be paid for up front.

**Why a monorepo at all:** shared event contracts, shared TypeScript config, one `docker compose up`, and API plus workers versioned together. Separate repositories would mean duplicated config and event types that silently drift apart.

---

# 7. Project Structure

```text
orderflow/
│
├── apps/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.schemas.ts
│   │   │   │   ├── wallet/
│   │   │   │   │   ├── wallet.routes.ts
│   │   │   │   │   ├── wallet.service.ts
│   │   │   │   │   └── wallet.repository.ts
│   │   │   │   ├── menu/
│   │   │   │   │   ├── menu.routes.ts
│   │   │   │   │   ├── menu.controller.ts
│   │   │   │   │   ├── menu.service.ts
│   │   │   │   │   ├── menu.repository.ts
│   │   │   │   │   └── menu.schemas.ts
│   │   │   │   ├── orders/
│   │   │   │   │   ├── order.routes.ts
│   │   │   │   │   ├── order.controller.ts
│   │   │   │   │   ├── order.service.ts
│   │   │   │   │   ├── order.repository.ts
│   │   │   │   │   └── order.schemas.ts
│   │   │   │   └── kitchen/
│   │   │   │       ├── kitchen.routes.ts
│   │   │   │       └── kitchen.service.ts
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.ts
│   │   │   │   └── requireRole.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── database.ts
│   │   │   │   ├── rabbitmq.ts
│   │   │   │   └── logger.ts
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── order-worker/                    # accepts or rejects incoming orders
│   │   ├── src/
│   │   │   ├── consumers/order-created.consumer.ts
│   │   │   ├── services/acceptance.service.ts
│   │   │   ├── infrastructure/
│   │   │   └── worker.ts
│   │   └── package.json
│   │
│   ├── kitchen-worker/                  # prepares confirmed orders
│   │   ├── src/
│   │   │   ├── consumers/order-confirmed.consumer.ts
│   │   │   ├── services/kitchen.service.ts
│   │   │   ├── infrastructure/
│   │   │   └── worker.ts
│   │   └── package.json
│   │
│   ├── payment-worker/                  # refunds rejected and cancelled orders (Phase 9)
│   │   ├── src/
│   │   │   ├── consumers/refund.consumer.ts
│   │   │   ├── services/refund.service.ts
│   │   │   ├── infrastructure/
│   │   │   └── worker.ts
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   └── SignupPage.tsx
│       │   │   ├── customer/
│       │   │   │   ├── MenuPage.tsx
│       │   │   │   ├── WalletPage.tsx
│       │   │   │   ├── OrderDetailPage.tsx
│       │   │   │   └── OrderHistoryPage.tsx
│       │   │   └── kitchen/
│       │   │       ├── KitchenOrdersPage.tsx
│       │   │       └── KitchenMenuPage.tsx
│       │   ├── components/
│       │   ├── api/
│       │   ├── auth/AuthContext.tsx
│       │   ├── router/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/
│       └── src/
│           ├── events/
│           │   ├── base.ts
│           │   ├── order-created.ts
│           │   ├── order-confirmed.ts
│           │   ├── order-rejected.ts
│           │   └── order-cancelled.ts
│           ├── constants/
│           ├── schemas/
│           └── index.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── README.md
```

Two structural rules that are easy to get wrong:

- **One Prisma schema at the repository root.** All backend apps import the same generated client. One schema per app would mean several sets of migrations racing on one database.
- **`packages/shared` is the contract.** If a worker's `OrderCreated` type comes from anywhere else, producer and consumer will drift silently and the main benefit of the monorepo is gone.

---

# 8. Backend Services

## 8.1 Order API

- Authentication and session issuing.
- Role-based route protection.
- Wallet top-ups and balance reads.
- Menu reads (customer) and menu management (kitchen).
- Order creation: validate the request, price it, debit the wallet, persist, publish.
- Order cancellation.
- Serving order state to both dashboards.

It does **not** decide whether an order can be fulfilled.

## 8.2 Order Worker

Consumes `OrderCreated` and decides acceptance against **live** state:

- Is the restaurant open?
- Is every item still `ACTIVE`?

Accepted: status `CONFIRMED`, publishes `OrderConfirmed`.
Rejected: status `REJECTED` with a readable reason, publishes `OrderRejected`.

## 8.3 Kitchen Worker

- Consumes `OrderConfirmed`.
- Sets status `PREPARING`.
- Simulates preparation for `KITCHEN_PREP_TIME_MS`.
- Sets status `READY`.

## 8.4 Payment Worker (Phase 9)

- Consumes `OrderRejected` and `OrderCancelled`.
- Refunds the wallet and writes a `REFUND` ledger row.
- Idempotent: a redelivered event must not refund twice.

---

# 9. Authentication

## Approach

- Email and password.
- Passwords hashed with **argon2**. Never stored or logged in plaintext.
- Session as a **JWT in an `httpOnly` cookie**, not `localStorage` — a token in `localStorage` is readable by any XSS on the page.
- `GET /auth/me` returns the current user so the frontend can restore a session on reload.

## Two roles, one table

Signup defaults to `CUSTOMER`. Kitchen accounts are created through a separate endpoint gated by a shared code from the environment:

```text
POST /auth/signup/kitchen   { email, password, name, code }
```

If `code !== process.env.KITCHEN_SIGNUP_CODE`, reject with `403`.

**This gate matters.** With open kitchen signup, anyone can register as staff and read every customer's orders. A shared code is not real access control, but it is honest about what it is, and it keeps the demo safe. Proper invite flows are a later improvement.

## Route protection

```text
authenticate              verify the cookie, attach the user to the request
requireRole('KITCHEN')    guard all /kitchen/* routes
```

Ownership is checked separately from role: `GET /orders/:id` must confirm the order belongs to the requesting customer, otherwise any signed-in user could read any order by guessing an id.

---

# 10. Wallet

Customers can only order what their wallet can pay for. Top-ups are simulated — there is no payment gateway, and the README should say so plainly.

## Store a ledger, not just a number

The `Wallet` row holds the running balance for fast reads, but every movement also writes a `WalletTransaction`. This gives an audit trail, a transaction history screen, and — most importantly — **idempotent refunds**.

```text
@@unique([orderId, type])
```

That constraint is the safety net. RabbitMQ will redeliver an `OrderRejected` event if the worker crashes after refunding but before acknowledging. Without the constraint, the refund runs twice and the customer is handed free money. With it, the second insert violates the constraint, the worker catches it, acknowledges, and moves on.

## Debit synchronously, refund asynchronously

| Operation | Timing | Why |
| --------- | ------ | --- |
| **Debit** | Synchronous, inside the order-creation transaction | The customer must get `Insufficient balance` as an immediate `400`, not discover it seconds later through polling |
| **Refund** | Asynchronous, via event consumer | Nothing is blocked on it, and it must survive worker restarts |

This asymmetry is how real payment systems behave: authorise synchronously, refund out of band.

## Preventing overdraft under concurrency

Two orders placed at the same moment must not both pass a balance check. Do not read-then-write. Use a conditional update:

```sql
UPDATE wallets
SET balance = balance - $1
WHERE user_id = $2 AND balance >= $1
```

Zero rows affected means insufficient funds — roll back the transaction and return `400`.

---

# 11. Menu

Kitchen staff add items directly. There is **no stock count and no inventory tracking**. An item is either being served or it is not.

## Item status

```prisma
enum MenuItemStatus {
  ACTIVE      // being served
  PAUSED      // not available right now: sold out, equipment down
  ARCHIVED    // removed from the menu; historical orders still reference it
}
```

Ran out of pizza? Pause it. Got more? Resume it. That is the whole model.

`ARCHIVED` replaces hard deletion. Deleting a menu item would break the foreign key on historical order items and silently rewrite past orders.

## Restaurant open/closed

A single-row settings table the kitchen toggles:

```prisma
model RestaurantSettings {
  id        String   @id @default("singleton")
  isOpen    Boolean  @default(true)
  updatedAt DateTime @updatedAt
}
```

Closing the restaurant does not block the API. Orders are still accepted, taken to `PENDING`, and then rejected and refunded by the Order Worker — the same path as a paused item. One mechanism, two causes.

## Why there is no stock count

The obvious alternative is an `availableQuantity` per item, reserved by an inventory service. It was considered and rejected.

A restaurant does not hold a fixed number of finished dishes; it cooks to order. A counter would have to be decremented by hand after every order and topped up constantly, and it models something that does not exist. A `PAUSED` status expresses the same intent — "we cannot make this right now" — with no bookkeeping.

What the project keeps is the **asynchronous acceptance decision**, which is where the architectural value was all along. See section 2.

---

# 12. Order Lifecycle

```text
        PENDING
           |
           v
       CONFIRMED
           |
           v
       PREPARING
           |
           v
         READY
           |
           v
       COMPLETED
```

Terminal branches: `CANCELLED` and `REJECTED`.

| Status      | Meaning                                            | Set by                        |
| ----------- | -------------------------------------------------- | ----------------------------- |
| `PENDING`   | Created and paid, awaiting the restaurant's decision | Order API                     |
| `CONFIRMED` | Restaurant accepted the order                       | Order Worker                  |
| `PREPARING` | Kitchen started cooking                             | Kitchen Worker                |
| `READY`     | Waiting for pickup                                  | Kitchen Worker                |
| `COMPLETED` | Customer collected the order                        | Kitchen staff                 |
| `CANCELLED` | Cancelled by the customer, wallet refunded          | Order API / Payment Worker    |
| `REJECTED`  | Restaurant cannot fulfill it, wallet refunded       | Order Worker / Kitchen staff  |

`REJECTED` carries a `failureReason` string so the customer UI can explain what happened instead of showing a bare status: `Pizza is currently unavailable`, `Restaurant is closed`, `Kitchen is at capacity`.

Rejection has two sources, and both end in the same place:

- **Automatic** — the Order Worker finds the restaurant closed or an item paused.
- **Manual** — kitchen staff press `[Reject]` on an order, at any point before `PREPARING`.

## Cancellation rules

| Status at cancel | Allowed | Refund |
| ---------------- | ------- | ------ |
| `PENDING`        | yes     | yes    |
| `CONFIRMED`      | yes     | yes    |
| `PREPARING`      | no      | —      |
| `READY`          | no      | —      |
| `COMPLETED`      | no      | —      |

The cutoff at `PREPARING` has a real justification rather than an arbitrary one: once food is being cooked, cancelling means waste, so the business absorbs the cost.

## The cancellation race

Cancelling a `PENDING` order races the Order Worker, which may be confirming that exact order at the same instant. Never read the status and then write it. Use a conditional update:

```sql
UPDATE orders SET status = 'CANCELLED'
WHERE id = $1 AND status IN ('PENDING', 'CONFIRMED')
```

Zero rows affected means the worker won the race — return `409 Conflict` and tell the customer the order has already moved on. This race is worth hitting deliberately rather than discovering later as a bug.

---

# 13. Database Design

## Tables

| Table                  | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `users`                | Customers and kitchen staff, with role           |
| `wallets`              | Running balance per customer                     |
| `wallet_transactions`  | Immutable ledger of top-ups, debits, refunds     |
| `menu_items`           | Catalogue: name, price, status                    |
| `restaurant_settings`  | Single row: open or closed                       |
| `orders`               | Order header, owner, status, total               |
| `order_items`          | Line items with a price snapshot                 |
| `processed_events`     | Consumed `eventId`s, for idempotency             |
| `outbox_events`        | Pending events to publish (Phase 10)             |

## Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CUSTOMER
  KITCHEN
}

enum MenuItemStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  COMPLETED
  CANCELLED
  REJECTED
}

enum TxType {
  TOPUP
  DEBIT
  REFUND
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(CUSTOMER)
  wallet       Wallet?
  orders       Order[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Wallet {
  id           String              @id @default(uuid())
  userId       String              @unique
  balance      Decimal             @default(0) @db.Decimal(10, 2)
  user         User                @relation(fields: [userId], references: [id])
  transactions WalletTransaction[]
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}

model WalletTransaction {
  id           String   @id @default(uuid())
  walletId     String
  orderId      String?
  type         TxType
  amount       Decimal  @db.Decimal(10, 2)
  balanceAfter Decimal  @db.Decimal(10, 2)
  createdAt    DateTime @default(now())

  wallet Wallet @relation(fields: [walletId], references: [id])

  @@unique([orderId, type])   // idempotent debits and refunds
  @@index([walletId, createdAt])
}

model MenuItem {
  id         String         @id @default(uuid())
  name       String
  price      Decimal        @db.Decimal(10, 2)
  status     MenuItemStatus @default(ACTIVE)
  orderItems OrderItem[]
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@index([status])
}

model RestaurantSettings {
  id        String   @id @default("singleton")
  isOpen    Boolean  @default(true)
  updatedAt DateTime @updatedAt
}

model Order {
  id            String      @id @default(uuid())
  userId        String
  status        OrderStatus @default(PENDING)
  totalAmount   Decimal     @db.Decimal(10, 2)
  failureReason String?
  items         OrderItem[]
  user          User        @relation(fields: [userId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([userId, createdAt])
  @@index([status])
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  menuItemId  String
  productName String                        // snapshot
  quantity    Int
  unitPrice   Decimal @db.Decimal(10, 2)    // snapshot

  order    Order    @relation(fields: [orderId], references: [id])
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])

  @@index([orderId])
}

model ProcessedEvent {
  id          String   @id @default(uuid())
  eventId     String   @unique
  eventType   String
  consumer    String                        // which worker processed it
  processedAt DateTime @default(now())
}
```

## Why the snapshots

`OrderItem` stores `productName` and `unitPrice` rather than reading them through the relation. Change a price tomorrow and yesterday's orders keep their original totals. Without the snapshot, historical order totals silently rewrite themselves every time the kitchen edits the menu.

`WalletTransaction.balanceAfter` serves the same purpose for money: the transaction history stays readable and auditable without replaying every row.

## Money

Use `Decimal`, never `Float`. Floating point cannot represent `0.10` exactly, and rounding error in a balance is a real bug rather than a theoretical one.

---

# 14. API Design

## Auth

```http
POST   /auth/signup           { email, password, name }
POST   /auth/signup/kitchen   { email, password, name, code }
POST   /auth/login            { email, password }
POST   /auth/logout
GET    /auth/me
```

## Wallet (customer)

```http
GET    /wallet                     -> { balance }
POST   /wallet/topup               { amount }
GET    /wallet/transactions        -> paginated ledger
```

## Menu

```http
GET    /menu
```

Response — `ACTIVE` items only, plus whether the restaurant is taking orders:

```json
{
  "isOpen": true,
  "items": [
    { "id": "m-1", "name": "Burger", "price": 150 },
    { "id": "m-2", "name": "Pizza",  "price": 250 }
  ]
}
```

This response is a **snapshot**, and the customer's copy of it goes stale the moment the kitchen changes something. That staleness is not a bug to engineer away; it is the condition the rejection path exists to handle.

## Orders (customer)

```http
POST   /orders                     { items: [{ menuItemId, quantity }] }
GET    /orders                     # own orders only
GET    /orders/:orderId            # own order only
POST   /orders/:orderId/cancel
```

`POST /orders` response:

```json
{ "orderId": "101", "status": "PENDING", "totalAmount": 550 }
```

## Kitchen (role: KITCHEN)

```http
GET    /kitchen/menu                       # all items, including PAUSED and ARCHIVED
POST   /kitchen/menu                       { name, price }
PATCH  /kitchen/menu/:id                   { name?, price?, status? }

GET    /kitchen/settings                   -> { isOpen }
PATCH  /kitchen/settings                   { isOpen }

GET    /kitchen/orders                     # all orders, filterable by status
GET    /kitchen/orders/:orderId
PATCH  /kitchen/orders/:orderId/reject     { reason }
PATCH  /kitchen/orders/:orderId/ready
PATCH  /kitchen/orders/:orderId/collected
```

## Health

```http
GET    /health          # process is alive
GET    /health/ready    # database and RabbitMQ reachable
```

Worth building early. With four processes running, "why is my order stuck" has four possible answers, and that confusion arrives on day one.

## Error responses

Consistent shape, so the frontend has one thing to handle:

```json
{ "error": "INSUFFICIENT_BALANCE", "message": "Wallet balance is Rs 200, order total is Rs 550" }
```

| Code                    | HTTP | When                                          |
| ----------------------- | ---- | --------------------------------------------- |
| `UNAUTHENTICATED`       | 401  | Missing or invalid session                    |
| `FORBIDDEN`             | 403  | Wrong role, or not the order's owner          |
| `INSUFFICIENT_BALANCE`  | 400  | Wallet cannot cover the total                 |
| `ITEM_NOT_FOUND`        | 400  | A menu item id does not exist or is `ARCHIVED` |
| `ORDER_NOT_CANCELLABLE` | 409  | Order already moved past `CONFIRMED`          |

Note what is **not** in this list: there is no synchronous error for a paused item or a closed restaurant. Those produce an accepted order that is rejected asynchronously and refunded. `ARCHIVED` is the exception because an archived item cannot be priced at all.

---

# 15. RabbitMQ Design

## Exchange

One topic exchange, durable:

```text
orderflow.events    (type: topic, durable: true)
```

## Routing keys

```text
order.created
order.confirmed
order.rejected
order.cancelled
order.preparing
order.ready
```

## Queues and bindings

```text
orderflow.orders          <- order.created

orderflow.kitchen         <- order.confirmed

orderflow.payments        <- order.rejected      (refund)
                          <- order.cancelled     (refund)

orderflow.notifications   <- order.ready         (Phase 10)
                          <- order.rejected      (Phase 10)
```

`order.rejected` binding to **two** queues is the point of using a topic exchange rather than publishing straight to a queue. One event, two independent reactions — the Payment Worker returns the money, the Notification Worker tells the customer — and neither knows the other exists. A third consumer is added later by declaring one more binding, with no change to the producer.

## Event flow

```text
                    Order API
                        |
                  order.created
                        v
                 orderflow.events  (topic exchange)
                        |
                        v
                  orderflow.orders
                        |
                   Order Worker
                        |
          +-------------+-------------+
          |                           |
   order.confirmed              order.rejected
          v                           v
   orderflow.events             orderflow.events
          |                           |
          v                           v
   orderflow.kitchen            orderflow.payments
          |                           |
   Kitchen Worker               Payment Worker
   PREPARING -> READY           refund the wallet
```

## Durability checklist

- Exchange: `durable: true`
- Queues: `durable: true`
- Messages: `persistent: true`
- Consumers: `noAck: false` (manual acknowledgement)
- `prefetch(1)` on every consumer

Miss any one of these and messages vanish on a broker restart, which defeats the purpose of using a broker.

---

# 16. Event Contracts

Events live in `packages/shared` and are validated with Zod on both sides — publish and consume. A consumer that trusts the payload shape will fail confusingly the first time a producer changes.

## Base event

```ts
export interface BaseEvent<T extends string, P> {
  eventId: string;        // uuid — the idempotency key
  eventType: T;
  occurredAt: string;     // ISO timestamp
  correlationId: string;  // traces one request across all services
  orderId: string;
  payload: P;
}
```

`correlationId` is generated by the API on the incoming HTTP request and copied into every downstream event. Grep one id across four services and the whole lifecycle of a request appears in order.

## OrderCreated

```json
{
  "eventId": "6f1c…",
  "eventType": "OrderCreated",
  "occurredAt": "2026-09-12T12:04:11.000Z",
  "correlationId": "req-88af…",
  "orderId": "101",
  "payload": {
    "userId": "u-1",
    "totalAmount": 550,
    "items": [
      { "menuItemId": "m-1", "productName": "Burger", "quantity": 2 },
      { "menuItemId": "m-2", "productName": "Pizza",  "quantity": 1 }
    ]
  }
}
```

## OrderConfirmed

```json
{
  "eventType": "OrderConfirmed",
  "orderId": "101",
  "payload": { "confirmedAt": "2026-09-12T12:04:12.000Z" }
}
```

## OrderRejected

```json
{
  "eventType": "OrderRejected",
  "orderId": "101",
  "payload": {
    "userId": "u-1",
    "reason": "ITEM_UNAVAILABLE",
    "message": "Pizza is currently unavailable",
    "refundAmount": 550
  }
}
```

`reason` is one of `ITEM_UNAVAILABLE`, `RESTAURANT_CLOSED`, `REJECTED_BY_KITCHEN`.

## OrderCancelled

```json
{
  "eventType": "OrderCancelled",
  "orderId": "101",
  "payload": {
    "userId": "u-1",
    "cancelledAtStatus": "CONFIRMED",
    "refundAmount": 550
  }
}
```

Both refund events carry `userId` and `refundAmount` directly. The Payment Worker never queries the orders table to find out how much to return. **Events carry what consumers need; consumers do not reach into each other's data.**

---

# 17. Order Creation Flow

```text
1.  Authenticate the request
2.  Validate the body with Zod
3.  Load the requested menu items
4.  Reject if any id is missing or ARCHIVED    -> 400 ITEM_NOT_FOUND
5.  Calculate the total from current prices
6.  BEGIN TRANSACTION
7.    UPDATE wallets SET balance = balance - total
        WHERE user_id = ? AND balance >= total
8.    if rowCount = 0 -> ROLLBACK, 400 INSUFFICIENT_BALANCE
9.    INSERT wallet_transaction (DEBIT, orderId, amount, balanceAfter)
10.   INSERT order (PENDING)
11.   INSERT order_items with price snapshots
12. COMMIT
13. Publish OrderCreated
14. Return { orderId, status: PENDING, totalAmount }
```

Note what step 4 does **not** check: whether the item is `PAUSED`, and whether the restaurant is open. Those are the Order Worker's decision, made asynchronously against live state.

Steps 7 to 12 must be one transaction. A debit that commits without an order, or an order that commits without a debit, is free food in one direction and theft in the other.

Step 13 sits outside the transaction, which creates a real gap: the commit can succeed and the publish can fail, leaving an order that no worker will ever pick up. That is exactly the problem the **Outbox Pattern** in Phase 10 solves. Until then, the gap is known and accepted — a stuck `PENDING` order is recoverable by hand.

---

# 18. Acceptance, Rejection and Refund

## Acceptance (Order Worker)

```text
1. Consume OrderCreated
2. Skip if eventId is already in processed_events
3. Load restaurant settings and the current status of every ordered item
4. BEGIN TRANSACTION
5.   if not isOpen:
        UPDATE orders SET status='REJECTED', failureReason='Restaurant is closed'
          WHERE id = ? AND status = 'PENDING'
6.   else if any item is not ACTIVE:
        UPDATE orders SET status='REJECTED', failureReason='<name> is currently unavailable'
          WHERE id = ? AND status = 'PENDING'
7.   else:
        UPDATE orders SET status='CONFIRMED'
          WHERE id = ? AND status = 'PENDING'
8.   if rowCount = 0 -> the customer cancelled first; ACK and stop
9.   INSERT processed_event
10. COMMIT
11. Publish OrderConfirmed or OrderRejected
12. ACK
```

Step 8 is the cancellation race from section 12, seen from the worker's side. The `WHERE status = 'PENDING'` guard is what makes both sides safe without a lock.

## Manual rejection (kitchen staff)

`PATCH /kitchen/orders/:id/reject` does the same thing on demand, allowed while the order is `PENDING` or `CONFIRMED`. Same status, same event, same refund path — the only difference is the reason.

## Refund: synchronous version (Phase 4)

```text
1.  Authenticate; confirm the order belongs to this user
2.  BEGIN TRANSACTION
3.    UPDATE orders SET status = 'CANCELLED'
        WHERE id = ? AND status IN ('PENDING', 'CONFIRMED')
4.    if rowCount = 0 -> ROLLBACK, 409 ORDER_NOT_CANCELLABLE
5.    credit the wallet, INSERT wallet_transaction (REFUND)
6.  COMMIT
7.  Return the cancelled order
```

## Refund: asynchronous version (Phase 9)

```text
1.  Authenticate; confirm ownership
2.  Conditionally UPDATE status to CANCELLED (same guard as above)
3.  Publish OrderCancelled
4.  Return immediately

    orderflow.payments -> refund the wallet, INSERT REFUND transaction
```

Build the synchronous version first, then move it onto events. Having both in the git history makes the comparison concrete: what asynchrony bought (the API returns instantly, the refund retries on its own, the Payment Worker can be down without blocking the customer) and what it cost (the refund is no longer instant, and the redelivery problem becomes real).

---

# 19. Consumer Reliability

A consumer must not acknowledge a message before processing has actually succeeded.

```text
Receive message
      |
      v
Validate event (Zod)
      |
      v
Check eventId in processed_events
      |
      +── already processed ──> ACK, skip
      |
      v
Process inside a DB transaction
      |
      +── success ──> record eventId, COMMIT, ACK
      |
      +── failure ──> ROLLBACK, NACK (retry or dead-letter)
```

## Basic consumer

```ts
await channel.prefetch(1);

channel.consume(queueName, async (message) => {
  if (!message) return;

  const log = logger.child({ consumer: queueName });

  try {
    const event = OrderCreatedSchema.parse(JSON.parse(message.content.toString()));

    await processEvent(event);

    channel.ack(message);
  } catch (error) {
    log.error({ err: error }, 'event processing failed');
    channel.nack(message, false, true);   // requeue — Phase 10 replaces this
  }
}, { noAck: false });
```

`nack(..., requeue = true)` is fine for the first version and wrong for the last one: a malformed message will requeue forever and spin the worker at full CPU. Phase 10 replaces it with a retry queue and a dead-letter queue that can tell a transient failure from a poison message.

---

# 20. Idempotency

RabbitMQ guarantees at-least-once delivery, not exactly-once. A message will be redelivered whenever a worker crashes between finishing its work and acknowledging:

```text
Message received
Processing succeeds and commits
Worker crashes before ACK
Broker redelivers the same message
```

Two defences, used together.

## 1. The `processed_events` table

```text
1. Check whether eventId already exists
2. If it does, ACK and skip
3. Otherwise process the event
4. Insert eventId in the SAME transaction as the work
5. ACK
```

Step 4 matters: recording the event in a separate transaction from the work reintroduces the gap it was meant to close.

## 2. Natural idempotency at the data layer

The `@@unique([orderId, type])` constraint on `wallet_transactions` means a duplicate refund cannot be written even if the check above is bypassed. Catch the unique-violation error, treat it as success, acknowledge.

The conditional `WHERE status = 'PENDING'` on every status update gives the same property for free: replaying `OrderConfirmed` on an order that is already `CONFIRMED` affects zero rows and changes nothing.

## Why this matters most for money

Double-setting a status is harmless. Double-refunding a wallet hands out real money, and it is the most convincing demonstration in the project: send the same `OrderRejected` event twice and show the balance moving only once.

---

# 21. Failure Scenarios to Demonstrate

## Scenario 1: Order Worker is down

```text
1. Stop the Order Worker
2. Place an order
3. Order is saved as PENDING, wallet already debited
4. OrderCreated waits in orderflow.orders (visible in the management UI)
5. Start the Order Worker
6. The queued message is consumed and the order continues automatically
```

Shows durable queues and a system that absorbs downtime instead of losing work.

## Scenario 2: Stale menu — the item was paused

```text
1. Customer loads the menu with Pizza available
2. Kitchen pauses Pizza
3. Customer orders Pizza from the page they already had open
4. API accepts, debits the wallet, returns PENDING
5. Order Worker sees PAUSED, sets REJECTED
6. Payment Worker refunds; the balance returns
7. Customer UI shows "Pizza is currently unavailable"
```

The core demonstration of the project. The customer's view of the world was a few seconds out of date, the system detected it asynchronously, and the money was returned by a different service than the one that took it.

## Scenario 3: Restaurant closed mid-order

Same path, different reason. One rejection mechanism, two causes.

## Scenario 4: Insufficient balance

```text
1. Place an order worth more than the wallet balance
2. API rejects it synchronously with 400
3. No order row, no event, no worker involvement
```

Shows a deliberate choice: validate synchronously where the user needs an immediate answer, asynchronously where the answer belongs to another service.

## Scenario 5: Kitchen Worker is down

```text
1. The order is CONFIRMED and sits there
2. Start the Kitchen Worker
3. Order moves to PREPARING and then READY
```

## Scenario 6: Duplicate event

```text
1. Publish the same OrderRejected twice from the management UI
2. First is processed, second is recognised by eventId and skipped
3. The wallet is credited exactly once
```

## Scenario 7: Cancellation race

```text
1. Place an order
2. Cancel it in the same instant the Order Worker is confirming it
3. Exactly one of the two wins, enforced by a conditional UPDATE
4. Status and balance stay consistent either way
```

The one worth practising before demoing, because the naive read-then-write version passes casual testing and fails under load.

---

# 22. Logging

Structured logs with Pino. Every log line from a worker should carry:

- `service`
- `consumer`
- `eventId`
- `eventType`
- `correlationId`
- `orderId`
- `userId`
- `durationMs`
- `err`

```json
{
  "level": "info",
  "service": "order-worker",
  "consumer": "orderflow.orders",
  "eventType": "OrderCreated",
  "eventId": "6f1c…",
  "correlationId": "req-88af…",
  "orderId": "101",
  "durationMs": 12,
  "message": "order confirmed"
}
```

Never log passwords, password hashes, cookies, or JWTs.

The payoff is `correlationId`. One grep across four services reconstructs the full path of a single order — API to order worker to kitchen — which is the only practical way to debug an async system and the clearest way to show what one actually does.

---

# 23. Docker Compose

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: orderflow
      POSTGRES_PASSWORD: orderflow
      POSTGRES_DB: orderflow
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orderflow"]
      interval: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 5s
      retries: 5

volumes:
  postgres_data:
  rabbitmq_data:
```

Management UI at `http://localhost:15672`, credentials `guest` / `guest`. Keep it open the entire time — watching queue depth rise and fall is the fastest way to understand what the system is doing.

Only infrastructure runs in Docker. The Node apps run on the host with `tsx watch`, because a rebuild on every file change would make the feedback loop far worse. Containerising the apps is a Phase 10 exercise.

---

# 24. Environment Variables

`.env.example`:

```env
NODE_ENV=development

DATABASE_URL=postgresql://orderflow:orderflow@localhost:5432/orderflow

RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=orderflow.events

API_PORT=4000
API_ORIGIN=http://localhost:5173

JWT_SECRET=replace-me-with-a-long-random-string
JWT_EXPIRES_IN=7d
COOKIE_SECRET=replace-me-too

KITCHEN_SIGNUP_CODE=let-me-cook

KITCHEN_PREP_TIME_MS=5000

LOG_LEVEL=info
```

Each application loads only what it needs. Validate the environment at startup with Zod and crash immediately if something is missing — a worker that boots without `RABBITMQ_URL` and fails silently three minutes later is much harder to diagnose than one that refuses to start.

`.env` is gitignored. `.env.example` is committed.

---

# 25. Development Scripts

```json
{
  "scripts": {
    "dev": "concurrently -n api,ord,kit,web -c blue,green,yellow,magenta \"pnpm -F api dev\" \"pnpm -F order-worker dev\" \"pnpm -F kitchen-worker dev\" \"pnpm -F web dev\"",
    "dev:api": "pnpm -F api dev",
    "dev:order": "pnpm -F order-worker dev",
    "dev:kitchen": "pnpm -F kitchen-worker dev",
    "dev:payment": "pnpm -F payment-worker dev",
    "dev:web": "pnpm -F web dev",

    "infra:up": "docker compose up -d",
    "infra:down": "docker compose down",
    "infra:reset": "docker compose down -v && docker compose up -d",

    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",

    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

Run workers in **separate terminals** rather than through `pnpm dev` while learning. Being able to kill one worker and watch the queue back up is the entire point, and that is hard to do inside multiplexed output.

---

# 26. Development Phases

Deliberately small steps. Each phase ends with something that runs.

## Phase 1 — Setup

- pnpm workspace, `tsconfig.base.json`
- `apps/api`, `apps/web`, `packages/shared`
- `docker compose up` for PostgreSQL and RabbitMQ
- Prisma schema and first migration
- Seed script: one kitchen user, one customer with a funded wallet, a few menu items
- `GET /health` returning `200`

## Phase 2 — Authentication

- Signup, login, logout, `/auth/me`
- argon2 hashing, JWT in an httpOnly cookie
- `authenticate` and `requireRole` middleware
- Kitchen signup gated by `KITCHEN_SIGNUP_CODE`
- Login and signup screens, `AuthContext`, protected routes

## Phase 3 — Wallet and Menu

- Wallet balance, top up, transaction list
- Customer `GET /menu`
- Kitchen menu CRUD, pause and resume
- Restaurant open/closed toggle
- Wallet page and kitchen Menu tab

## Phase 4 — Order flow, fully synchronous

No RabbitMQ yet. Everything in one process.

- `POST /orders` with balance check and debit in one transaction
- The API also checks availability and confirms or rejects inline
- `GET /orders`, `GET /orders/:id`
- Cancellation with synchronous refund
- Status transitions driven directly by the API

The point of building this first is to have a working baseline. Phase 6 pulls it apart, and the difference is the lesson.

## Phase 5 — Both UIs

- Menu, cart, place order, order detail with status timeline, order history
- Kitchen order queue with time-since-placed, Reject, Mark Ready, Mark Collected
- Polling with TanStack Query

**At this point the application is complete and usable.** Everything after this is about how the work is coordinated.

## Phase 6 — First event

- RabbitMQ connection helper with reconnect
- Declare the topic exchange and the `orderflow.orders` queue
- `POST /orders` stops deciding acceptance; it publishes `OrderCreated` and returns `PENDING`
- Order Worker consumes, validates against live state, sets `CONFIRMED` or `REJECTED`

The customer now sees `PENDING` before `CONFIRMED`. That visible gap is eventual consistency, and it is the moment the project starts being about what it claims to be about.

## Phase 7 — Second worker

- Publish `OrderConfirmed` and `OrderRejected`
- Kitchen Worker consumes `OrderConfirmed`, sets `PREPARING`, waits `KITCHEN_PREP_TIME_MS`, sets `READY`

## Phase 8 — Reliability

- Manual ACK with `prefetch(1)`
- `processed_events` and idempotent consumers
- `correlationId` threaded from HTTP request through every event
- Graceful shutdown on `SIGTERM`: stop consuming, finish the in-flight message, close the channel
- `GET /health/ready` checking database and broker

## Phase 9 — Compensation

- Payment Worker consuming `order.rejected` and `order.cancelled`
- Rejection and cancellation stop refunding inline and publish instead
- The refund now happens in a different service than the debit

## Phase 10 — Advanced

Pick from the backlog in section 27. Do not attempt all of it.

---

# 27. Async Patterns Backlog

Things worth adding after the happy path works, roughly in order of value per unit of effort.

## Cheap and high value

| Pattern | Effort | What it teaches |
| ------- | ------ | --------------- |
| **Competing consumers** — run two Order Workers | minutes | Round-robin distribution and horizontal scaling. Also proves why idempotency was needed: break it deliberately and watch a refund run twice |
| **`prefetch(1)`** versus the default | one line | Fair dispatch. Without it, one worker greedily buffers the whole queue while the other sits idle |
| **Graceful shutdown** | ~20 lines | Finish the in-flight message before closing. The difference between working and production-working |
| **Notification Worker** | ~30 min | A third consumer bound to `order.ready` and `order.rejected` that only logs. The point is adding a consumer with **zero changes to the producer** — the entire reason a topic exchange exists |

## Substantial

**Retry with backoff and a dead-letter queue.** RabbitMQ has no native delay; it is built from TTL plus dead-letter routing:

```text
orderflow.orders          (x-dead-letter-exchange -> orderflow.retry)
        | nack(requeue = false)
        v
orderflow.orders.retry    (x-message-ttl: 5000,
                           x-dead-letter-exchange -> orderflow.events)
        | TTL expires, routes back to the main queue
        v
orderflow.orders          attempt 2 … after 3 attempts -> orderflow.dlq
```

Count attempts from the `x-death` header. The real lesson is telling a **transient** failure (a database blip — retry) from a **poison message** (a malformed payload — retrying forever is a livelock).

**Outbox Pattern.** Closes the gap in section 17 where the transaction commits but the publish fails. Order and outbox row are written in the same transaction; a separate publisher polls unpublished rows, publishes them, and marks them sent.

```prisma
model OutboxEvent {
  id          String    @id @default(uuid())
  eventId     String    @unique
  eventType   String
  routingKey  String
  payload     Json
  publishedAt DateTime?
  attempts    Int       @default(0)
  createdAt   DateTime  @default(now())

  @@index([publishedAt, createdAt])
}
```

**Event log and audit trail.** Persist every consumed event and render the customer's status timeline from it rather than inferring times from `updatedAt`.

**Server-Sent Events instead of polling.** The interesting part is not the transport, it is the bridge: a worker publishes, the API consumes, the API pushes to the browser. The API becomes a consumer as well as a producer.

**Queue depth panel.** Poll RabbitMQ's management API and show `orderflow.orders: 3 waiting` on the kitchen dashboard. This makes the asynchrony itself visible — stop a worker, watch the number climb, start it, watch it drain.

## Advanced

- **Message ordering.** With two Order Workers, `OrderCreated` and `OrderCancelled` for the same order can be processed out of order. Fix with a consistent-hash exchange so one order always lands on one consumer.
- **Delayed messages.** "Ready for ten minutes and not collected" triggers a reminder — the same TTL and dead-letter trick reused as a scheduler.
- **Containerising the apps**, plus GitHub Actions running migrations and tests.

## Deliberately out of scope

Payment gateways, delivery tracking, ratings, multiple restaurants, image uploads, push notifications, and **stock or inventory tracking**. Each is work that teaches nothing about message queues and would bury the part of the project that is actually interesting.

---

# 28. Testing Strategy

## Unit

- Order total calculation, including price snapshots
- Balance sufficiency and the conditional-debit path
- Acceptance rules: closed restaurant, paused item, all clear
- Status transition rules and cancellation eligibility
- Event schema validation

## Integration (API plus a test database)

```text
POST /orders
    |
    v
wallet debited exactly once
    |
    v
order and items persisted as PENDING
    |
    v
OrderCreated published
```

Also: ordering a `PAUSED` item **succeeds** at the API and is rejected by the worker; cancelling a `PREPARING` order returns `409`; a customer cannot read another customer's order; a customer cannot reach `/kitchen/*`.

## Worker

- Consumer receives and validates an event
- Status updates correctly for accept and reject
- The right follow-up event is published
- A failed event is **not** acknowledged
- A duplicate `eventId` is skipped and the balance moves only once

That last one is the test worth writing first. It fails loudly if idempotency regresses, and idempotency is the property most easily broken by an innocent refactor.

## Manual demo run

```text
1. docker compose up, then start every service
2. Sign in as a customer, top up the wallet
3. Sign in as kitchen in another browser profile
4. Place an order — observe PENDING, then CONFIRMED, then PREPARING, then READY
5. Follow one correlationId across all service logs
6. Mark Collected in the kitchen UI
```

---

# 29. Demo Script

## Demo 1 — the happy path

```text
1. Customer dashboard: wallet Rs 1,200
2. Place a Burger x2 and Pizza x1 order, total Rs 550
3. Wallet drops to Rs 650 immediately, order shows PENDING
4. RabbitMQ UI: OrderCreated passing through orderflow.orders
5. Order Worker log: order confirmed
6. Order becomes CONFIRMED, then PREPARING, then READY
7. Kitchen dashboard: Mark Collected
8. Grep one correlationId across all service logs
```

## Demo 2 — the stale menu

```text
1. Customer has the menu open with Pizza showing
2. In the kitchen tab, pause Pizza
3. Customer places the Pizza order from the page they already had open
4. API accepts it: PENDING, wallet debited
5. Order Worker rejects it: "Pizza is currently unavailable"
6. Payment Worker refunds; the wallet returns to Rs 1,200
7. Customer UI shows the reason
```

The strongest demo in the project. Two dashboards side by side, a few seconds of stale data, an order accepted and then undone by a different service than the one that took the money.

## Demo 3 — worker downtime

```text
1. Stop the Order Worker
2. Place an order
3. Order stays PENDING, wallet already debited
4. RabbitMQ UI shows the message waiting in the queue
5. Start the Order Worker
6. The message is consumed and the order continues with no manual intervention
```

The clearest demonstration of the whole idea: the system was partly down and nothing was lost.

## Demo 4 — duplicate delivery

```text
1. Publish the same OrderRejected event twice from the RabbitMQ UI
2. First is processed, second is recognised by eventId and skipped
3. The wallet is credited exactly once
```

## Demo 5 — insufficient balance

```text
1. Order more than the wallet holds
2. Immediate 400, no order row, no event
```

Shows that not everything should be asynchronous. The customer needs this answer now, so it stays synchronous.

---

# 30. Design Decisions

## Why RabbitMQ

Decoupling, durability, at-least-once delivery with acknowledgement, independent worker scaling, and retry and dead-letter primitives that do not have to be built by hand.

## Why PostgreSQL

Relational order data, real transactions, foreign keys, and `Decimal` for money. The conditional updates that guard the wallet and the status machine depend on the database enforcing atomicity.

## Why the API does not decide acceptance

The customer's menu is a stale snapshot by the time they press Place Order. Validating availability inside the API would check it microseconds after reading it, which is not a meaningful check. Moving the decision into a worker puts a real time gap there and makes the rejection path a genuine condition rather than a simulated one. It is also the honest division of responsibility: the API takes payment and records intent, the restaurant decides whether it can deliver.

## Why there is no inventory

A restaurant cooks to order; it does not hold a fixed number of finished dishes. A per-item counter would model something that does not exist and would need constant manual upkeep. Pausing an item expresses the same thing — "we cannot make this right now" — with no bookkeeping. The architectural value lived in the *asynchronous decision*, not in the counter, and that is what the Order Worker keeps.

## Why separate workers

Independent responsibilities, independent deployment and scaling, and failure isolation — the Kitchen Worker can be down for ten minutes without anyone being unable to place an order.

## Why debit synchronously but refund asynchronously

The customer needs an immediate answer about their own money. A refund does not block anybody, must survive restarts, and benefits from automatic retry. Real payment systems draw the line in the same place.

## Why a ledger instead of a balance column

Auditability, a transaction history screen for free, and a unique constraint that makes double refunds impossible rather than merely unlikely.

## Why price snapshots on order items

Without them, editing the menu silently rewrites the totals of every historical order.

## Why one React app with two routes

`/customer/*` and `/kitchen/*` behave as two dashboards while sharing the auth context, API client, and types. Two separate frontends would duplicate all three.

## Why build synchronously first, then convert

Phase 4 produces a working application with no message broker at all. Phase 6 pulls it apart. Doing it in that order means the cost and the benefit of asynchrony are both observed directly, instead of taken on faith from a diagram.

---

# 31. Scope

## Must have

- Auth with roles, argon2, JWT cookie
- Wallet with ledger, top up, synchronous debit
- Kitchen menu management with pause and resume
- Restaurant open/closed toggle
- Order placement, status tracking, cancellation
- Both dashboards
- PostgreSQL, RabbitMQ, Order Worker and Kitchen Worker
- `OrderCreated`, `OrderConfirmed`, `OrderRejected`
- Structured logs with correlation IDs
- Docker Compose and a README with the architecture diagram

## Should have

- Manual rejection from the kitchen UI
- Manual ACK and idempotency
- Worker-restart demonstration
- Health checks
- Basic tests

## Nice to have

- Payment Worker and asynchronous refunds
- Notification Worker
- Outbox Pattern
- Retry queue and dead-letter queue
- Competing consumers
- Queue depth panel
- Server-Sent Events
- CI pipeline

Get the complete order flow working before reaching for anything in the last list.

---

# 32. Final Stack

```text
Monorepo:     pnpm workspaces (no Turborepo)

Backend:      Node.js, TypeScript, Fastify, Prisma, PostgreSQL,
              RabbitMQ, amqplib, argon2, jsonwebtoken, Zod, Pino, Vitest

Frontend:     React, TypeScript, Vite, React Router,
              TanStack Query, Tailwind CSS, React Hook Form

Infra:        Docker Compose, RabbitMQ Management UI

Later:        Payment Worker, Notification Worker, Outbox,
              Retry + DLQ, SSE, GitHub Actions
```

```text
One pnpm monorepo
        +
One Node.js/TypeScript API  (auth, wallet, menu, orders)
        +
Two workers now, a third later
        +
One React app with two role-based route trees
        +
PostgreSQL
        +
RabbitMQ
```

The value of this project is in the **event-driven backend architecture** and in what it takes to keep that correct under failure. Not in the build tooling, not in the size of the feature list, and not in modelling a restaurant accurately.
