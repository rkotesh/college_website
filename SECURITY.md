# Security Policy

## 🛡️ Responsible Disclosure & Reporting

If you discover a security vulnerability or credential leak within the CIET ERP repository or deployed services, please report it responsibly:

- **Email**: `security@ciet.edu.in` or create a private security advisory in GitHub.
- **Expected Response**: Within 24 hours.
- Please do not disclose vulnerabilities publicly until a patch and secret rotation have been completed.

---

## 🚨 Priority 0: Credential Rotation & Secret Management

If credentials were ever committed to a public or shared repository, **code cleanup alone does not eliminate the risk**. Follow this mandatory order of operations:

### 1. Immediate Credential Rotation (Execute in Provider Consoles First)
1. **MongoDB Atlas Database Password**:
   - Access **MongoDB Atlas Console** > **Database Access**.
   - Rotate the database user password or delete any compromised database users (e.g., `ciet_db`).
   - In **Network Access**, ensure the IP Access List is restricted to trusted host IPs (e.g., Render/AWS NAT IPs) and **never left open to `0.0.0.0/0`**.
2. **Administrator & Director Password**:
   - If any default password (such as `Ciet@2027`) was used on live staging/production servers, change it immediately in the database or admin profile.
3. **SMTP / Email App Password**:
   - If `EMAIL_HOST_PASSWORD` was ever used with real Gmail/institutional email accounts, revoke and regenerate the App Password in your email security settings.
4. **JWT Secret (`JWT_SECRET`)**:
   - Rotating `JWT_SECRET` invalidates all previously signed JWT tokens and active user sessions. This is expected and forces all users to log in securely with fresh tokens.

---

## 🧹 Git History Scrubbing (Purging Historical Commits)

Commits in Git history retain prior versions of modified files. To permanently scrub exposed credentials across all commits and branches:

### Option A: Using `git-filter-repo` (Recommended)

1. Create a `passwords.txt` file listing regex / strings to replace:
   ```text
   Ram9182%40==>REDACTED_DB_PASS
   Ciet@2027==>REDACTED_ADMIN_PASS
   ```
2. Run `git-filter-repo`:
   ```bash
   git filter-repo --replace-text passwords.txt --force
   ```
3. Verify history and force push to remote:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

### Option B: Deep Secret Scanning with `gitleaks`

Run an automated scan across the entire Git commit history to ensure no other tokens or secrets remain:
```bash
gitleaks detect --source . --log-opts="--all" --verbose
```

> [!WARNING]
> **Force-Push Coordination Notice**:
> Rewriting Git history alters commit hashes. Any team members, collaborators, or CI/CD pipelines with existing local clones must re-clone or synchronize by running:
> ```bash
> git fetch origin
> git reset --hard origin/main
> ```

---

## 🏛️ Institutional Compliance & Data Protection

1. **Institutional Trademarks & Logos**:
   - Ensure you have written institutional authorization before using official college crests, logos, and trademarks in public repositories or marketing materials.
2. **Student & Faculty PII**:
   - Do not commit or expose real student phone numbers, personal email addresses, parent contacts, or government IDs. Use synthetic/anonymized mock data for all testing and public demos.
3. **Department Isolation**:
   - Enforce server-side role validation (`@PreAuthorize`) and department data boundary checks across all controllers.
