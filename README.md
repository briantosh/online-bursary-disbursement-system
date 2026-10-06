# Scholarship Office Bursary Portal

A role-based bursary management system for verifying student eligibility, submitting funding applications, and reviewing awards. Students register against an official enrolled-student registry, submit an application with an academic transcript, and track decisions. Bursary officers review applications; system administrators manage student registry entries and staff accounts.

## Technology Stack

| Area | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React 19, Vite 6, CSS | Sign-in and registration, student application portal, admin tools, and officer review queue |
| Backend API | Node.js, Express 5 | REST API, input validation, access control, application workflow, and transcript delivery |
| Development server | Vite and `concurrently` | Serves the React client and starts the Express API during local development; Vite proxies `/api` to Express |
| Database | MySQL 8+, `mysql2` | Stores accounts, the verified student register, bursary applications, and transcript files |
| Authentication | Argon2id, JWT | Password hashing and 15-minute role-bearing access tokens |
| Security middleware | Helmet, CORS, `express-rate-limit`, Zod | Security headers, allowed origins, request throttling, and request validation |
| Upload handling | Multer | Accepts PDF transcripts up to 10 MB and stores them with the application |

## Roles

| Role | Capabilities |
| --- | --- |
| Student | Register using details that match an enrolled registry record; submit bursary applications with a PDF transcript; view application history, decisions, and officer notes; download their own transcript. |
| Bursary officer | View the application review queue; read student statements and verified profile details; download transcripts; update application status and add a review note. |
| System admin | All staff review capabilities; add or update student registry entries; create bursary-officer and admin accounts. |

Students can only view their own applications and transcripts. Staff endpoints require an active authenticated account with the appropriate role.

## Current Workflows

1. An administrator imports the official student register from CSV or adds an enrolled student through the admin dashboard.
2. The student registers with the same name, university email, admission number, and course as the enrolled registry record.
3. The student signs in and submits a bursary type, requested amount, statement, and academic transcript PDF.
4. The student sees the application and its status in **My bursary applications**.
5. A bursary officer or administrator reviews the application, downloads the transcript, and records a decision and optional note.

Transcripts are stored as MySQL `LONGBLOB` records associated with applications. The upload endpoint accepts PDF files only and limits each transcript to 10 MB.

## Requirements

- Node.js 20 or later
- MySQL 8.0.19 or later
- An official student-register export in CSV format

## Local Setup

1. Create a MySQL database named `bursary` using `utf8mb4` and copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a MySQL connection URL, a random `JWT_SECRET` of at least 32 characters, and the initial admin details in `.env`.
3. Install dependencies with `npm install`.
4. Create the database tables with `npm run db:migrate`.
5. Import the institution's official student register: `npm run registry:import -- path/to/students.csv`.
6. Create the first administrator with `npm run admin:create`.
7. Start the React client and API with `npm run dev`, then open `http://localhost:5173`.

The registry CSV must have `admission_number`, `full_name`, `email`, and `course` columns. An optional `status` column accepts `enrolled`, `graduated`, or `withdrawn`; it defaults to `enrolled`. Student registration only accepts a matching name, email, admission number, and course for an enrolled student.

## API Overview

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Public | Verify email, role, Argon2id password hash, and account status; return a 15-minute JWT. |
| `POST` | `/api/v1/auth/register` | Public | Verify student details against the enrolled registry and create a student account. |
| `GET` | `/api/v1/auth/me` | Authenticated | Return the current active account. |
| `POST` | `/api/v1/admin/students` | Admin | Add or update an enrolled-student registry record. |
| `POST` | `/api/v1/admin/staff` | Admin | Create a bursary-officer or admin account. |
| `POST` | `/api/v1/applications` | Student | Submit a bursary application with its transcript PDF. |
| `GET` | `/api/v1/applications/mine` | Student | List the signed-in student's applications. |
| `GET` | `/api/v1/applications` | Officer, admin | List applications for review. |
| `PATCH` | `/api/v1/applications/:id/status` | Officer, admin | Update an application decision and review note. |
| `GET` | `/api/v1/applications/:id/transcript` | Owner, officer, admin | Download an application transcript. |

The React client keeps the access token in memory and sends it as a bearer token to protected API routes. The browser client proxies `/api` to the local Express API during development.

## Future Work

- Add email notifications for application submission, requests for information, and decisions.
- Add application deadlines, configurable bursary eligibility rules, and funding limits managed by administrators.
- Add audit history for registry edits, staff actions, and application decisions.
- Add pagination, filtering, and reporting for larger application queues.
- Add account recovery and token refresh using secure, HTTP-only session cookies.
- Add automated API tests for authentication, registry verification, uploads, permissions, and decision workflows.
- Move transcript files to protected object storage for larger deployments while retaining authorization checks and audit logs.

## Deployment Notes

Production deployments must serve the client and API over HTTPS, set secrets outside source control, configure the allowed origin, and use a managed MySQL service with backups and restricted access. Student-register CSV files and transcripts contain personal information and must be handled according to the institution's data-protection requirements.
