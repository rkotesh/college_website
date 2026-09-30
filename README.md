# CIET ERP — College Enterprise Resource Portal

A full-stack, enterprise-grade, role-based academic portal built for **Chalapathi Institute of Engineering and Technology (CIET)**.

> **Designed, developed, and maintained solely by [Sankula Koteswara Rao](https://github.com/rkotesh).**

**🔗 Live Demo:** [college-website-omega-flax.vercel.app](https://college-website-omega-flax.vercel.app/)
**📦 Repository:** [github.com/rkotesh/college_website](https://github.com/rkotesh/college_website)

Highlights: secure **Two-Factor Authentication (2FA OTP via Email)**, a **Unified Faculty & Mentor Portal**, **Strict Department-Scoped Data Isolation**, **Live Public Student Portfolios with Bulk CSV & Link Export**, **Dynamic Department Timetables**, and **Escalation Interventions**, backed by an automated test suite.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features by Role](#-key-features-by-role)
- [Tech Stack](#-tech-stack)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security Policy](#-security-policy)
- [Author](#-author)
- [License & Attribution](#-license--attribution)

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
- **Vite 5.x** (Fast HMR and production bundler)
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
- **JUnit 5 & MockMvc** (67 automated backend tests)

### Hosting
- **Frontend:** Vercel
- **Database:** MongoDB Atlas

---

## 🌐 Environment Variables

Configuration is handled via standard environment variables or a root `.env` file (see [`.env.example`](.env.example)):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `8080` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/erp_portal` |
| `JWT_SECRET` | 256-bit secret key for signing JWTs | *(Set a strong secret in production)* |
| `EMAIL_HOST` | SMTP server host for 2FA OTP | `smtp.gmail.com` |
| `EMAIL_HOST_USER` | SMTP username | *(configured via env)* |
| `EMAIL_HOST_PASSWORD` | SMTP password / app password | *(configured via env)* |
| `DIRECTOR_EMAIL` | Initial administrator account email | `admin@ciet.edu.in` |
| `DIRECTOR_PASSWORD` | Initial administrator password | *(auto-generated if unset in dev)* |
| `VITE_API_URL` | Backend URL used by the frontend | `http://localhost:8080` |

---

## 🧪 Testing

Quality is verified through automated tests on both layers of the stack.

| Layer | Framework | Scope |
| :--- | :--- | :--- |
| Backend | JUnit 5 & MockMvc | 67 automated unit and web-layer tests for the Spring Boot REST APIs |
| Frontend | Vitest & React Testing Library | Unit and integration tests for React components |
| Build quality | Maven `-Xlint:all` | Strict zero-warning compilation |

---

## ☁️ Deployment

| Component | Platform | Notes |
| :--- | :--- | :--- |
| Frontend | Vercel | Set `VITE_API_URL` to the deployed backend URL. Build command `npm run build`, output directory `dist`. |
| Backend | Any Java 17+ host | Build with `mvn clean package`, run with `java -jar target/*.jar`. Provide all environment variables above. |
| Database | MongoDB Atlas | Allow the backend host's IP in Atlas Network Access. |

---

## 🔒 Security Policy

For security vulnerability reporting, git history remediation, and secret rotation guidelines, please review the [Security Policy](SECURITY.md).

---

## 👤 Author

**Sankula Koteswara Rao**
Sole developer: concept, architecture, frontend, backend, testing, and deployment.

- GitHub: [@rkotesh](https://github.com/rkotesh)

---

## 📄 License & Attribution

Copyright © 2026 **Sankula Koteswara Rao**. All rights reserved.

Built by Sankula Koteswara Rao for **Chalapathi Institute of Engineering and Technology (CIET)**.
All institutional trademarks, course curricula, and crests belong to Chalapathi Educational Society.