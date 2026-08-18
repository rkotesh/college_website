# CIET ERP — College Enterprise Resource Portal

A full-stack, enterprise-grade, role-based academic portal built for **Chalapathi Institute of Engineering and Technology (CIET)**. 

Featuring secure **Two-Factor Authentication (2FA OTP via Email)**, a **Unified Faculty & Mentor Portal**, **Strict Department-Scoped Data Isolation**, **Live Public Student Portfolios with Bulk CSV & Link Exporting**, **Dynamic Department Timetables**, **Escalation Interventions**, and **100% Automated Unit Test Coverage**.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features by Role](#-key-features-by-role)
- [Tech Stack](#-tech-stack)
- [Department Scoping & Security Model](#-department-scoping--security-model)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Local Development Setup](#-local-development-setup)
- [Automated Testing Suite](#-automated-testing-suite)
- [Environment Variables](#-environment-variables)
- [Deployment Guide](#-deployment-guide)
- [API Reference](#-api-reference)
- [Default Login Credentials](#-default-login-credentials)

---

## 🏛️ Overview & Architecture

| Parameter | Specification |
| :--- | :--- |
| **Institution** | Chalapathi Institute of Engineering & Technology (Autonomous), Guntur |
| **Accreditations** | NAAC 'A' Grade, NBA Accredited, AICTE Approved, JNTUK / ANU Affiliated |
| **Portal Roles** | `Student` · `Faculty` · `Mentor` · `Faculty & Mentor` · `HOD` · `Admin` · `Parent` |
| **Authentication** | Phase 1 Password Check + Phase 2 Secure Email OTP + JWT Bearer Tokens |
| **Database** | MongoDB Atlas (Cloud-Hosted, Multi-Tenant Department Collections) |
| **Frontend Routing** | Role-Guarded React SPA with Framer Motion transitions |

---

## ✨ Key Features by Role

### 🎓 1. Student Portal (`StudentDashboard.tsx`)
- **Animated CGPA Radial Gauge**: Real-time academic standing and semester grade breakdown.
- **Dynamic Portfolio Builder**: Interactive modules for Projects, Technical Skills, Certifications, Internships, Research Publications, Workshops/Events, and Extracurriculars.
- **Social Profile Sync**: GitHub repository counter, LeetCode problem solve statistics, and Codeforces rating synchronization.
- **Public Portfolio URL**: Instant public web portfolio (`/portfolio/:slug`) with recruiter-ready resume export and visibility toggles.
- **Department Notices & Timetables**: Live class timetables and announcements streamed from HOD and Admin.

### 👨‍🏫 2. Faculty & Mentor Portal (`FacultyDashboard.tsx`)
- **Adaptive Role Switcher**: Automatically tailors navigation, header titles, and actions whether logged in as Faculty, Mentor, or dual-role Faculty & Mentor.
- **Strict Department Student Directory**: Fast search and filtering for students belonging exclusively to the staff member's department cohort.
- **Department Student Portfolios Hub**:
  - Live preview modal for any student's public portfolio without leaving the portal.
  - **One-Click CSV Report Export**: Comprehensive batch report (Roll No, Name, Email, Dept, Year, Sec, CGPA, Public URL).
  - **Bulk Public Link Copier**: Formats and copies all live portfolio URLs to the clipboard for recruiter distribution.
- **Mentorship Case Notes & Logs**: Confidential counseling logs, academic standing indicators, and meeting notes.
- **Escalation Interventions**: Real-time multi-role escalation threads involving HODs, Mentors, Faculty, and Students.
- **Curriculum Repository & Trainings**: Syllabus coverage tracker, lesson plan uploads, and faculty development program (FDP) registrations.

### 🏛️ 3. Head of Department (HOD) Portal (`HODDashboard.tsx`)
- **Department Analytics Dashboard**: Aggregated CGPA trends, student counts, and active mentorship ratios.
- **Mentorship Mapping**: Automated cohort splitting and manual mentor-student mapping tools.
- **Accreditation Checklists**: Pre-audit compliance verification for NAAC / NBA criteria.
- **Bulk Excel Importer**: Batch student enrollment and academic record onboarding.

### ⚙️ 4. Administrator & Director Portal (`AdminDashboard.tsx`)
- **Global User & Role Management**: Create, edit, and deactivate staff and student accounts.
- **Department Configuration**: Dynamic creation of academic departments, codes, branches, and section identifiers.
- **Institutional Broadcasts**: Targeted notifications filterable by role, department, year, and section.
- **Academic Timetable Management**: Weekly schedule builder with periods, subjects, faculty mappings, and room allocations.

---

## 💻 Tech Stack

### Frontend
- **React 18.x** with **TypeScript** (Strict mode)
- **Vite 5.x** (Lightning-fast HMR and production bundle builder)
- **Framer Motion** (Page transitions and interactive modals)
- **Lucide Icons** & **Canvas Particles Engine**
- **Vitest & React Testing Library** (Unit and integration tests)

### Backend
- **Java 17 (LTS)**
- **Spring Boot 3.2.4** (REST APIs, Security, Validation)
- **Spring Security 6.x** (Stateful lockout protection, JWT auth filter, role authorizers)
- **Spring Data MongoDB** (Aggregation pipelines, indexed document queries)
- **JJWT 0.11.5** (HMAC-SHA-256 JWT access and refresh token signing)
- **Jakarta Mail** (2FA OTP verification and notification delivery)
- **Apache POI 5.2.5** (Excel student roster batch parsing)
- **Maven 3.9+** (Build tool with `-Xlint:all` strict zero-warning compilation)

---

## 🔒 Department Scoping & Security Model

The backend enforces department-level isolation across all queries:
1. **Branch Code Resolution**: Prioritized roll-number branch parser recognizing `CSM` / `AIML` (Artificial Intelligence & Machine Learning), `CAI` / `AI`, `CSE`, `ECE`, `EEE`, `MECH`, `CIVIL`, and `IT`.
2. **Strict HOD & Mentor Scope Guard**: Staff members only receive data for students enrolled in their assigned department codes.
3. **Defense-in-Depth Frontend Filtering**: Client-side boundary check (`isStudentInMyDept`) automatically blocks non-department entities from leaking into tables or exported reports.
4. **Brute-Force & Lockout Guard**: Rate limiting filter and 3-attempt exponential account lockout on OTP verifications.

---

## 📂 Project Structure

```
ciet_erp-main/
│
├── backend/
│   ├── pom.xml                               # Maven project configuration & compiler rules
│   ├── src/main/java/edu/ciet/erp/
│   │   ├── ErpApplication.java               # Spring Boot entry point
│   │   ├── config/                           # Security, DataInit, MongoDB configs
│   │   ├── controller/
│   │   │   ├── AuthController.java           # 2FA Login, OTP, Password Reset
│   │   │   ├── HODController.java            # HOD/Faculty/Mentor APIs & Scope Guard
│   │   │   ├── AdminController.java          # Administrator APIs & System Operations
│   │   │   └── PortalController.java         # Student Portfolios & Academic Records
│   │   ├── dto/                              # Request/Response DTOs
│   │   ├── model/                            # User, StudentProfile, Department, etc.
│   │   ├── repository/                       # Spring Data MongoDB Repositories
│   │   ├── security/                         # JwtAuthFilter, RateLimitingFilter
│   │   └── service/                          # AuthService, OtpService, PlatformSync
│   └── src/test/java/edu/ciet/erp/           # 67 JUnit 5 & MockMvc Automated Unit Tests
│
├── frontend/
│   ├── vite.config.ts                        # Vite & Vitest configuration
│   ├── tsconfig.json / tsconfig.app.json     # TypeScript strict configuration
│   ├── src/
│   │   ├── App.tsx                           # Master Router & Session Guard
│   │   ├── index.css                         # Design System & Token Styles
│   │   ├── components/                       # LogoHeader, StatsCard, EscalationsChat
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx                 # 2-Phase Auth & OTP Verification
│   │   │   ├── StudentDashboard.tsx          # Student Portal & Portfolio Editor
│   │   │   ├── FacultyDashboard.tsx          # Faculty & Mentor Unified Portal
│   │   │   ├── HODDashboard.tsx              # HOD Operations Portal
│   │   │   ├── AdminDashboard.tsx            # Admin Operations Portal
│   │   │   ├── PublicPortfolio.tsx           # Public Shareable Student Portfolio
│   │   │   └── LandingPage.tsx               # Institutional Landing Page
│   │   └── test/                             # 9 Vitest & React Testing Library Tests
│
├── vercel.json                               # Vercel Production Deployment Config
└── README.md                                 # Documentation
```

---

## 📋 Prerequisites

- **Node.js**: `v18.x` or `v20.x` LTS
- **Java Development Kit (JDK)**: `17` or `21`
- **Apache Maven**: `3.9+`
- **MongoDB Atlas** or local MongoDB instance

---

## 🛠️ Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/rkotesh/college_website.git
cd college_website
```

### 2. Start Backend API
```bash
cd backend
mvn spring-boot:run
```
*Backend API starts at: `http://localhost:8080`*

### 3. Start Frontend App
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend Application opens at: `http://localhost:5173`*

---

## 🧪 Automated Testing Suite

The repository features comprehensive automated unit and integration tests across both stacks:

### Run Backend Tests (JUnit 5 & Spring Security Test)
```bash
cd backend
mvn test
```
*Executes all 67 test cases covering Auth, Token Lifecycle, Rate Limiting, OTP generation, and Controller scoping.*

### Run Frontend Tests (Vitest & Testing Library)
```bash
cd frontend
npm test
```
*Executes 9 unit tests verifying Login flow state transitions, OTP modal prompts, and component rendering.*

---

## 🌐 Environment Variables

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8080
```

### Backend (`backend/src/main/resources/application.yml` or Environment)
```yaml
server:
  port: 8080

spring:
  data:
    mongodb:
      uri: ${MONGODB_URI}
      database: erp_portal
  mail:
    host: ${EMAIL_HOST:smtp.gmail.com}
    port: 587
    username: ${EMAIL_HOST_USER}
    password: ${EMAIL_HOST_PASSWORD}

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000        # 24 Hours
  refresh-expiration: 604800000 # 7 Days
```

---

## 🚀 Deployment Guide

### Frontend Deployment (Vercel)
1. Import `rkotesh/college_website` into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Add Environment Variable: `VITE_API_URL` pointing to your deployed backend.
5. Deploy (Build command: `tsc -b && vite build`, Output directory: `dist`).

### Backend Deployment (Render / Docker)
1. Create a new Web Service on [Render](https://render.com).
2. Set **Root Directory** to `backend` and select **Docker** or **Java 17 Native**.
3. Supply `MONGODB_URI`, `JWT_SECRET`, and SMTP environment variables.
4. Deploy service.

---

## 🔑 Default Login Credentials

> *For testing and administrative review:*

| Role | Email Identifier | Password |
| :--- | :--- | :--- |
| **Director / Admin** | `skillportfolio@chalapathiengg.ac.in` | `Ciet@2027` |
| **HOD (AIML)** | `hod.ai@chalapathiengg.ac.in` | *(configured in DB)* |
| **Faculty & Mentor** | `prasanna.ai@chalapathiengg.ac.in` | *(configured in DB)* |

---

## 📄 License & Attribution

Developed with ❤️ for **Chalapathi Institute of Engineering and Technology (CIET)**.  
All institutional trademarks, course curricula, and crests belong to Chalapathi Educational Society.
