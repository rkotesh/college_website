# CIET ERP — College Enterprise Resource Portal

A full-stack, role-based ERP system built for **Chalapathi Institute of Engineering and Technology (CIET)**. It provides dedicated dashboards for Students, Faculty, Mentors, HODs, and Admins — with features like portfolio building, mentorship tracking, grade management, announcements, and accreditation tools.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features by Role](#features-by-role)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [Screenshots](#screenshots)

---

## Overview

| | |
|---|---|
| **College** | Chalapathi Institute of Engineering & Technology |
| **Purpose** | Unified ERP portal for academic and administrative workflows |
| **Roles** | Student · Faculty · Mentor · HOD · Admin |
| **Auth** | JWT-based authentication with role-based access control |
| **Database** | MongoDB (Atlas cloud-hosted) |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool & Dev Server |
| GSAP | 3.x | Animations (CGPA gauges, transitions) |
| Vanilla CSS | — | Styling (custom design system) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 17 (LTS) | Runtime |
| Spring Boot | 3.2.4 | Application Framework |
| Spring Security | 6.x | Authentication & Authorization |
| Spring Data MongoDB | 3.x | Database ORM |
| JWT (JJWT) | 0.11.5 | Token-based auth |
| Maven | 3.9.x | Build & dependency management |
| Docker | — | Containerization |

### Database & Infrastructure
| Technology | Purpose |
|---|---|
| MongoDB Atlas | Cloud-hosted NoSQL database |
| Docker | Backend containerization |
| Nginx | Reverse proxy & static file serving |

---

## Features by Role

### 🎓 Student Dashboard
- Animated CGPA radial gauge (GSAP-powered)
- Live grade records by semester
- Portfolio builder — Projects, Skills, Certifications, Internships, Research, Events, Courses
- Email OTP verification for social profile links
- Public shareable portfolio page toggle
- Announcement feed & training programs
- Direct messaging & escalation system

### 👨‍🏫 Faculty Dashboard
- Department student overview
- Profile management
- Announcement creation
- Document repository access
- Direct messaging

### 🧑‍💼 Mentor Dashboard
- Assigned mentee listing
- Confidential case notes per student
- Mentorship meeting logs
- Escalation management
- Student progress tracking

### 🏛️ HOD Dashboard
- Full department analytics & student stats
- Mentorship assignment management
- Accreditation checklist & document tracking
- Faculty management
- Announcements & training programs
- Bulk student upload via Excel

### ⚙️ Admin Dashboard
- User creation & role management
- Department & batch management
- Semester results upload
- System-wide announcements
- Platform sync & data administration

---

## Project Structure

```
ciet_erp-main/
│
├── backend/                        # Spring Boot API
│   ├── Dockerfile                  # Docker multi-stage build
│   ├── pom.xml                     # Maven dependencies
│   └── src/main/java/edu/ciet/erp/
│       ├── ErpApplication.java     # Entry point
│       ├── config/                 # Security, global exception handler, data initializer
│       ├── controller/             # REST API controllers (Auth, HOD, Admin, Portal)
│       ├── dto/                    # Request/Response data transfer objects
│       ├── model/                  # MongoDB document models
│       ├── repository/             # Spring Data MongoDB repositories
│       ├── security/               # JWT filter, JWT service, rate limiter
│       └── service/                # Business logic (Auth, OTP, Platform sync)
│
├── frontend/                       # React + Vite application
│   ├── vercel.json                 # Vercel SPA routing config
│   ├── vite.config.ts              # Vite build config
│   ├── public/                     # Static assets (logo, favicon, icons)
│   └── src/
│       ├── App.tsx                 # Root component & role-based routing
│       ├── index.css               # Full design system (HSL tokens, animations)
│       ├── components/             # Shared components (LogoHeader, NewsCarousel, StatsCard)
│       └── pages/
│           ├── LandingPage.tsx     # Public home page
│           ├── LoginPage.tsx       # JWT login page
│           ├── StudentDashboard.tsx
│           ├── FacultyDashboard.tsx
│           ├── MentorDashboard.tsx
│           ├── HODDashboard.tsx
│           ├── AdminDashboard.tsx
│           └── PublicPortfolio.tsx # Public student portfolio page
│
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure you have these installed before running the project locally:

| Tool | Minimum Version | Download |
|---|---|---|
| Node.js | 18.x | [nodejs.org](https://nodejs.org) |
| npm | 9.x | Included with Node.js |
| Java JDK | 17 | [adoptium.net](https://adoptium.net) |
| Maven | 3.9.x | [maven.apache.org](https://maven.apache.org) |
| Docker *(optional)* | 24.x | [docker.com](https://www.docker.com) |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/rkotesh/college_website.git
cd college_website
```

### 2. Run the Backend
```bash
cd backend
mvn spring-boot:run
```
The API will start at: `http://localhost:8080`

> The default MongoDB connection points to the live Atlas cluster defined in `application.yml`. No extra database setup is needed for development.

### 3. Run the Frontend
Open a **new terminal** and run:
```bash
cd frontend
npm install
npm run dev
```
The app will open at: `http://localhost:5173`

### 4. (Optional) Run Backend with Docker
```bash
cd backend
docker build -t ciet-backend .
docker run -p 8080:8080 ciet-backend
```

---

## Environment Variables

### Frontend (`frontend/.env`)
Create this file before running locally or deploying:

```env
VITE_API_URL=http://localhost:8080
```

For production, set `VITE_API_URL` to your deployed backend URL (e.g., `https://ciet-erp-api.onrender.com`).

### Backend (`backend/.env` or server environment)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `8080` |
| `MONGODB_URI` | MongoDB Atlas connection string | *(hardcoded Atlas URI in `application.yml`)* |
| `MONGODB_NAME` | MongoDB database name | `erp_portal` |
| `JWT_SECRET` | 256-bit hex JWT signing secret | *(default in `application.yml`)* |
| `JWT_EXPIRATION_MS` | Access token expiry (ms) | `86400000` (24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token expiry (ms) | `604800000` (7d) |
| `DIRECTOR_EMAIL` | Default admin login email | `skillportfolio@chalapathiengg.ac.in` |
| `DIRECTOR_PASSWORD` | Default admin login password | `Ciet@2027` |
| `EMAIL_HOST` | SMTP server host | `localhost` |
| `EMAIL_PORT` | SMTP server port | `587` |
| `EMAIL_HOST_USER` | SMTP username | — |
| `EMAIL_HOST_PASSWORD` | SMTP password | — |

> ⚠️ **Never commit real passwords or secrets to GitHub.** Use environment variable injection on your hosting platform.

---

## Deployment

### Frontend → Vercel (Free)
1. Go to [vercel.com](https://vercel.com) and import `rkotesh/college_website`
2. Set **Root Directory** to `frontend`
3. Framework preset: `Vite`
4. Add environment variable: `VITE_API_URL` = your backend URL
5. Deploy → live at `https://your-app.vercel.app`

> `vercel.json` is already configured in the `frontend/` folder for SPA routing.

### Backend → Render (~$7/month or Free tier)
1. Go to [render.com](https://render.com) → New Web Service
2. Connect the same GitHub repo
3. Set **Root Directory** to `backend`, Runtime to `Docker`
4. Add all backend environment variables listed above
5. Deploy → live at `https://your-api.onrender.com`

### Database → MongoDB Atlas (Free / $9/month)
The app already connects to a live MongoDB Atlas cluster. For a fresh production database:
1. Create a cluster at [mongodb.com/atlas](https://cloud.mongodb.com)
2. Get the connection string and set it as `MONGODB_URI`

---

## API Overview

All API endpoints are prefixed with `/api/v1/`.

| Prefix | Controller | Access |
|---|---|---|
| `/api/v1/auth/**` | AuthController | Public |
| `/api/v1/portal/**` | PortalController | Authenticated |
| `/api/v1/hod/**` | HODController | HOD · Faculty · Mentor |
| `/api/v1/admin/**` | AdminController | Admin only |

Authentication uses **Bearer JWT tokens** in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Default Login Credentials

> These are for development/demo only. Change them before going to production.

| Role | Email | Password |
|---|---|---|
| Admin / Director | `skillportfolio@chalapathiengg.ac.in` | `Ciet@2027` |

---

## Built With ❤️ for CIET

> Chalapathi Institute of Engineering and Technology · Lam, Guntur, Andhra Pradesh
