# 🚗 Car Rental System

A full-stack car rental platform with AI-powered KYC verification, booking management, damage tracking, and an admin dashboard — built with **FastAPI**, **React + TypeScript**, and deployed via **Docker** on **AWS EC2**.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Setup (Docker)](#local-setup-docker)
  - [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [CI/CD & Deployment](#cicd--deployment)
- [Roles & Access](#roles--access)
- [Sub-project READMEs](#sub-project-readmes)

---

## Overview

This is a production-ready car rental management system that handles the full rental lifecycle — from user registration and KYC document verification to booking, vehicle check-in/check-out, damage assessment, and payment tracking. It supports three roles: **Customer**, **Manager**, and **Admin**, each with their own interface and permissions.

---

## Features

### Customer Portal (`/portal`)
- Register, login, and manage your profile
- Browse available vehicles and view details
- **KYC Verification** — upload your driving license and selfie; an AI agent automatically verifies identity and document authenticity
- Book vehicles for a date range (blocked until KYC passes)
- View booking history and booking details
- Check-in / check-out flow

### Admin / Staff Dashboard (`/dashboard`)
- **Fleet Management** — add, edit, and monitor all vehicles
- **Bookings** — view all bookings, manage check-in/checkout
- **KYC Review** — manually review flagged KYC submissions
- **Damage Logs** — record and review vehicle damage per booking
- **Payments** — track and manage payment records
- **Users** — view and manage all customers *(Admin only)*
- **Async Jobs** — monitor background job statuses *(Admin only)*

### System Features
- JWT-based authentication with access + refresh tokens
- Argon2 password hashing
- Rate limiting via SlowAPI
- Async background jobs via **Celery** (KYC processing, expiry checks, notifications, vehicle document parsing)
- Scheduled tasks via **Celery Beat**
- File uploads (KYC documents, vehicle images) stored in **AWS S3**
- Email notifications via SMTP
- AI-powered KYC agent built with **LangGraph + LangChain + Groq**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Asyncpg |
| **Database** | PostgreSQL 15 |
| **Cache / Queue** | Redis 7 |
| **Task Queue** | Celery 5 (worker + beat scheduler) |
| **AI / KYC Agent** | LangGraph, LangChain, Groq API |
| **File Storage** | AWS S3 (via aiobotocore / boto3) |
| **Migrations** | Alembic |
| **Containerization** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions → GHCR → AWS EC2 |
| **Package Manager** | `uv` (Python), `npm` (frontend) |

---

## Architecture

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTP
                    ┌──────▼───────┐
                    │   Frontend   │  React + Vite  (port 80)
                    └──────┬───────┘
                           │ REST API
                    ┌──────▼───────┐
                    │   Backend    │  FastAPI        (port 8000)
                    └──┬───┬───┬───┘
                       │   │   │
              ┌────────┘   │   └──────────┐
              │            │              │
       ┌──────▼──┐  ┌──────▼──┐   ┌──────▼──┐
       │Postgres │  │  Redis  │   │  AWS S3 │
       └─────────┘  └────┬────┘   └─────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
       ┌──────▼──────┐    ┌─────────▼──────┐
       │Celery Worker│    │  Celery Beat   │
       │(KYC, damage,│    │ (scheduled     │
       │ notif, etc) │    │  expiry tasks) │
       └─────────────┘    └────────────────┘
```

---

## Project Structure

```
car-rental-system/
├── backend/                  # FastAPI application
│   ├── src/
│   │   ├── api/              # Route handlers
│   │   ├── core/services/    # Business logic
│   │   ├── data/
│   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   ├── repositories/ # DB access layer
│   │   │   ├── clients/      # Postgres, Redis, S3 clients
│   │   │   └── migrations/   # Alembic migrations
│   │   ├── workers/          # Celery tasks (KYC, damage, notifications)
│   │   ├── control/agents/   # LangGraph KYC agent
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── constants/        # Enums and constants
│   │   └── utils/            # JWT, hashing, pricing helpers
│   ├── scripts/              # Seed scripts (e.g., seed_admin.py)
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── features/         # Feature modules (auth, bookings, KYC, inventory, etc.)
│   │   ├── pages/
│   │   │   ├── portal/       # Customer-facing pages
│   │   │   └── dashboard/    # Admin/staff pages
│   │   ├── components/       # Shared UI components
│   │   ├── app/routes/       # React Router config
│   │   ├── context/          # Auth context
│   │   └── hooks/            # Custom hooks
│   └── Dockerfile
│
├── .github/workflows/
│   └── deploy.yml            # CI/CD pipeline
├── docker-compose.yml        # Local development compose
└── .gitignore
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- An AWS S3 bucket (for file uploads)
- A Groq API key (for the KYC AI agent)
- SMTP credentials (for email notifications)

### Local Setup (Docker)

> **Recommended** — spins up all services with a single command.

**1. Clone the repository**
```bash
git clone https://github.com/MANOVIGNESH-S/car-rental-system.git
cd car-rental-system
```

**2. Configure environment variables**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials (see Environment Variables section)
```

**3. Start all services**
```bash
docker compose up --build
```

This starts: PostgreSQL, Redis, FastAPI backend (with Alembic migrations auto-applied), Celery worker, Celery beat scheduler, and the React frontend.

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

**4. Seed the admin user**
```bash
docker compose exec backend uv run python scripts/seed_admin.py
```

---

### Manual Setup

See the individual setup guides:
- [`backend/README.md`](./backend/README.md) — Python environment, running FastAPI, Celery workers, and Alembic
- [`frontend/README.md`](./frontend/README.md) — Node/npm setup and Vite dev server

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret — use a long random string in production |
| `INTERNAL_SECRET` | Secret for internal webhook calls between services |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `CELERY_BROKER_URL` | Redis URL used by Celery broker |
| `CELERY_RESULT_BACKEND` | Redis URL used by Celery result backend |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 |
| `AWS_REGION` | AWS region (e.g. `ap-south-1`) |
| `S3_BUCKET_NAME` | S3 bucket for storing KYC docs and vehicle images |
| `SMTP_HOST / SMTP_USER / SMTP_PASSWORD` | Email credentials for notifications |
| `GROQ_API_KEY` | Groq API key for the LangGraph KYC agent |
| `FRONTEND_URL` | Frontend origin (for CORS) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token TTL (default: 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | JWT refresh token TTL (default: 30) |

---

## CI/CD & Deployment

Pushing to the **`deploy`** branch triggers the GitHub Actions pipeline:

1. **Build** — Docker images for backend and frontend are built
2. **Push** — Images are pushed to **GitHub Container Registry (GHCR)**
3. **Deploy** — SSH into the AWS EC2 instance, pull the new images, and restart services using a production Docker Compose file

Required GitHub Secrets:

| Secret | Description |
|---|---|
| `EC2_HOST` | Public IP or hostname of your EC2 instance |
| `EC2_SSH_KEY` | Private SSH key for the EC2 instance |
| `GHCR_PAT` | GitHub Personal Access Token to pull images on EC2 |
| `ENV_FILE` | Full contents of your production `backend/.env` |

---

## Roles & Access

The system has three roles. Access is enforced on both the frontend (route guards) and backend (JWT claims).

### 👤 Customer
Access to the **Customer Portal** only.
- Browse vehicles, complete KYC, create and manage bookings

### 🛠️ Manager
Everything a Customer can do, plus the **Staff Dashboard**:
- Fleet management · Bookings · KYC review · Damage logs · Payments

### 🔑 Admin
Full access — everything a Manager can do, plus:
- User management (view, suspend, manage all accounts)
- Async job monitoring (track background task statuses)

---

## 📂 Sub-project READMEs

This repo contains two independently documented sub-projects:

| | |
|---|---|
| [`backend/README.md`](./backend/README.md) | FastAPI setup, running without Docker, Celery worker configuration, Alembic migration commands |
| [`frontend/README.md`](./frontend/README.md) | React + Vite setup, ESLint & TypeScript configuration, build and preview instructions |
