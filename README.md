# Job Dashboard

A modern web dashboard for tracking job applications, replacing the legacy CLI tool.

## Features
- **Job Scraping:** Automatically fetch internships and new grad roles from curated GitHub sources.
- **Filtering:** Configure accepted and rejected title keywords to see only relevant roles.
- **Management:** Track application status (Applied, Skipped, Unprocessed).
- **Analytics:** View stats on processed jobs and top companies.
- **Secure:** Multi-user support with JWT authentication and password hashing.

## Tech Stack
- **Backend:** [ElysiaJS](https://elysiajs.com/) (Bun-native)
- **Database:** SQLite via `bun:sqlite`
- **Frontend:** React + Tailwind CSS 4 + Lucide Icons
- **Tooling:** Bun

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed.

### Installation
```bash
bun install
```

### Running the Application
To run both backend and frontend in development mode:
```bash
bun dev
```

The server will run on `http://localhost:3001` and the dashboard on `http://localhost:5173`.

### Backend Only
```bash
bun run server
```

### Frontend Only
```bash
bun run client
```

## Security
- Input validation via Elysia and Zod.
- Parameterized SQLite queries to prevent SQL injection.
- Password hashing using `bcrypt`.
- JWT-based authentication for all API endpoints.
