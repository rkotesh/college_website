# Security Policy

## 📦 Supported Versions

The following versions of the CIET ERP / College Portal are currently supported with security updates and patches:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| `main` (Latest) | :white_check_mark: | Active development & production releases |
| `1.0.x` | :white_check_mark: | Current stable branch |
| `< 1.0` | :x:                | Legacy / deprecated |

---

## 🛡️ Reporting a Vulnerability

We take the security of this project and student/faculty data seriously. If you discover a security vulnerability or credential leak, please report it responsibly:

### How to Report
1. **GitHub Security Advisory**: Open a [Private Security Advisory](https://github.com/rkotesh/college_website/security/advisories/new) on GitHub.
2. **Email**: Alternatively, send an email to the project maintainers or security contact with:
   - Detailed description of the vulnerability.
   - Steps to reproduce the issue or proof-of-concept (PoC).
   - Potential impact and affected endpoints/components.

### Response Timeline
- **Initial Response**: Within 24–48 hours confirming receipt of the report.
- **Triage & Status Update**: Within 3–5 business days with assessment and mitigation plan.
- **Fix & Disclosure**: A security patch will be prepared and deployed before any public disclosure.

---

## 🔒 Security Best Practices & Secret Management

1. **Environment Variables**:
   - Never commit sensitive secrets, API keys, database credentials, or private keys to the repository.
   - Store all credentials in `.env` or CI/CD environment secrets.
2. **Role-Based Access Control (RBAC)**:
   - Ensure server-side authorization checks (`@PreAuthorize` / JWT claims) are enforced across all student, faculty, HOD, and admin routes.
3. **Data Privacy (PII Protection)**:
   - Do not store or commit real student personal data (phone numbers, personal addresses, national IDs) in public environments or test fixtures.
