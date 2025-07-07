# Starter Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)  
A full-stack boilerplate powered by Better Auth, Drizzle ORM, PostgreSQL & NeonDB, with social auth (Google & GitHub), Shadcn UI components, all running on Bun.

👉 **Repo:** https://github.com/Akash8585/starter-kit

---

## 🚀 Features

- **Better Auth** – Simplified, secure Next.js authentication with email/password, magic-links, and OAuth providers.
- **Drizzle ORM** – Type-safe database toolkit  
- **PostgreSQL & NeonDB** – Reliable SQL storage (local & cloud)  
- **Social Auth** – Sign in with **Google** & **GitHub**  
- **Shadcn UI** – Beautiful, accessible React components  
- **Bun** – Lightning-fast JavaScript runtime, package manager, and bundler  

---

## 📦 Tech Stack

| Layer             | Technology       |
| ----------------- | ---------------- |
| Runtime & Tooling | Bun              |
| ORM               | Drizzle          |
| Database          | PostgreSQL, Neon |
| Auth              | BetterAuth     |
| UI Components     | Shadcn UI (Tailwind CSS) |
| Language          | TypeScript       |

---

## 🔧 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Akash8585/starter-kit.git
cd starter-kit
bun install

```

### 2. Create enviornment file

```bash
cp .env.example .env
```
Provide environment variables in .env file

### 3. Run Migrations

```bash
bun add drizzle-orm @neondatabase/serverless dotenv
bun add -D drizzle-kit tsx

# Generate migrations (if you change schema)
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

#Use `drizzle-kit push` to instantly apply schema changes—perfect for rapid local testing without migration files.
npx drizzle-kit push

```

### 4. Development

```bash
bun dev
```
Open http://localhost:3000 in your browser.






