package edu.ciet.erp.controller;

import edu.ciet.erp.model.*;
import edu.ciet.erp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_Director')")
public class AdminController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SemesterResultRepository semesterResultRepository;
    private final OTPRecordRepository otpRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final DepartmentRepository departmentRepository;
    private final NotificationRepository notificationRepository;

    private final EducationBackgroundRepository educationBackgroundRepository;
    private final CertificationRepository certificationRepository;
    private final ProjectRepository projectRepository;
    private final InternshipRepository internshipRepository;
    private final ResearchRepository researchRepository;
    private final EventRepository eventRepository;
    private final CourseRepository courseRepository;
    private final SkillRepository skillRepository;

    @GetMapping("/otp-records")
    public ResponseEntity<?> getAllOtpRecords() {
        List<OTPRecord> records = otpRecordRepository.findAll();
        records.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        
        List<Map<String, Object>> response = new ArrayList<>();
        for (OTPRecord r : records) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("otpCode", r.getOtpCode());
            map.put("purpose", r.getPurpose());
            map.put("expiresAt", r.getExpiresAt().toString());
            map.put("createdAt", r.getCreatedAt().toString());
            map.put("isUsed", r.isUsed());
            map.put("attemptCount", r.getAttemptCount());
            
            userRepository.findById(r.getUserId()).ifPresentOrElse(
                u -> map.put("targetEmail", u.getEmail()),
                () -> map.put("targetEmail", "Unknown User (" + r.getUserId() + ")")
            );
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam(value = "q", defaultValue = "") String query) {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();
        
        for (User u : users) {
            if (!query.isBlank()) {
                boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(query.toLowerCase());
                boolean nameMatch = u.getFullName() != null && u.getFullName().toLowerCase().contains(query.toLowerCase());
                if (!emailMatch && !nameMatch) {
                    continue;
                }
            }
            
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("email", u.getEmail());
            map.put("fullName", u.getFullName());
            map.put("phone", u.getPhone());
            map.put("role", u.getRole().name());
            map.put("isActive", u.isActive());
            map.put("lastLoginIp", u.getLastLoginIp());
            map.put("lastLogin", u.getLastLogin() != null ? u.getLastLogin().toString() : null);
            map.put("createdAt", u.getCreatedAt().toString());
            map.put("departmentIds", u.getDepartmentIds());
            
            if (u.getRole() == Role.Student) {
                studentProfileRepository.findByUserId(u.getId())
                        .ifPresent(p -> {
                            map.put("rollNo", p.getRollNo());
                            map.put("cgpa", p.getCgpa());
                            map.put("batch", p.getBatch());
                            map.put("sectionId", p.getSectionId());
                            if (p.getDepartmentId() != null) {
                                map.put("departmentIds", List.of(p.getDepartmentId().toUpperCase()));
                            }
                        });
            }
            response.add(map);
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/users/{id}/toggle-active")
    public ResponseEntity<?> toggleUserActive(@PathVariable("id") String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setActive(!user.isActive());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "User status updated successfully", "isActive", user.isActive()));
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String fullName = body.get("fullName");
        String phone = body.get("phone");
        String roleStr = body.get("role");
        String deptCode = body.get("department_code");
        String rollNo = body.get("roll_no");   // explicit register number from admin form

        if (email == null || roleStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and Role are required fields"));
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "A user with this email already exists"));
        }

        Role role;
        try {
            role = Role.valueOf(roleStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role value: " + roleStr));
        }

        // For students, roll number is mandatory
        if (role == Role.Student) {
            if (rollNo == null || rollNo.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Register Number is required for student accounts"));
            }
            rollNo = rollNo.trim().toUpperCase();
            if (studentProfileRepository.existsByRollNoIgnoreCase(rollNo)) {
                return ResponseEntity.badRequest().body(Map.of("error", "A student with Register Number " + rollNo + " already exists"));
            }
        }

        // Password: for students default = roll number; for others admin must supply one
        String rawPassword = body.get("password");
        if (role == Role.Student) {
            // Use roll number as default password (can be overridden if admin supplies one)
            rawPassword = (rawPassword != null && !rawPassword.isBlank()) ? rawPassword : rollNo;
        } else {
            if (rawPassword == null || rawPassword.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required for non-student accounts"));
            }
        }

        List<String> departmentIds = new ArrayList<>();
        if (deptCode != null && !deptCode.isEmpty()) {
            if ((role == Role.Faculty || role == Role.Mentor) &&
                (deptCode.equalsIgnoreCase("AI") || deptCode.equalsIgnoreCase("AIML"))) {
                departmentIds.add("AI");
                departmentIds.add("AIML");
            } else {
                departmentIds.add(deptCode.toUpperCase());
            }
        }

        User user = User.builder()
                .email(email.toLowerCase())
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .phone(phone)
                .role(role)
                .departmentIds(departmentIds)
                .isActive(true)
                .build();
        User savedUser = userRepository.save(user);

        if (role == Role.Student) {
            String batch = body.getOrDefault("batch", "2024-2028");
            String sectionId = body.get("sectionId");
            double cgpa = 0.0;
            try { cgpa = Double.parseDouble(body.getOrDefault("cgpa", "0.0")); } catch (Exception ignored) {}

            StudentProfile profile = StudentProfile.builder()
                    .userId(savedUser.getId())
                    .rollNo(rollNo)
                    .departmentId(deptCode != null ? deptCode.toUpperCase() : "")
                    .batch(batch)
                    .sectionId(sectionId)
                    .cgpa(cgpa)
                    .slug(rollNo.toLowerCase())
                    .personalPhone(phone)
                    .build();
            studentProfileRepository.save(profile);
        }

        log.info("Admin created user: {} (role: {})", email, role);
        return ResponseEntity.ok(Map.of(
            "message", "User created successfully",
            "userId", savedUser.getId(),
            "defaultPassword", role == Role.Student ? rollNo : "(admin-defined)"
        ));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable("id") String id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String email = body.get("email");
        String fullName = body.get("fullName");
        String phone = body.get("phone");
        String roleStr = body.get("role");
        String deptCode = body.get("department_code");

        if (email != null && !email.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(email)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is already taken"));
            }
            user.setEmail(email.toLowerCase());
        }

        if (fullName != null) user.setFullName(fullName);
        if (phone != null) user.setPhone(phone);
        if (roleStr != null) {
            try {
                user.setRole(Role.valueOf(roleStr));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
            }
        }

        if (deptCode != null) {
            List<String> departmentIds = new ArrayList<>();
            if ((user.getRole() == Role.Faculty || user.getRole() == Role.Mentor) &&
                (deptCode.equalsIgnoreCase("AI") || deptCode.equalsIgnoreCase("AIML"))) {
                departmentIds.add("AI");
                departmentIds.add("AIML");
            } else {
                departmentIds.add(deptCode.toUpperCase());
            }
            user.setDepartmentIds(departmentIds);
        }

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Update student profile if student
        if (user.getRole() == Role.Student) {
            studentProfileRepository.findByUserId(user.getId()).ifPresent(p -> {
                if (deptCode != null) {
                    p.setDepartmentId(deptCode.toUpperCase());
                }
                if (body.containsKey("cgpa")) {
                    try {
                        p.setCgpa(Double.parseDouble(body.get("cgpa")));
                    } catch (Exception e) {}
                }
                if (body.containsKey("batch")) {
                    p.setBatch(body.get("batch"));
                }
                if (body.containsKey("sectionId")) {
                    p.setSectionId(body.get("sectionId"));
                }
                studentProfileRepository.save(p);
            });
        }

        return ResponseEntity.ok(Map.of("message", "User updated successfully"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable("id") String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.Student) {
            studentProfileRepository.findByUserId(user.getId()).ifPresent(studentProfileRepository::delete);
        }

        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    @GetMapping("/diagnostics")
    public ResponseEntity<?> getDiagnostics() {
        Map<String, Object> diagnostics = new HashMap<>();
        
        // 1. Database Ping
        long dbStart = System.currentTimeMillis();
        long userCount = 0;
        boolean dbOk = false;
        try {
            userCount = userRepository.count();
            dbOk = true;
        } catch (Exception e) {
            log.error("Database connection failure in diagnostics: {}", e.getMessage());
        }
        long dbLatency = System.currentTimeMillis() - dbStart;
        
        // 2. SMTP Health
        boolean smtpOk = false;
        try {
            if (mailSender instanceof JavaMailSenderImpl) {
                JavaMailSenderImpl impl = (JavaMailSenderImpl) mailSender;
                impl.testConnection();
                smtpOk = true;
            }
        } catch (Exception e) {
            log.warn("SMTP server diagnostics check failed: {}", e.getMessage());
        }
        
        diagnostics.put("status", dbOk ? "UP" : "DOWN");
        diagnostics.put("dbConnected", dbOk);
        diagnostics.put("dbLatencyMs", dbLatency);
        diagnostics.put("smtpOk", smtpOk);
        diagnostics.put("totalUsers", userCount);
        diagnostics.put("activeSessions", Math.max(1, userCount / 4)); // Mock session load metric
        diagnostics.put("timestamp", LocalDateTime.now().toString());
        
        return ResponseEntity.ok(diagnostics);
    }

    @PostMapping("/bulk-upload/users")
    public ResponseEntity<?> uploadUsersExcel(@RequestParam("file") MultipartFile file) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();
        
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {
             
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Excel file has no header row"));
            }
            
            // Map header positions
            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    String headerName = cell.toString().trim().replace("_", "").toLowerCase();
                    headerMap.put(headerName, i);
                }
            }
            
            Integer nameIdx = headerMap.get("fullname");
            Integer emailIdx = headerMap.get("email");
            Integer phoneIdx = headerMap.get("phone");
            Integer roleIdx = headerMap.get("role");
            Integer passwordIdx = headerMap.get("password");
            Integer deptIdx = headerMap.containsKey("department") ? headerMap.get("department") : headerMap.get("departmentcode");
            
            if (emailIdx == null || roleIdx == null || passwordIdx == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required Excel headers (email, role, password)"));
            }
            
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;
                
                String email = getCellValueAsString(row.getCell(emailIdx)).trim().toLowerCase();
                String roleStr = getCellValueAsString(row.getCell(roleIdx)).trim();
                String password = getCellValueAsString(row.getCell(passwordIdx)).trim();
                String fullName = nameIdx != null ? getCellValueAsString(row.getCell(nameIdx)).trim() : "";
                String phone = phoneIdx != null ? getCellValueAsString(row.getCell(phoneIdx)).trim() : "";
                String deptCode = deptIdx != null ? getCellValueAsString(row.getCell(deptIdx)).trim() : "";
                
                if (email.isEmpty() || roleStr.isEmpty() || password.isEmpty()) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Email, Role, and Password are required fields");
                    continue;
                }
                
                Role role;
                try {
                    role = Role.valueOf(roleStr);
                } catch (IllegalArgumentException e) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Invalid role value '" + roleStr + "'");
                    continue;
                }
                
                if (userRepository.existsByEmailIgnoreCase(email)) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Account with email '" + email + "' already exists");
                    continue;
                }
                
                // Legacy AI / AIML Department Mapping Logic
                List<String> departmentIds = new ArrayList<>();
                if (!deptCode.isEmpty()) {
                    if ((role == Role.Faculty || role == Role.Mentor) && 
                        (deptCode.equalsIgnoreCase("AI") || deptCode.equalsIgnoreCase("AIML"))) {
                        departmentIds.add("AI");
                        departmentIds.add("AIML");
                    } else {
                        departmentIds.add(deptCode.toUpperCase());
                    }
                }
                
                User user = User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(password))
                        .fullName(fullName)
                        .phone(phone)
                        .role(role)
                        .departmentIds(departmentIds)
                        .isActive(true)
                        .build();
                userRepository.save(user);
                created++;
            }
            
        } catch (Exception e) {
            log.error("Excel import failed: ", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse workbook: " + e.getMessage()));
        }
        
        return ResponseEntity.ok(Map.of("created", created, "skipped", skipped, "errors", errors));
    }

    @PostMapping("/bulk-upload/students")
    public ResponseEntity<?> uploadStudentsExcel(@RequestParam("file") MultipartFile file) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();
        
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {
             
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Excel file has no header row"));
            }
            
            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    String headerName = cell.toString().trim().replace("_", "").toLowerCase();
                    headerMap.put(headerName, i);
                }
            }
            
            Integer nameIdx = headerMap.get("fullname");
            Integer emailIdx = headerMap.get("email");
            Integer phoneIdx = headerMap.get("phone");
            Integer rollIdx = headerMap.get("rollno");
            Integer batchIdx = headerMap.get("batch");
            Integer passwordIdx = headerMap.get("password");
            Integer deptIdx = headerMap.containsKey("department") ? headerMap.get("department") : headerMap.get("departmentcode");
            Integer cgpaIdx = headerMap.get("cgpa");
            Integer secIdx = headerMap.containsKey("sectionid") ? headerMap.get("sectionid") : headerMap.get("section");
            
            if (emailIdx == null || rollIdx == null || batchIdx == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required student headers (email, rollNo, batch)"));
            }
            
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;
                
                String email = getCellValueAsString(row.getCell(emailIdx)).trim().toLowerCase();
                String rollNo = getCellValueAsString(row.getCell(rollIdx)).trim().toUpperCase();
                String batch = getCellValueAsString(row.getCell(batchIdx)).trim();
                
                String password = "";
                if (passwordIdx != null) {
                    password = getCellValueAsString(row.getCell(passwordIdx)).trim();
                }
                if (password.isEmpty()) {
                    password = rollNo; // default password to Roll Number
                }
                
                String fullName = nameIdx != null ? getCellValueAsString(row.getCell(nameIdx)).trim() : "";
                String phone = phoneIdx != null ? getCellValueAsString(row.getCell(phoneIdx)).trim() : "";
                String deptCode = deptIdx != null ? getCellValueAsString(row.getCell(deptIdx)).trim().toUpperCase() : "";
                String section = secIdx != null ? getCellValueAsString(row.getCell(secIdx)).trim() : "";
                
                double cgpa = 0.0;
                if (cgpaIdx != null) {
                    String cgpaStr = getCellValueAsString(row.getCell(cgpaIdx)).trim();
                    if (!cgpaStr.isEmpty()) {
                        try {
                            cgpa = Double.parseDouble(cgpaStr);
                        } catch (NumberFormatException e) {
                            // ignore or log
                        }
                    }
                }
                
                if (email.isEmpty() || rollNo.isEmpty() || batch.isEmpty()) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Student missing required field values");
                    continue;
                }
                
                if (userRepository.existsByEmailIgnoreCase(email)) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Email ID '" + email + "' already registered");
                    continue;
                }
                
                if (studentProfileRepository.existsByRollNoIgnoreCase(rollNo)) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Student Roll Number '" + rollNo + "' already exists");
                    continue;
                }
                
                User user = User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(password))
                        .fullName(fullName)
                        .phone(phone)
                        .role(Role.Student)
                        .isActive(true)
                        .build();
                User savedUser = userRepository.save(user);
                
                StudentProfile profile = StudentProfile.builder()
                        .userId(savedUser.getId())
                        .rollNo(rollNo)
                        .batch(batch)
                        .departmentId(deptCode)
                        .sectionId(section)
                        .cgpa(cgpa)
                        .slug(rollNo.toLowerCase())
                        .build();
                studentProfileRepository.save(profile);
                
                created++;
            }
            
        } catch (Exception e) {
            log.error("Excel student import failed: ", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse students sheet: " + e.getMessage()));
        }
        
        return ResponseEntity.ok(Map.of("created", created, "skipped", skipped, "errors", errors));
    }

    @PostMapping("/bulk-upload/results")
    public ResponseEntity<?> uploadResultsExcel(@RequestParam("file") MultipartFile file) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();
        
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {
             
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Excel file has no header row"));
            }
            
            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    headerMap.put(cell.toString().trim().toLowerCase(), i);
                }
            }
            
            Integer rollIdx = headerMap.get("roll_no");
            Integer semIdx = headerMap.get("semester");
            Integer examIdx = headerMap.get("exam_name");
            Integer codeIdx = headerMap.get("subject_code");
            Integer nameIdx = headerMap.get("subject_name");
            Integer scoreIdx = headerMap.get("score");
            Integer maxIdx = headerMap.get("max_score");
            Integer gradeIdx = headerMap.get("grade");
            
            if (rollIdx == null || semIdx == null || examIdx == null || codeIdx == null || 
                nameIdx == null || scoreIdx == null || maxIdx == null || gradeIdx == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required semester result headers"));
            }
            
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;
                
                String rollNo = getCellValueAsString(row.getCell(rollIdx)).trim().toUpperCase();
                String semester = getCellValueAsString(row.getCell(semIdx)).trim();
                String examName = getCellValueAsString(row.getCell(examIdx)).trim();
                String subjectCode = getCellValueAsString(row.getCell(codeIdx)).trim().toUpperCase();
                String subjectName = getCellValueAsString(row.getCell(nameIdx)).trim();
                String scoreStr = getCellValueAsString(row.getCell(scoreIdx)).trim();
                String maxStr = getCellValueAsString(row.getCell(maxIdx)).trim();
                String grade = getCellValueAsString(row.getCell(gradeIdx)).trim().toUpperCase();
                
                if (rollNo.isEmpty() || semester.isEmpty() || subjectCode.isEmpty() || scoreStr.isEmpty()) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Result missing required fields");
                    continue;
                }
                
                double score = 0;
                double maxScore = 100;
                try {
                    score = Double.parseDouble(scoreStr);
                    maxScore = Double.parseDouble(maxStr);
                } catch (NumberFormatException e) {
                    skipped++;
                    errors.add("Row " + (r + 1) + ": Invalid numeric scores");
                    continue;
                }
                
                SemesterResult result = SemesterResult.builder()
                        .rollNo(rollNo)
                        .semester(semester)
                        .examName(examName)
                        .subjectCode(subjectCode)
                        .subjectName(subjectName)
                        .score(score)
                        .maxScore(maxScore)
                        .grade(grade)
                        .build();
                semesterResultRepository.save(result);
                created++;
            }
            
        } catch (Exception e) {
            log.error("Excel results import failed: ", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse results sheet: " + e.getMessage()));
        }
        
        return ResponseEntity.ok(Map.of("created", created, "skipped", skipped, "errors", errors));
    }

    @GetMapping("/results")
    public ResponseEntity<?> getResults() {
        List<SemesterResult> results = semesterResultRepository.findAll();
        results.sort((a, b) -> {
            int comp = a.getRollNo().compareToIgnoreCase(b.getRollNo());
            if (comp != 0) return comp;
            return a.getSemester().compareToIgnoreCase(b.getSemester());
        });
        return ResponseEntity.ok(results);
    }

    @PostMapping("/results")
    public ResponseEntity<?> createResult(@RequestBody SemesterResult result) {
        if (result.getRollNo() == null || result.getSubjectCode() == null || result.getSemester() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Roll Number, Subject Code, and Semester are required"));
        }
        result.setRollNo(result.getRollNo().toUpperCase());
        result.setSubjectCode(result.getSubjectCode().toUpperCase());
        SemesterResult saved = semesterResultRepository.save(result);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/results/{id}")
    public ResponseEntity<?> updateResult(@PathVariable("id") String id, @RequestBody SemesterResult resultData) {
        SemesterResult result = semesterResultRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Result not found"));
        
        if (resultData.getRollNo() != null) result.setRollNo(resultData.getRollNo().toUpperCase());
        if (resultData.getSemester() != null) result.setSemester(resultData.getSemester());
        if (resultData.getExamName() != null) result.setExamName(resultData.getExamName());
        if (resultData.getSubjectCode() != null) result.setSubjectCode(resultData.getSubjectCode().toUpperCase());
        if (resultData.getSubjectName() != null) result.setSubjectName(resultData.getSubjectName());
        result.setScore(resultData.getScore());
        result.setMaxScore(resultData.getMaxScore());
        if (resultData.getGrade() != null) result.setGrade(resultData.getGrade());
        
        SemesterResult saved = semesterResultRepository.save(result);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/results/{id}")
    public ResponseEntity<?> deleteResult(@PathVariable("id") String id) {
        semesterResultRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Result deleted successfully"));
    }


    // ─────────────────────────────────────────────────────────────────────────
    //  PRE-PARSED JSON INGEST ENDPOINTS
    //  Called by the frontend staging grid "Commit to Database" button.
    //  The client sends a JSON array of row objects (already validated client-side).
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/ingest/students")
    public ResponseEntity<?> ingestStudents(@RequestBody List<Map<String, Object>> rows) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            int rowLabel = i + 1;

            String email    = getString(row, "email");
            String rollNo   = getString(row, "rollNo");
            String batch    = getString(row, "batch");
            String fullName = getString(row, "fullName");
            String phone    = getString(row, "phone");
            String deptCode = getString(row, "department");
            String section  = getString(row, "sectionId");
            String password = getString(row, "password");
            double cgpa     = getDouble(row, "cgpa");

            if (email.isEmpty() || rollNo.isEmpty() || batch.isEmpty()) {
                skipped++;
                errors.add("Row " + rowLabel + ": email, rollNo, and batch are required");
                continue;
            }

            rollNo = rollNo.toUpperCase();
            if (password.isEmpty()) password = rollNo; // default password = roll number

            if (userRepository.existsByEmailIgnoreCase(email)) {
                skipped++;
                errors.add("Row " + rowLabel + ": email '" + email + "' already registered");
                continue;
            }
            if (studentProfileRepository.existsByRollNoIgnoreCase(rollNo)) {
                skipped++;
                errors.add("Row " + rowLabel + ": roll number '" + rollNo + "' already exists");
                continue;
            }

            User user = User.builder()
                    .email(email.toLowerCase())
                    .passwordHash(passwordEncoder.encode(password))
                    .fullName(fullName)
                    .phone(phone)
                    .role(Role.Student)
                    .isActive(true)
                    .build();
            User saved = userRepository.save(user);

            StudentProfile profile = StudentProfile.builder()
                    .userId(saved.getId())
                    .rollNo(rollNo)
                    .batch(batch)
                    .departmentId(deptCode.isEmpty() ? "" : deptCode.toUpperCase())
                    .sectionId(section)
                    .cgpa(cgpa)
                    .slug(rollNo.toLowerCase())
                    .personalPhone(phone)
                    .build();
            studentProfileRepository.save(profile);
            created++;
        }

        log.info("Ingest /students: created={}, skipped={}", created, skipped);
        return ResponseEntity.ok(Map.of("processed", created, "skipped", skipped, "errors", errors));
    }

    @PostMapping("/ingest/users")
    public ResponseEntity<?> ingestUsers(@RequestBody List<Map<String, Object>> rows) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            int rowLabel = i + 1;

            String email    = getString(row, "email");
            String roleStr  = getString(row, "role");
            String password = getString(row, "password");
            String fullName = getString(row, "fullName");
            String phone    = getString(row, "phone");
            String deptCode = getString(row, "department");

            if (email.isEmpty() || roleStr.isEmpty() || password.isEmpty()) {
                skipped++;
                errors.add("Row " + rowLabel + ": email, role, and password are required");
                continue;
            }

            Role role;
            try { role = Role.valueOf(roleStr); }
            catch (IllegalArgumentException e) {
                skipped++;
                errors.add("Row " + rowLabel + ": invalid role '" + roleStr + "'");
                continue;
            }

            if (userRepository.existsByEmailIgnoreCase(email)) {
                skipped++;
                errors.add("Row " + rowLabel + ": email '" + email + "' already registered");
                continue;
            }

            List<String> deptIds = new ArrayList<>();
            if (!deptCode.isEmpty()) {
                if ((role == Role.Faculty || role == Role.Mentor) &&
                        (deptCode.equalsIgnoreCase("AI") || deptCode.equalsIgnoreCase("AIML"))) {
                    deptIds.add("AI"); deptIds.add("AIML");
                } else {
                    deptIds.add(deptCode.toUpperCase());
                }
            }

            User user = User.builder()
                    .email(email.toLowerCase())
                    .passwordHash(passwordEncoder.encode(password))
                    .fullName(fullName)
                    .phone(phone)
                    .role(role)
                    .departmentIds(deptIds)
                    .isActive(true)
                    .build();
            userRepository.save(user);
            created++;
        }

        log.info("Ingest /users: created={}, skipped={}", created, skipped);
        return ResponseEntity.ok(Map.of("processed", created, "skipped", skipped, "errors", errors));
    }

    @PostMapping("/ingest/results")
    public ResponseEntity<?> ingestResults(@RequestBody List<Map<String, Object>> rows) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            int rowLabel = i + 1;

            // Accept both camelCase (from frontend template) and snake_case (legacy)
            String rollNo      = getString(row, "rollNo").isEmpty() ? getString(row, "roll_no") : getString(row, "rollNo");
            String semester    = getString(row, "semester");
            String examName    = getString(row, "examName").isEmpty() ? getString(row, "exam_name") : getString(row, "examName");
            String subjectCode = getString(row, "subjectCode").isEmpty() ? getString(row, "subject_code") : getString(row, "subjectCode");
            String subjectName = getString(row, "subjectName").isEmpty() ? getString(row, "subject_name") : getString(row, "subjectName");
            String grade       = getString(row, "grade");
            double score       = getDouble(row, "score");
            double maxScore    = getDouble(row, "maxScore") == 0 ? getDouble(row, "max_score") : getDouble(row, "maxScore");
            if (maxScore == 0) maxScore = 100;

            if (rollNo.isEmpty() || semester.isEmpty() || subjectCode.isEmpty()) {
                skipped++;
                errors.add("Row " + rowLabel + ": rollNo, semester, and subjectCode are required");
                continue;
            }

            SemesterResult result = SemesterResult.builder()
                    .rollNo(rollNo.toUpperCase())
                    .semester(semester)
                    .examName(examName)
                    .subjectCode(subjectCode.toUpperCase())
                    .subjectName(subjectName)
                    .score(score)
                    .maxScore(maxScore)
                    .grade(grade.isEmpty() ? "" : grade.toUpperCase())
                    .build();
            semesterResultRepository.save(result);
            created++;
        }

        log.info("Ingest /results: created={}, skipped={}", created, skipped);
        return ResponseEntity.ok(Map.of("processed", created, "skipped", skipped, "errors", errors));
    }

    // Helper: safely read a String value from a loosely-typed JSON map
    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val == null ? "" : val.toString().trim();
    }

    // Helper: safely read a double value from a loosely-typed JSON map
    private double getDouble(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return 0.0;
        try { return Double.parseDouble(val.toString().trim()); }
        catch (NumberFormatException e) { return 0.0; }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.NUMERIC) {
            double numericVal = cell.getNumericCellValue();
            if (numericVal == (long) numericVal) {
                return String.valueOf((long) numericVal);
            }
            return String.valueOf(numericVal);
        }
        return cell.toString();
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !cell.toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    @GetMapping("/students/{userId}/dashboard")
    public ResponseEntity<?> getStudentDashboardForAdmin(@PathVariable("userId") String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        
        Map<String, Object> data = new HashMap<>();
        data.put("user", user);
        
        StudentProfile profile = null;
        String rollNo = null;
        if (profileOpt.isPresent()) {
            profile = profileOpt.get();
            rollNo = profile.getRollNo();
        } else {
            rollNo = user.getEmail().split("@")[0].toUpperCase();
            Optional<StudentProfile> profByRoll = studentProfileRepository.findByRollNoIgnoreCase(rollNo);
            if (profByRoll.isPresent()) {
                profile = profByRoll.get();
            }
        }
        
        if (profile != null) {
            data.put("profile", profile);
            List<SemesterResult> results = semesterResultRepository.findAllByRollNoIgnoreCase(rollNo);
            data.put("results", results);
            
            List<EducationBackground> education = educationBackgroundRepository.findAllByRollNoIgnoreCase(rollNo);
            List<Certification> certifications = certificationRepository.findAllByRollNoIgnoreCase(rollNo);
            List<Project> projects = projectRepository.findAllByRollNoIgnoreCase(rollNo);
            List<Internship> internships = internshipRepository.findAllByRollNoIgnoreCase(rollNo);
            List<Research> research = researchRepository.findAllByRollNoIgnoreCase(rollNo);
            List<Event> events = eventRepository.findAllByRollNoIgnoreCase(rollNo);
            List<Course> courses = courseRepository.findAllByRollNoIgnoreCase(rollNo);
            
            data.put("education", education);
            data.put("certifications", certifications);
            data.put("projects", projects);
            data.put("internships", internships);
            data.put("research", research);
            data.put("events", events);
            data.put("courses", courses);

            List<Skill> skills = skillRepository.findAllByRollNoIgnoreCase(rollNo);
            data.put("skills", skills);
        }
        
        return ResponseEntity.ok(data);
    }

    @GetMapping("/certifications")
    public ResponseEntity<?> getAllCertifications() {
        List<Certification> certifications = certificationRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();
        
        for (Certification c : certifications) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("rollNo", c.getRollNo());
            map.put("title", c.getTitle());
            map.put("issuer", c.getIssuer());
            map.put("issuedDate", c.getIssuedDate());
            map.put("certUrl", c.getCertUrl());
            map.put("fileUrl", c.getFileUrl());
            map.put("description", c.getDescription());
            map.put("isVerified", c.isVerified());
            map.put("isFeatured", c.isFeatured());
            map.put("certType", c.getCertType());
            map.put("rejectionReason", c.getRejectionReason());
            map.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
            map.put("updatedAt", c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : null);
            
            // Fetch student profile and user details
            Optional<StudentProfile> profileOpt = studentProfileRepository.findByRollNoIgnoreCase(c.getRollNo());
            if (profileOpt.isPresent()) {
                StudentProfile profile = profileOpt.get();
                map.put("studentDepartment", profile.getDepartmentId() != null ? profile.getDepartmentId().toUpperCase() : "");
                map.put("studentBatch", profile.getBatch());
                
                Optional<User> studentUserOpt = userRepository.findById(profile.getUserId());
                if (studentUserOpt.isPresent()) {
                    map.put("studentName", studentUserOpt.get().getFullName());
                } else {
                    map.put("studentName", "Unknown (" + c.getRollNo() + ")");
                }
            } else {
                map.put("studentDepartment", "UNKNOWN");
                map.put("studentName", "Unknown (" + c.getRollNo() + ")");
            }
            
            response.add(map);
        }
        
        // Sort certifications by createdAt desc
        response.sort((a, b) -> {
            String ca = (String) a.get("createdAt");
            String cb = (String) b.get("createdAt");
            if (ca == null) return 1;
            if (cb == null) return -1;
            return cb.compareTo(ca);
        });
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/certifications/{id}/verify")
    public ResponseEntity<?> verifyCertification(@PathVariable("id") String id) {
        Optional<Certification> opt = certificationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Certification not found"));
        }
        Certification cert = opt.get();
        cert.setVerified(true);
        cert.setRejectionReason(null);
        cert.setVerifiedAt(LocalDateTime.now());
        cert.setUpdatedAt(LocalDateTime.now());
        certificationRepository.save(cert);
        return ResponseEntity.ok(Map.of("message", "Certification verified successfully", "isVerified", true));
    }

    @PostMapping("/certifications/{id}/reject")
    public ResponseEntity<?> rejectCertification(@PathVariable("id") String id, @RequestBody Map<String, String> body) {
        Optional<Certification> opt = certificationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Certification not found"));
        }
        String reason = body.getOrDefault("reason", "Rejected by administrator");
        Certification cert = opt.get();
        cert.setVerified(false);
        cert.setRejectionReason(reason);
        cert.setUpdatedAt(LocalDateTime.now());
        certificationRepository.save(cert);
        return ResponseEntity.ok(Map.of("message", "Certification rejected successfully", "isVerified", false));
    }

    @GetMapping("/departments")
    public ResponseEntity<?> getAllDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @PostMapping("/departments")
    public ResponseEntity<?> saveDepartment(@RequestBody Department dept) {
        if (dept.getCode() == null || dept.getCode().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Department code is required"));
        }
        String code = dept.getCode().trim().toUpperCase();
        Optional<Department> existingOpt = departmentRepository.findByCodeIgnoreCase(code);
        Department target;
        if (existingOpt.isPresent()) {
            target = existingOpt.get();
            target.setName(dept.getName());
            target.setSections(dept.getSections());
            target.setUpdatedAt(LocalDateTime.now());
        } else {
            target = Department.builder()
                    .code(code)
                    .name(dept.getName())
                    .sections(dept.getSections())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
        }
        departmentRepository.save(target);
        return ResponseEntity.ok(target);
    }

    @DeleteMapping("/departments/{code}")
    public ResponseEntity<?> deleteDepartment(@PathVariable String code) {
        Optional<Department> existingOpt = departmentRepository.findByCodeIgnoreCase(code.trim());
        if (existingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Department not found"));
        }
        departmentRepository.delete(existingOpt.get());
        return ResponseEntity.ok(Map.of("message", "Department deleted successfully"));
    }

    @PostMapping("/notification")
    public ResponseEntity<?> sendManualNotification(@RequestBody Map<String, String> body) {
        String targetRollNo = body.get("rollNo");
        String title = body.get("title");
        String message = body.get("message");
        String type = body.get("type");

        if (title == null || title.isBlank() || message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title and message are required"));
        }

        if ("ALL".equalsIgnoreCase(targetRollNo) || targetRollNo == null || targetRollNo.isBlank()) {
            List<StudentProfile> profiles = studentProfileRepository.findAll();
            for (StudentProfile p : profiles) {
                Notification notif = Notification.builder()
                        .rollNo(p.getRollNo())
                        .title(title)
                        .message(message)
                        .type(type != null ? type : "SYSTEM")
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }
            List<User> staffUsers = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.HOD || u.getRole() == Role.Faculty || u.getRole() == Role.Mentor)
                    .toList();
            for (User u : staffUsers) {
                Notification notif = Notification.builder()
                        .rollNo(u.getEmail())
                        .title(title)
                        .message(message)
                        .type(type != null ? type : "SYSTEM")
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }
        } else {
            Optional<StudentProfile> profileOpt = studentProfileRepository.findByRollNoIgnoreCase(targetRollNo.trim());
            String targetId = null;
            if (profileOpt.isPresent()) {
                targetId = profileOpt.get().getRollNo();
            } else {
                Optional<User> userOpt = userRepository.findByEmailIgnoreCase(targetRollNo.trim());
                if (userOpt.isPresent()) {
                    targetId = userOpt.get().getEmail();
                } else {
                    // Try by user ID (24-char hex or standard ID)
                    try {
                        Optional<User> uOpt = userRepository.findById(targetRollNo.trim());
                        if (uOpt.isPresent()) {
                            User u = uOpt.get();
                            if (u.getRole() == Role.Student) {
                                Optional<StudentProfile> sp = studentProfileRepository.findByUserId(u.getId());
                                if (sp.isPresent()) {
                                    targetId = sp.get().getRollNo();
                                }
                            } else {
                                targetId = u.getEmail();
                            }
                        }
                    } catch (Exception e) {
                        // ignore malformed ID formats
                    }
                }
            }
            if (targetId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Student Roll No or Staff Email " + targetRollNo + " not found"));
            }
            Notification notif = Notification.builder()
                    .rollNo(targetId)
                    .title(title)
                    .message(message)
                    .type(type != null ? type : "SYSTEM")
                    .read(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notif);
        }
        return ResponseEntity.ok(Map.of("message", "Notification broadcast successfully"));
    }
}
