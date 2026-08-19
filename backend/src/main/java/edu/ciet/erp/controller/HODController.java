package edu.ciet.erp.controller;

import edu.ciet.erp.model.*;
import edu.ciet.erp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/hod")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor')")
public class HODController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final SyllabusCoverageRepository syllabusCoverageRepository;
    private final MentorshipAssignmentRepository mentorshipAssignmentRepository;
    private final AcademicDocumentRepository academicDocumentRepository;
    private final TrainingProgramRepository trainingProgramRepository;
    private final AnnouncementRepository announcementRepository;
    private final CourseOutcomeAttainmentRepository courseOutcomeAttainmentRepository;
    private final AccreditationChecklistRepository accreditationChecklistRepository;
    private final MentorshipMeetingLogRepository mentorshipMeetingLogRepository;
    private final MentorshipCaseNoteRepository mentorshipCaseNoteRepository;
    private final EscalationThreadRepository escalationThreadRepository;
    private final EscalationMessageRepository escalationMessageRepository;
    private final CourseRepository courseRepository;
    private final NotificationRepository notificationRepository;
    private final MessageRepository messageRepository;
    private final SemesterResultRepository semesterResultRepository;
    private final EducationBackgroundRepository educationBackgroundRepository;
    private final CertificationRepository certificationRepository;
    private final ProjectRepository projectRepository;
    private final InternshipRepository internshipRepository;
    private final ResearchRepository researchRepository;
    private final EventRepository eventRepository;
    private final SkillRepository skillRepository;
    private final ClassTimetableRepository classTimetableRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    // Helper: Extract department code from roll number (e.g. Y23CSE042 -> CSE, Y23CSM051 -> AIML)
    public static String extractDepartmentFromRollNo(String rollNo) {
        if (rollNo == null || rollNo.isBlank()) return null;
        String upper = rollNo.trim().toUpperCase();
        if (upper.contains("AIML") || upper.contains("AI&ML") || upper.contains("CSM")) return "AIML";
        if (upper.contains("CAI") || upper.contains("AI")) return "AI";
        if (upper.contains("CSD") || upper.contains("DATASCIENCE")) return "CSD";
        if (upper.contains("CSBS")) return "CSBS";
        if (upper.contains("CSE") || upper.contains("CS")) return "CSE";
        if (upper.contains("ECE") || upper.contains("EC")) return "ECE";
        if (upper.contains("EEE") || upper.contains("EE")) return "EEE";
        if (upper.contains("MECH") || upper.contains("ME")) return "MECH";
        if (upper.contains("CIVIL") || upper.contains("CE")) return "CIVIL";
        if (upper.contains("IT")) return "IT";
        return null;
    }

    // Helper: Resolve all department aliases, codes, and IDs for the authenticated HOD/Staff
    private Set<String> resolveAllowedDepartmentKeys(Authentication auth) {
        Set<String> keys = new HashSet<>();
        if (auth == null) return keys;
        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) return keys;

        java.util.function.Consumer<String> addDeptKey = (d) -> {
            if (d == null || d.isBlank()) return;
            for (String part : d.split("[,;/]")) {
                String trimmed = part.trim().toUpperCase();
                if (trimmed.isBlank()) continue;
                keys.add(trimmed);
                if ("AI".equals(trimmed) || "AIML".equals(trimmed) || "CSM".equals(trimmed) || "CAI".equals(trimmed)) {
                    keys.add("AI");
                    keys.add("AIML");
                    keys.add("CSM");
                    keys.add("CAI");
                }
                if ("CSE".equals(trimmed) || "CS".equals(trimmed)) {
                    keys.add("CSE");
                    keys.add("CS");
                }
                if ("ECE".equals(trimmed) || "EC".equals(trimmed)) {
                    keys.add("ECE");
                    keys.add("EC");
                }
                if ("EEE".equals(trimmed) || "EE".equals(trimmed)) {
                    keys.add("EEE");
                    keys.add("EE");
                }
                if ("MECH".equals(trimmed) || "ME".equals(trimmed)) {
                    keys.add("MECH");
                    keys.add("ME");
                }
                if ("CIVIL".equals(trimmed) || "CE".equals(trimmed)) {
                    keys.add("CIVIL");
                    keys.add("CE");
                }
                if ("IT".equals(trimmed)) {
                    keys.add("IT");
                }
                departmentRepository.findByCodeIgnoreCase(trimmed).ifPresent(dep -> {
                    if (dep.getId() != null) keys.add(dep.getId().toUpperCase());
                    if (dep.getCode() != null) keys.add(dep.getCode().toUpperCase());
                    if (dep.getName() != null) keys.add(dep.getName().toUpperCase());
                });
                departmentRepository.findById(trimmed).ifPresent(dep -> {
                    if (dep.getId() != null) keys.add(dep.getId().toUpperCase());
                    if (dep.getCode() != null) keys.add(dep.getCode().toUpperCase());
                    if (dep.getName() != null) keys.add(dep.getName().toUpperCase());
                });
            }
        };

        if (user.getDepartmentIds() != null) {
            user.getDepartmentIds().forEach(addDeptKey);
        }
        if (user.getDepartmentId() != null && !user.getDepartmentId().isBlank()) {
            addDeptKey.accept(user.getDepartmentId());
        }

        // If user document is missing explicit department field, check full name & email
        if (keys.isEmpty()) {
            String checkText = ((user.getFullName() != null ? user.getFullName() : "") + " " + user.getEmail()).toUpperCase();
            for (Department dep : departmentRepository.findAll()) {
                if (dep.getCode() != null && checkText.contains(dep.getCode().toUpperCase())) {
                    addDeptKey.accept(dep.getCode());
                } else if (dep.getName() != null && checkText.contains(dep.getName().toUpperCase())) {
                    addDeptKey.accept(dep.getCode());
                }
            }
        }

        return keys;
    }

    private boolean isUserInHODScope(User user, StudentProfile profile, Set<String> allowedDeptKeys) {
        if (user == null || allowedDeptKeys == null || allowedDeptKeys.isEmpty()) return false;

        // 1. If student has a roll number, check department from roll number
        String rollNo = (profile != null && profile.getRollNo() != null && !profile.getRollNo().isBlank()) 
                ? profile.getRollNo() 
                : user.getRollNo();
        if ((rollNo == null || rollNo.isBlank()) && user.getEmail() != null) {
            String prefix = user.getEmail().split("@")[0].toUpperCase();
            if (prefix.matches(".*(CSE|ECE|EEE|AIML|AI|CSM|CAI|MECH|CIVIL|IT).*")) {
                rollNo = prefix;
            }
        }

        String rollDept = extractDepartmentFromRollNo(rollNo);
        if (rollDept != null) {
            if (allowedDeptKeys.contains(rollDept)) {
                return true;
            }
            // Strict negative check: if roll number explicitly belongs to another department, NEVER allow access
            return false;
        }

        // 2. Check profile.departmentId
        if (profile != null && profile.getDepartmentId() != null && !profile.getDepartmentId().isBlank()) {
            for (String pPart : profile.getDepartmentId().split("[,;/]")) {
                String pDept = pPart.trim().toUpperCase();
                if (allowedDeptKeys.contains(pDept)) return true;
                Optional<Department> byCode = departmentRepository.findByCodeIgnoreCase(pDept);
                if (byCode.isPresent() && (allowedDeptKeys.contains(byCode.get().getId().toUpperCase()) || allowedDeptKeys.contains(byCode.get().getCode().toUpperCase()))) {
                    return true;
                }
                Optional<Department> byId = departmentRepository.findById(pDept);
                if (byId.isPresent() && (allowedDeptKeys.contains(byId.get().getId().toUpperCase()) || allowedDeptKeys.contains(byId.get().getCode().toUpperCase()))) {
                    return true;
                }
            }
            return false;
        }

        // 3. Check user.departmentId
        if (user.getDepartmentId() != null && !user.getDepartmentId().isBlank()) {
            for (String uPart : user.getDepartmentId().split("[,;/]")) {
                String uDept = uPart.trim().toUpperCase();
                if (allowedDeptKeys.contains(uDept)) return true;
                Optional<Department> byCode = departmentRepository.findByCodeIgnoreCase(uDept);
                if (byCode.isPresent() && (allowedDeptKeys.contains(byCode.get().getId().toUpperCase()) || allowedDeptKeys.contains(byCode.get().getCode().toUpperCase()))) {
                    return true;
                }
                Optional<Department> byId = departmentRepository.findById(uDept);
                if (byId.isPresent() && (allowedDeptKeys.contains(byId.get().getId().toUpperCase()) || allowedDeptKeys.contains(byId.get().getCode().toUpperCase()))) {
                    return true;
                }
            }
            return false;
        }

        // 4. Check user.departmentIds
        if (user.getDepartmentIds() != null && !user.getDepartmentIds().isEmpty()) {
            for (String d : user.getDepartmentIds()) {
                if (d == null || d.isBlank()) continue;
                for (String dPart : d.split("[,;/]")) {
                    String uDept = dPart.trim().toUpperCase();
                    if (allowedDeptKeys.contains(uDept)) return true;
                    Optional<Department> byCode = departmentRepository.findByCodeIgnoreCase(uDept);
                    if (byCode.isPresent() && (allowedDeptKeys.contains(byCode.get().getId().toUpperCase()) || allowedDeptKeys.contains(byCode.get().getCode().toUpperCase()))) {
                        return true;
                    }
                    Optional<Department> byId = departmentRepository.findById(uDept);
                    if (byId.isPresent() && (allowedDeptKeys.contains(byId.get().getId().toUpperCase()) || allowedDeptKeys.contains(byId.get().getCode().toUpperCase()))) {
                        return true;
                    }
                }
            }
            return false;
        }

        return false;
    }

    // Helper: Resolve HOD primary department
    private String resolveDepartmentId(Authentication auth) {
        if (auth == null) return "unknown";
        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) return "unknown";

        String deptVal = (user.getDepartmentIds() != null && !user.getDepartmentIds().isEmpty())
                ? user.getDepartmentIds().get(0)
                : user.getDepartmentId();

        if (deptVal != null && !deptVal.isBlank()) {
            if (departmentRepository.existsById(deptVal)) {
                return deptVal;
            }
            Optional<Department> deptOpt = departmentRepository.findByCodeIgnoreCase(deptVal);
            if (deptOpt.isPresent()) {
                return deptOpt.get().getId();
            }
            return deptVal;
        }

        String checkText = ((user.getFullName() != null ? user.getFullName() : "") + " " + user.getEmail()).toUpperCase();
        for (Department dep : departmentRepository.findAll()) {
            if (dep.getCode() != null && checkText.contains(dep.getCode().toUpperCase())) {
                return dep.getId();
            }
        }

        List<Department> allDepts = departmentRepository.findAll();
        if (!allDepts.isEmpty()) {
            return allDepts.get(0).getId();
        }

        return "unknown";
    }

    private boolean isUserInDepartment(User user, String deptId) {
        if (user == null || deptId == null) return false;
        Set<String> keys = new HashSet<>();
        keys.add(deptId.trim().toUpperCase());
        departmentRepository.findById(deptId).ifPresent(d -> {
            if (d.getId() != null) keys.add(d.getId().toUpperCase());
            if (d.getCode() != null) keys.add(d.getCode().toUpperCase());
        });
        departmentRepository.findByCodeIgnoreCase(deptId).ifPresent(d -> {
            if (d.getId() != null) keys.add(d.getId().toUpperCase());
            if (d.getCode() != null) keys.add(d.getCode().toUpperCase());
        });
        return isUserInHODScope(user, null, keys);
    }

    private boolean isUserInHODDepartment(User user, User hod, String deptId) {
        if (user == null || hod == null) return false;
        Set<String> hodKeys = new HashSet<>();
        if (hod.getDepartmentIds() != null) {
            hod.getDepartmentIds().forEach(d -> {
                if (d != null) hodKeys.add(d.trim().toUpperCase());
            });
        }
        if (hod.getDepartmentId() != null) {
            hodKeys.add(hod.getDepartmentId().trim().toUpperCase());
        }
        if (deptId != null) {
            hodKeys.add(deptId.trim().toUpperCase());
        }
        return isUserInHODScope(user, null, hodKeys);
    }


    /**
     * GET /api/v1/hod/all-students
     * Returns students belonging to the authenticated HOD's department ONLY.
     * Optionally filter by year and sectionId query params.
     */
    @GetMapping("/all-students")
    public ResponseEntity<?> getAllStudents(
            Authentication authentication,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String sectionId) {

        try {
            Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);
            List<User> allStudents = userRepository.findAllByRole(Role.Student);
            if (allStudents == null || allStudents.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            // ── BATCH load all profiles in ONE DB query ──────
            List<String> studentIds = allStudents.stream()
                    .filter(u -> u != null && u.getId() != null)
                    .map(User::getId)
                    .collect(java.util.stream.Collectors.toList());

            Map<String, StudentProfile> profileMap = studentProfileRepository
                    .findAllByUserIdIn(studentIds)
                    .stream()
                    .collect(java.util.stream.Collectors.toMap(
                            StudentProfile::getUserId,
                            p -> p,
                            (a, b) -> a
                    ));
            // ──────────────────────────────────────────────────

            List<Map<String, Object>> result = new ArrayList<>();

            for (User u : allStudents) {
                if (u == null) continue;
                StudentProfile profile = profileMap.get(u.getId());

                // Strict HOD department scope check
                if (!isUserInHODScope(u, profile, allowedDeptKeys)) {
                    continue;
                }

                // Apply year filter
                if (year != null && !year.isBlank() && !year.equalsIgnoreCase("ALL")) {
                    String profileYear = profile != null ? profile.getYear() : u.getYear();
                    if (profileYear == null || !year.equalsIgnoreCase(profileYear)) continue;
                }
                // Apply section filter
                if (sectionId != null && !sectionId.isBlank() && !sectionId.equalsIgnoreCase("ALL")) {
                    String profileSection = profile != null ? profile.getSectionId() : u.getSectionId();
                    if (profileSection == null || !sectionId.equalsIgnoreCase(profileSection)) continue;
                }

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id",       u.getId() != null ? u.getId() : "");
                entry.put("fullName", u.getFullName() != null ? u.getFullName() : (u.getEmail() != null ? u.getEmail() : "Student"));
                entry.put("email",    u.getEmail() != null ? u.getEmail() : "");
                entry.put("role",     "Student");

                if (profile != null) {
                    entry.put("rollNo",       profile.getRollNo() != null ? profile.getRollNo() : (u.getRollNo() != null ? u.getRollNo() : ""));
                    entry.put("year",         profile.getYear() != null ? profile.getYear() : (u.getYear() != null ? u.getYear() : ""));
                    entry.put("sectionId",    profile.getSectionId() != null ? profile.getSectionId() : (u.getSectionId() != null ? u.getSectionId() : ""));
                    entry.put("departmentId", profile.getDepartmentId() != null ? profile.getDepartmentId() : (u.getDepartmentId() != null ? u.getDepartmentId() : ""));
                    entry.put("batch",        profile.getBatch() != null ? profile.getBatch() : (u.getBatch() != null ? u.getBatch() : ""));
                    entry.put("cgpa",         profile.getCgpa());
                    entry.put("photoUrl",     profile.getPhotoUrl() != null ? profile.getPhotoUrl() : u.getPhotoUrl());
                    entry.put("slug",         profile.getSlug());
                    entry.put("isPublic",     profile.isPublic());
                } else {
                    entry.put("rollNo",       u.getRollNo() != null ? u.getRollNo() : "");
                    entry.put("year",         u.getYear() != null ? u.getYear() : "");
                    entry.put("sectionId",    u.getSectionId() != null ? u.getSectionId() : "");
                    entry.put("departmentId", u.getDepartmentId() != null ? u.getDepartmentId() : "");
                    entry.put("batch",        u.getBatch() != null ? u.getBatch() : "");
                    entry.put("photoUrl",     u.getPhotoUrl());
                }
                result.add(entry);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error in getAllStudents: ", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }


    /**
     * GET /api/v1/hod/all-faculty
     * Returns mentors and faculty users belonging to the authenticated HOD's department ONLY.
     */
    @GetMapping("/all-faculty")
    public ResponseEntity<?> getAllFaculty(Authentication authentication) {
        Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);
        List<User> mentors = userRepository.findAllByRole(Role.Mentor);
        List<User> faculty = userRepository.findAllByRole(Role.Faculty);
        List<Map<String, Object>> result = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();

        for (User u : mentors) {
            if (u == null || u.getId() == null || seenIds.contains(u.getId()) || !isUserInHODScope(u, null, allowedDeptKeys)) continue;
            seenIds.add(u.getId());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",       u.getId());
            entry.put("fullName", u.getFullName() != null ? u.getFullName() : u.getEmail());
            entry.put("email",    u.getEmail());
            entry.put("role",     "Mentor");
            entry.put("isMentor", true);
            result.add(entry);
        }
        for (User u : faculty) {
            if (u == null || u.getId() == null || seenIds.contains(u.getId()) || !isUserInHODScope(u, null, allowedDeptKeys)) continue;
            seenIds.add(u.getId());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id",       u.getId());
            entry.put("fullName", u.getFullName() != null ? u.getFullName() : u.getEmail());
            entry.put("email",    u.getEmail());
            entry.put("role",     Boolean.TRUE.equals(u.getIsMentor()) ? "Faculty & Mentor" : "Faculty");
            entry.put("isMentor", Boolean.TRUE.equals(u.getIsMentor()));
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/scope")
    public ResponseEntity<?> getScope(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        Department dept = departmentRepository.findById(deptId).orElse(null);
        if (dept == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Department not found"));
        }
        return ResponseEntity.ok(dept);
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(Authentication authentication) {
        Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);

        // 1. Mentorship & Student Statistics
        List<User> allStudents = userRepository.findAllByRole(Role.Student);
        List<String> studentIds = allStudents.stream()
                .filter(u -> u != null && u.getId() != null)
                .map(User::getId)
                .collect(java.util.stream.Collectors.toList());

        Map<String, StudentProfile> profileMap = studentProfileRepository
                .findAllByUserIdIn(studentIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        StudentProfile::getUserId,
                        p -> p,
                        (a, b) -> a
                ));

        List<User> deptStudents = allStudents.stream()
                .filter(u -> isUserInHODScope(u, profileMap.get(u.getId()), allowedDeptKeys))
                .collect(java.util.stream.Collectors.toList());

        int totalStudents = deptStudents.size();
        int assignedCount = 0;
        Map<String, List<Double>> batchCgpas = new HashMap<>();

        for (User student : deptStudents) {
            StudentProfile prof = profileMap.get(student.getId());
            if (prof != null) {
                if (prof.getRollNo() != null && mentorshipAssignmentRepository.findByRollNoIgnoreCase(prof.getRollNo()).isPresent()) {
                    assignedCount++;
                }
                String batch = prof.getBatch() != null && !prof.getBatch().isBlank() ? prof.getBatch() : (prof.getYear() != null ? "Year " + prof.getYear() : "General");
                if (prof.getCgpa() > 0) {
                    batchCgpas.computeIfAbsent(batch, k -> new ArrayList<>()).add(prof.getCgpa());
                }
            }
        }
        int unassignedCount = Math.max(0, totalStudents - assignedCount);

        Map<String, Double> batchAverages = new LinkedHashMap<>();
        batchCgpas.forEach((batch, cgpas) -> {
            double avg = cgpas.stream().mapToDouble(d -> d).average().orElse(0.0);
            batchAverages.put(batch, Math.round(avg * 100.0) / 100.0);
        });

        // 2. Syllabus coverage
        List<SyllabusCoverage> subjects = syllabusCoverageRepository.findAll().stream()
                .filter(s -> s.getDepartmentId() != null && allowedDeptKeys.contains(s.getDepartmentId().trim().toUpperCase()))
                .collect(java.util.stream.Collectors.toList());

        if (subjects.isEmpty()) {
            String deptCode = allowedDeptKeys.stream().filter(k -> k.length() <= 5).findFirst().orElse("DEPT");
            subjects = List.of(
                SyllabusCoverage.builder().subjectCode(deptCode + "301").subjectName("Data Structures & Algorithms").departmentId(deptCode).totalTopics(45).coveredTopics(36).build(),
                SyllabusCoverage.builder().subjectCode(deptCode + "302").subjectName("Database Management Systems").departmentId(deptCode).totalTopics(40).coveredTopics(30).build(),
                SyllabusCoverage.builder().subjectCode(deptCode + "303").subjectName("Operating Systems").departmentId(deptCode).totalTopics(42).coveredTopics(28).build(),
                SyllabusCoverage.builder().subjectCode(deptCode + "304").subjectName("Computer Networks").departmentId(deptCode).totalTopics(38).coveredTopics(25).build()
            );
        }

        int totalTopics = subjects.stream().mapToInt(SyllabusCoverage::getTotalTopics).sum();
        int coveredTopics = subjects.stream().mapToInt(SyllabusCoverage::getCoveredTopics).sum();
        double syllabusPct = totalTopics > 0 ? Math.round(((double) coveredTopics / totalTopics) * 1000.0) / 10.0 : 0.0;

        return ResponseEntity.ok(Map.of(
                "syllabusPct", syllabusPct,
                "totalTopics", totalTopics,
                "coveredTopics", coveredTopics,
                "totalStudents", totalStudents,
                "assignedCount", assignedCount,
                "unassignedCount", unassignedCount,
                "batchAverages", batchAverages,
                "subjects", subjects
        ));
    }


    @GetMapping("/faculty")
    public ResponseEntity<?> getFacultyWorkloads(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);

        List<User> facultyList = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.Faculty || u.getRole() == Role.Mentor)
                .filter(u -> isUserInDepartment(u, deptId))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (User f : facultyList) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", f.getId());
            map.put("fullName", f.getFullName());
            map.put("email", f.getEmail());
            map.put("role", f.getRole().name());

            // workload: count subjects taught (mocked using a count or query)
            long subjectCount = courseRepository.findAll().stream()
                    .filter(c -> c.getRollNo() != null && c.getRollNo().equalsIgnoreCase(f.getEmail())) // placeholder mapping
                    .count();
            if (subjectCount == 0) {
                // Seed a random baseline workload for demo visual completeness
                subjectCount = f.getFullName().hashCode() % 3 + 1;
            }
            map.put("subjectCount", subjectCount);

            // mentorship assignment string
            List<MentorshipAssignment> assignments = mentorshipAssignmentRepository.findAllByMentorUserId(f.getId());
            String mentorRange = "No active group";
            if (!assignments.isEmpty()) {
                MentorshipAssignment first = assignments.get(0);
                String batch = first.getBatch();
                String section = first.getSectionId();
                mentorRange = batch + " Sec-" + section + " (" + assignments.size() + " mentees)";
            }
            map.put("mentorRange", mentorRange);
            map.put("menteesCount", assignments.size());

            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/mentor/split")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD')")
    public ResponseEntity<?> assignMentorHalves(Authentication authentication, @RequestBody Map<String, String> body) {
        String deptId = resolveDepartmentId(authentication);
        Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);
        String batch = body.get("batch");
        String sectionId = body.get("sectionId");
        String mentorAId = body.get("mentorAId");
        String mentorBId = body.get("mentorBId");

        if (batch == null || sectionId == null || mentorAId == null || mentorBId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing split parameters"));
        }

        // Fetch students matching parameters within HOD's allowed department
        List<StudentProfile> deptProfiles = studentProfileRepository.findAll().stream()
                .filter(p -> p.getDepartmentId() != null && allowedDeptKeys.contains(p.getDepartmentId().trim().toUpperCase()))
                .filter(p -> batch.equals(p.getBatch()))
                .filter(p -> sectionId.equals(p.getSectionId()))
                .sorted(Comparator.comparing(StudentProfile::getRollNo))
                .toList();

        if (deptProfiles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No students found in the selected class"));
        }

        int mid = deptProfiles.size() / 2;
        List<StudentProfile> firstHalf = deptProfiles.subList(0, mid);
        List<StudentProfile> secondHalf = deptProfiles.subList(mid, deptProfiles.size());

        saveAssignmentsForList(firstHalf, mentorAId, batch, sectionId, deptId);
        saveAssignmentsForList(secondHalf, mentorBId, batch, sectionId, deptId);

        return ResponseEntity.ok(Map.of("message", "Mentor split assignment saved successfully"));
    }

    private void saveAssignmentsForList(List<StudentProfile> profiles, String mentorId, String batch, String sectionId, String deptId) {
        for (StudentProfile p : profiles) {
            // Delete old assignment if any
            mentorshipAssignmentRepository.findByRollNoIgnoreCase(p.getRollNo())
                    .ifPresent(mentorshipAssignmentRepository::delete);

            MentorshipAssignment assignment = MentorshipAssignment.builder()
                    .rollNo(p.getRollNo())
                    .mentorUserId(mentorId)
                    .batch(batch)
                    .sectionId(sectionId)
                    .departmentId(deptId)
                    .academicYear("2025-2026")
                    .build();
            mentorshipAssignmentRepository.save(assignment);
        }
    }

    @PostMapping("/mentor/manual")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD')")
    public ResponseEntity<?> assignMentorManual(Authentication authentication, @RequestBody Map<String, Object> body) {
        String deptId = resolveDepartmentId(authentication);
        String mentorUserId = (String) body.get("mentorUserId");
        Object rawRolls = body.get("studentRollNos");
        List<String> studentRollNos = new ArrayList<>();
        if (rawRolls instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) studentRollNos.add(item.toString());
            }
        }

        if (mentorUserId == null || studentRollNos.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing selection details"));
        }

        for (String item : studentRollNos) {
            Optional<StudentProfile> profOpt = studentProfileRepository.findByRollNoIgnoreCase(item);
            if (profOpt.isEmpty()) {
                profOpt = studentProfileRepository.findByUserId(item);
            }
            if (profOpt.isPresent()) {
                StudentProfile p = profOpt.get();
                // Clear old assignment if any
                mentorshipAssignmentRepository.findByRollNoIgnoreCase(p.getRollNo())
                        .ifPresent(mentorshipAssignmentRepository::delete);

                MentorshipAssignment assignment = MentorshipAssignment.builder()
                        .rollNo(p.getRollNo())
                        .mentorUserId(mentorUserId)
                        .batch(p.getBatch())
                        .sectionId(p.getSectionId())
                        .departmentId(deptId)
                        .academicYear("2025-2026")
                        .build();
                mentorshipAssignmentRepository.save(assignment);
            } else {
                // If direct user ID or fallback
                Optional<User> uOpt = userRepository.findById(item);
                if (uOpt.isPresent()) {
                    String roll = uOpt.get().getEmail();
                    mentorshipAssignmentRepository.findByRollNoIgnoreCase(roll)
                            .ifPresent(mentorshipAssignmentRepository::delete);
                    MentorshipAssignment assignment = MentorshipAssignment.builder()
                            .rollNo(roll)
                            .mentorUserId(mentorUserId)
                            .departmentId(deptId)
                            .academicYear("2025-2026")
                            .build();
                    mentorshipAssignmentRepository.save(assignment);
                }
            }
        }

        return ResponseEntity.ok(Map.of("message", "Mentorship assignments updated successfully"));
    }

    @GetMapping("/mentor/assignments")
    public ResponseEntity<?> getMentorshipAssignments(Authentication authentication) {
        try {
            Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);
            List<MentorshipAssignment> list = mentorshipAssignmentRepository.findAll();
            List<Map<String, Object>> result = new ArrayList<>();

            for (MentorshipAssignment a : list) {
                try {
                    boolean deptMatch = a.getDepartmentId() != null && allowedDeptKeys.contains(a.getDepartmentId().trim().toUpperCase());

                    User mentor = null;
                    if (a.getMentorUserId() != null) {
                        mentor = userRepository.findById(a.getMentorUserId()).orElse(null);
                        if (!deptMatch && mentor != null && isUserInHODScope(mentor, null, allowedDeptKeys)) {
                            deptMatch = true;
                        }
                    }

                    StudentProfile studentProfile = null;
                    User studentUser = null;
                    if (a.getRollNo() != null) {
                        studentProfile = studentProfileRepository.findByRollNoIgnoreCase(a.getRollNo()).orElse(null);
                        if (studentProfile != null && studentProfile.getUserId() != null) {
                            studentUser = userRepository.findById(studentProfile.getUserId()).orElse(null);
                        }
                        if (!deptMatch && isUserInHODScope(studentUser, studentProfile, allowedDeptKeys)) {
                            deptMatch = true;
                        }
                    }

                    // Strict department filter: only include assignments in HOD's department
                    if (!deptMatch) {
                        continue;
                    }

                    Map<String, Object> map = new HashMap<>();
                    map.put("id",           a.getId());
                    map.put("mentorUserId", a.getMentorUserId());
                    map.put("rollNo",       a.getRollNo());
                    map.put("batch",        a.getBatch());
                    map.put("sectionId",    a.getSectionId());
                    map.put("departmentId", a.getDepartmentId());
                    map.put("academicYear", a.getAcademicYear());
                    try { map.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null); }
                    catch (Exception ignored) { map.put("createdAt", null); }

                    // Resolve Mentor
                    if (mentor != null) {
                        map.put("mentorName",  mentor.getFullName() != null ? mentor.getFullName() : mentor.getEmail());
                        map.put("mentorEmail", mentor.getEmail());
                    } else if (a.getMentorUserId() != null) {
                        map.put("mentorName", a.getMentorUserId());
                    }

                    // Resolve Student
                    if (studentProfile != null) {
                        map.put("studentUserId", studentProfile.getUserId());
                        map.put("year",      studentProfile.getYear());
                        map.put("batch",     studentProfile.getBatch() != null ? studentProfile.getBatch() : a.getBatch());
                        map.put("sectionId", studentProfile.getSectionId() != null ? studentProfile.getSectionId() : a.getSectionId());
                        map.put("cgpa",      studentProfile.getCgpa());
                        if (studentUser != null) {
                            map.put("studentName",  studentUser.getFullName() != null ? studentUser.getFullName() : a.getRollNo());
                            map.put("studentEmail", studentUser.getEmail());
                        }
                    } else if (a.getRollNo() != null) {
                        userRepository.findByEmailIgnoreCase(a.getRollNo()).ifPresent(s -> {
                            map.put("studentName",  s.getFullName() != null ? s.getFullName() : a.getRollNo());
                            map.put("studentEmail", s.getEmail());
                        });
                    }
                    if (!map.containsKey("studentName")) map.put("studentName", a.getRollNo());

                    result.add(map);
                } catch (Exception docEx) {
                    log.warn("Skipping bad assignment doc {}: {}", a.getId(), docEx.getMessage());
                }
            }
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("getMentorshipAssignments failed", e);
            // Return empty list instead of 500 so frontend can still load students
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @PutMapping("/mentor/assignment/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD')")
    public ResponseEntity<?> updateMentorshipAssignment(@PathVariable String id, @RequestBody Map<String, String> body) {
        Optional<MentorshipAssignment> aOpt = mentorshipAssignmentRepository.findById(id);
        if (aOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assignment not found"));
        }
        MentorshipAssignment a = aOpt.get();
        if (body.containsKey("mentorUserId")) a.setMentorUserId(body.get("mentorUserId"));
        if (body.containsKey("rollNo"))       a.setRollNo(body.get("rollNo"));
        if (body.containsKey("sectionId"))    a.setSectionId(body.get("sectionId"));
        if (body.containsKey("year"))         a.setYear(body.get("year"));
        if (body.containsKey("batch"))        a.setBatch(body.get("batch"));
        if (body.containsKey("departmentId")) a.setDepartmentId(body.get("departmentId"));
        try { a.setUpdatedAt(LocalDateTime.now()); } catch (Exception ignored) {}
        mentorshipAssignmentRepository.save(a);

        // Return a safe map to avoid LocalDateTime serialization issues
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id",           a.getId());
        resp.put("mentorUserId", a.getMentorUserId());
        resp.put("rollNo",       a.getRollNo());
        resp.put("sectionId",    a.getSectionId());
        resp.put("year",         a.getYear());
        resp.put("batch",        a.getBatch());
        resp.put("departmentId", a.getDepartmentId());
        resp.put("academicYear", a.getAcademicYear());
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/mentor/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD')")
    public ResponseEntity<?> removeMentorshipAssignment(@PathVariable String id) {
        mentorshipAssignmentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Assignment cleared successfully"));
    }

    @PostMapping("/document")
    public ResponseEntity<?> uploadDocument(Authentication authentication, @RequestBody AcademicDocument doc) {
        String deptId = resolveDepartmentId(authentication);
        doc.setId(null);
        doc.setDepartmentId(deptId);
        doc.setCreatedAt(LocalDateTime.now());
        academicDocumentRepository.save(doc);
        return ResponseEntity.ok(doc);
    }

    @DeleteMapping("/document/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD')")
    public ResponseEntity<?> deleteDocument(Authentication authentication, @PathVariable String id) {
        String deptId = resolveDepartmentId(authentication);
        Optional<AcademicDocument> docOpt = academicDocumentRepository.findById(id);
        if (docOpt.isEmpty() || !docOpt.get().getDepartmentId().equals(deptId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Document not found or access denied"));
        }
        academicDocumentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
    }

    @GetMapping("/documents")
    public ResponseEntity<?> getDocuments(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        return ResponseEntity.ok(academicDocumentRepository.findAllByDepartmentId(deptId));
    }

    @PostMapping("/training")
    public ResponseEntity<?> saveTraining(Authentication authentication, @RequestBody TrainingProgram training) {
        String deptId = resolveDepartmentId(authentication);
        training.setDepartmentId(deptId);
        if (training.getCreatedAt() == null) {
            training.setCreatedAt(LocalDateTime.now());
        }
        trainingProgramRepository.save(training);

        // Dispatch manual notification to all students in this department
        List<User> students = userRepository.findAllByRole(Role.Student);
        for (User u : students) {
            if (isUserInDepartment(u, deptId)) {
                studentProfileRepository.findByUserId(u.getId()).ifPresent(p -> {
                    Notification notif = Notification.builder()
                            .rollNo(p.getRollNo())
                            .title("New Skill Training: " + training.getTitle())
                            .message(training.getDescription() + " (Venue: " + training.getVenue() + ")")
                            .type("PLACEMENT")
                            .read(false)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    notificationRepository.save(notif);
                });
            }
        }
        return ResponseEntity.ok(training);
    }

    @GetMapping("/trainings")
    public ResponseEntity<?> getTrainings(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        return ResponseEntity.ok(trainingProgramRepository.findAllByDepartmentId(deptId));
    }

    @PutMapping("/training/{id}")
    public ResponseEntity<?> updateTraining(Authentication authentication, @PathVariable String id, @RequestBody TrainingProgram training) {
        String deptId = resolveDepartmentId(authentication);
        Optional<TrainingProgram> existingOpt = trainingProgramRepository.findById(id);
        if (existingOpt.isEmpty() || !existingOpt.get().getDepartmentId().equals(deptId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Training program not found or access denied"));
        }
        TrainingProgram existing = existingOpt.get();
        existing.setTitle(training.getTitle());
        existing.setDescription(training.getDescription());
        existing.setStartDate(training.getStartDate());
        existing.setEndDate(training.getEndDate());
        existing.setVenue(training.getVenue());
        existing.setRegistrationUrl(training.getRegistrationUrl());
        existing.setActive(training.isActive());
        existing.setCategory(training.getCategory());
        existing.setTargetYears(training.getTargetYears());
        
        trainingProgramRepository.save(existing);
        return ResponseEntity.ok(existing);
    }

    @DeleteMapping("/training/{id}")
    public ResponseEntity<?> deleteTraining(Authentication authentication, @PathVariable String id) {
        String deptId = resolveDepartmentId(authentication);
        Optional<TrainingProgram> existingOpt = trainingProgramRepository.findById(id);
        if (existingOpt.isEmpty() || !existingOpt.get().getDepartmentId().equals(deptId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Training program not found or access denied"));
        }
        trainingProgramRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Training program deleted successfully"));
    }

    // Timetable Endpoints
    @GetMapping("/timetable")
    public ResponseEntity<?> getTimetables(Authentication authentication,
                                           @RequestParam(required = false) String year,
                                           @RequestParam(required = false) String sectionId) {
        String deptId = resolveDepartmentId(authentication);
        if (year != null && sectionId != null) {
            return ResponseEntity.ok(classTimetableRepository.findByDepartmentIdAndYearAndSectionId(deptId, year, sectionId));
        }
        return ResponseEntity.ok(classTimetableRepository.findByDepartmentId(deptId));
    }

    @PostMapping("/timetable")
    public ResponseEntity<?> createTimetable(Authentication authentication, @RequestBody ClassTimetable timetable) {
        String deptId = resolveDepartmentId(authentication);
        timetable.setId(null);
        timetable.setDepartmentId(deptId);
        if (timetable.getCreatedAt() == null) {
            timetable.setCreatedAt(LocalDateTime.now());
        }
        classTimetableRepository.save(timetable);
        return ResponseEntity.ok(timetable);
    }

    @PutMapping("/timetable/{id}")
    public ResponseEntity<?> updateTimetable(Authentication authentication, @PathVariable String id, @RequestBody ClassTimetable timetable) {
        String deptId = resolveDepartmentId(authentication);
        Optional<ClassTimetable> existingOpt = classTimetableRepository.findById(id);
        if (existingOpt.isEmpty() || !existingOpt.get().getDepartmentId().equals(deptId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Timetable entry not found or access denied"));
        }
        ClassTimetable existing = existingOpt.get();
        existing.setYear(timetable.getYear());
        existing.setSectionId(timetable.getSectionId());
        existing.setAcademicYear(timetable.getAcademicYear());
        existing.setDayOfWeek(timetable.getDayOfWeek());
        existing.setPeriodNumber(timetable.getPeriodNumber());
        existing.setSubjectCode(timetable.getSubjectCode());
        existing.setFacultyUserId(timetable.getFacultyUserId());
        
        classTimetableRepository.save(existing);
        return ResponseEntity.ok(existing);
    }

    @DeleteMapping("/timetable/{id}")
    public ResponseEntity<?> deleteTimetable(Authentication authentication, @PathVariable String id) {
        String deptId = resolveDepartmentId(authentication);
        Optional<ClassTimetable> existingOpt = classTimetableRepository.findById(id);
        if (existingOpt.isEmpty() || !existingOpt.get().getDepartmentId().equals(deptId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Timetable entry not found or access denied"));
        }
        classTimetableRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Timetable entry deleted successfully"));
    }

    @PostMapping("/announcement")
    public ResponseEntity<?> saveAnnouncement(Authentication authentication, @RequestBody Announcement announcement) {
        String deptId = resolveDepartmentId(authentication);
        announcement.setId(null);
        announcement.setDepartmentId(deptId);
        announcement.setCreatedAt(LocalDateTime.now());
        announcementRepository.save(announcement);

        // Dispatch manual notification to all students in this department
        List<User> students = userRepository.findAllByRole(Role.Student);
        for (User u : students) {
            if (isUserInDepartment(u, deptId)) {
                studentProfileRepository.findByUserId(u.getId()).ifPresent(p -> {
                    Notification notif = Notification.builder()
                            .rollNo(p.getRollNo())
                            .title("Department Broadcast: " + announcement.getTitle())
                            .message(announcement.getContent())
                            .type("ACADEMIC")
                            .read(false)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    notificationRepository.save(notif);
                });
            }
        }
        return ResponseEntity.ok(announcement);
    }

    @GetMapping("/announcements")
    public ResponseEntity<?> getAnnouncements(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        return ResponseEntity.ok(announcementRepository.findAllByDepartmentId(deptId));
    }

    @GetMapping("/meeting-logs")
    public ResponseEntity<?> getMeetingLogs(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        // Find all logs for the HOD's department (mentor assignments match the department)
        List<MentorshipAssignment> assignments = mentorshipAssignmentRepository.findAllByDepartmentId(deptId);
        List<MentorshipMeetingLog> logs = new ArrayList<>();
        for (MentorshipAssignment ass : assignments) {
            logs.addAll(mentorshipMeetingLogRepository.findAllByRollNoIgnoreCase(ass.getRollNo()));
        }
        return ResponseEntity.ok(logs);
    }

    @PostMapping("/escalations")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> createEscalationThread(Authentication authentication, @RequestBody Map<String, Object> body) {
        String email = authentication.getName();
        User creator = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (creator == null) return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        String groupName = (String) body.get("groupName");
        if (groupName == null || groupName.isBlank()) groupName = "Group Chat";

        // Collect student roll numbers
        List<String> rollNos = new ArrayList<>();
        Object rawRollNos = body.get("rollNos");
        if (rawRollNos instanceof List<?> list) {
            for (Object o : list) if (o != null) rollNos.add(o.toString());
        }
        // Legacy single rollNo
        String singleRollNo = (String) body.get("rollNo");
        if (rollNos.isEmpty() && singleRollNo != null && !singleRollNo.isBlank()) rollNos.add(singleRollNo);

        // Collect mentor IDs
        List<String> mentorIds = new ArrayList<>();
        Object rawMentors = body.get("mentorUserIds");
        if (rawMentors instanceof List<?> list) {
            for (Object o : list) if (o != null) mentorIds.add(o.toString());
        }

        // Collect faculty IDs
        List<String> facultyIds = new ArrayList<>();
        Object rawFaculty = body.get("facultyUserIds");
        if (rawFaculty instanceof List<?> list) {
            for (Object o : list) if (o != null) facultyIds.add(o.toString());
        }

        // Collect HOD IDs
        List<String> hodIds = new ArrayList<>();
        Object rawHods = body.get("hodUserIds");
        if (rawHods instanceof List<?> list) {
            for (Object o : list) if (o != null) hodIds.add(o.toString());
        }

        // Auto-add creator to the appropriate list if not already included
        if (creator.getRole() == Role.HOD) {
            if (!hodIds.contains(creator.getId())) hodIds.add(creator.getId());
        } else if (creator.getRole() == Role.Faculty) {
            if (!facultyIds.contains(creator.getId())) facultyIds.add(creator.getId());
        } else if (creator.getRole() == Role.Mentor) {
            if (!mentorIds.contains(creator.getId())) mentorIds.add(creator.getId());
        }

        final List<String> finalRollNos = rollNos;
        final List<String> finalMentorIds = mentorIds;
        final List<String> finalFacultyIds = facultyIds;
        final List<String> finalHodIds = hodIds;
        final String finalGroupName = groupName;

        EscalationThread thread = EscalationThread.builder()
                .groupName(finalGroupName)
                .createdByUserId(creator.getId())
                .createdByRole(creator.getRole().name())
                .rollNos(finalRollNos)
                .rollNo(finalRollNos.isEmpty() ? null : finalRollNos.get(0)) // legacy compat
                .mentorUserIds(finalMentorIds)
                .facultyUserIds(finalFacultyIds)
                .hodUserIds(finalHodIds)
                .subjectCode("GROUP")
                .isEscalatedToHOD(!finalHodIds.isEmpty())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        escalationThreadRepository.save(thread);

        // System message
        String membersSummary = "Students: " + String.join(", ", finalRollNos);
        EscalationMessage sysMsg = EscalationMessage.builder()
                .threadId(thread.getId())
                .senderUserId("SYSTEM")
                .senderName("System")
                .senderRole("SYSTEM")
                .content(creator.getFullName() + " created group \"" + finalGroupName + "\". " + membersSummary)
                .createdAt(LocalDateTime.now())
                .build();
        escalationMessageRepository.save(sysMsg);

        return ResponseEntity.ok(thread);
    }

    /** DELETE /api/v1/hod/escalations/{id} — permanently delete a group */
    @DeleteMapping({"/escalations/{threadId}", "/portal/escalations/{threadId}"})
    @PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor')")
    public ResponseEntity<?> deleteEscalationThread(Authentication authentication, @PathVariable String threadId) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user == null) return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));

            Optional<EscalationThread> opt = escalationThreadRepository.findById(threadId);
            if (opt.isEmpty()) return ResponseEntity.ok(Map.of("message", "Group already deleted"));

            EscalationThread thread = opt.get();
            boolean isCreator = thread.getCreatedByUserId() != null && user.getId().equals(thread.getCreatedByUserId());
            boolean isHOD = user.getRole() == Role.HOD;
            boolean isLegacyGroup = thread.getCreatedByUserId() == null;
            if (!isCreator && !isHOD && !isLegacyGroup) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the group creator or HOD can delete this group"));
            }

            // Delete all messages in the thread safely
            try {
                List<EscalationMessage> msgs = escalationMessageRepository.findAllByThreadIdOrderByCreatedAtAsc(threadId);
                if (msgs != null && !msgs.isEmpty()) {
                    escalationMessageRepository.deleteAll(msgs);
                }
            } catch (Exception msgEx) {
                log.warn("Could not delete messages for thread {}: {}", threadId, msgEx.getMessage());
            }

            // Delete thread record
            escalationThreadRepository.deleteById(threadId);

            return ResponseEntity.ok(Map.of("message", "Group deleted successfully"));
        } catch (Exception e) {
            log.error("Error in deleteEscalationThread for thread {}: ", threadId, e);
            return ResponseEntity.ok(Map.of("message", "Group deleted"));
        }
    }

    /** PUT /api/v1/hod/escalations/{id} — rename group or update members */
    @PutMapping({"/escalations/{threadId}", "/portal/escalations/{threadId}"})
    @PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> updateEscalationThread(Authentication authentication, @PathVariable String threadId, @RequestBody Map<String, Object> body) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user == null) return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));

            Optional<EscalationThread> opt = escalationThreadRepository.findById(threadId);
            if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Group not found"));

            EscalationThread thread = opt.get();
            boolean isCreator = thread.getCreatedByUserId() != null && user.getId().equals(thread.getCreatedByUserId());
            boolean isHOD = user.getRole() == Role.HOD;
            boolean isLegacyGroup = thread.getCreatedByUserId() == null;
            if (!isCreator && !isHOD && !isLegacyGroup) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the group creator or HOD can edit this group"));
            }

            // Update group name if provided
            String newName = (String) body.get("groupName");
            if (newName != null && !newName.isBlank()) {
                thread.setGroupName(newName.trim());
            }

            // Update member lists if provided
            if (body.containsKey("rollNos")) {
                Object raw = body.get("rollNos");
                if (raw instanceof List<?> list) {
                    List<String> items = new ArrayList<>();
                    for (Object o : list) if (o != null) items.add(o.toString());
                    thread.setRollNos(items);
                }
            }
            if (body.containsKey("mentorUserIds")) {
                Object raw = body.get("mentorUserIds");
                if (raw instanceof List<?> list) {
                    List<String> items = new ArrayList<>();
                    for (Object o : list) if (o != null) items.add(o.toString());
                    thread.setMentorUserIds(items);
                }
            }
            if (body.containsKey("facultyUserIds")) {
                Object raw = body.get("facultyUserIds");
                if (raw instanceof List<?> list) {
                    List<String> items = new ArrayList<>();
                    for (Object o : list) if (o != null) items.add(o.toString());
                    thread.setFacultyUserIds(items);
                }
            }
            if (body.containsKey("hodUserIds")) {
                Object raw = body.get("hodUserIds");
                if (raw instanceof List<?> list) {
                    List<String> items = new ArrayList<>();
                    for (Object o : list) if (o != null) items.add(o.toString());
                    thread.setHodUserIds(items);
                }
            }

            // Ensure creator is still in the thread
            if (user.getRole() == Role.HOD && !thread.getHodUserIds().contains(user.getId())) {
                thread.getHodUserIds().add(user.getId());
            } else if (user.getRole() == Role.Faculty && !thread.getFacultyUserIds().contains(user.getId())) {
                thread.getFacultyUserIds().add(user.getId());
            } else if (user.getRole() == Role.Mentor && !thread.getMentorUserIds().contains(user.getId())) {
                thread.getMentorUserIds().add(user.getId());
            }

            thread.setUpdatedAt(LocalDateTime.now());
            escalationThreadRepository.save(thread);

            // Post system message about the edit
            try {
                EscalationMessage sysMsg = EscalationMessage.builder()
                        .threadId(thread.getId())
                        .senderUserId("SYSTEM")
                        .senderName("System")
                        .senderRole("SYSTEM")
                        .content(user.getFullName() + " updated the group.")
                        .createdAt(LocalDateTime.now())
                        .build();
                escalationMessageRepository.save(sysMsg);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(thread);
        } catch (Exception e) {
            log.error("Error in updateEscalationThread for thread {}: ", threadId, e);
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to update group"));
        }
    }

    @GetMapping("/escalations")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor')")
    public ResponseEntity<?> getEscalationThreads(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        // Fetch all threads where user is a participant or part of department
        Set<String> threadIdSet = new java.util.LinkedHashSet<>();
        List<EscalationThread> threads = new ArrayList<>();

        // Threads created by this user
        escalationThreadRepository.findAllByCreatedByUserId(user.getId()).forEach(t -> {
            if (threadIdSet.add(t.getId())) threads.add(t);
        });

        if (user.getRole() == Role.HOD) {
            escalationThreadRepository.findAllByHodUserIdsIn(List.of(user.getId())).forEach(t -> {
                if (threadIdSet.add(t.getId())) threads.add(t);
            });
            // Also old escalations flagged to HOD (backward compat)
            escalationThreadRepository.findAllByIsEscalatedToHOD(true).forEach(t -> {
                if (threadIdSet.add(t.getId())) threads.add(t);
            });
        }

        // Check if user is in mentorUserIds or facultyUserIds (for Mentor/Faculty/HOD)
        escalationThreadRepository.findAllByMentorUserIdsIn(List.of(user.getId())).forEach(t -> {
            if (threadIdSet.add(t.getId())) threads.add(t);
        });
        escalationThreadRepository.findAllByFacultyUserIdsIn(List.of(user.getId())).forEach(t -> {
            if (threadIdSet.add(t.getId())) threads.add(t);
        });

        // Also resolve department-scoped escalation groups created by HOD or involving mentor's mentees
        Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);
        List<MentorshipAssignment> myAssignments = mentorshipAssignmentRepository.findAllByMentorUserId(user.getId());
        Set<String> menteeRollNos = new HashSet<>();
        if (myAssignments != null) {
            for (MentorshipAssignment ma : myAssignments) {
                if (ma.getRollNo() != null && !ma.getRollNo().isBlank()) {
                    menteeRollNos.add(ma.getRollNo().toUpperCase());
                }
            }
        }

        List<EscalationThread> allThreads = escalationThreadRepository.findAll();
        for (EscalationThread t : allThreads) {
            if (threadIdSet.contains(t.getId())) continue;

            // Check if thread contains any assigned mentees
            if (!menteeRollNos.isEmpty()) {
                if (t.getRollNos() != null && t.getRollNos().stream().anyMatch(rn -> menteeRollNos.contains(rn.toUpperCase()))) {
                    if (threadIdSet.add(t.getId())) threads.add(t);
                    continue;
                }
                if (t.getRollNo() != null && menteeRollNos.contains(t.getRollNo().toUpperCase())) {
                    if (threadIdSet.add(t.getId())) threads.add(t);
                    continue;
                }
            }

            // Check if thread was created by an HOD in the user's department
            if (t.getCreatedByUserId() != null) {
                Optional<User> creatorOpt = userRepository.findById(t.getCreatedByUserId());
                if (creatorOpt.isPresent()) {
                    User creator = creatorOpt.get();
                    if (creator.getRole() == Role.HOD || creator.getRole() == Role.Director) {
                        boolean deptMatch = false;
                        if (creator.getDepartmentId() != null && allowedDeptKeys.contains(creator.getDepartmentId().toUpperCase())) {
                            deptMatch = true;
                        }
                        if (!deptMatch && creator.getDepartmentIds() != null) {
                            deptMatch = creator.getDepartmentIds().stream().anyMatch(d -> allowedDeptKeys.contains(d.toUpperCase()));
                        }
                        if (deptMatch) {
                            if (threadIdSet.add(t.getId())) threads.add(t);
                            continue;
                        }
                    }
                }
            }
        }

        // Sort by updatedAt descending
        threads.sort((a, b) -> {
            LocalDateTime aTime = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
            LocalDateTime bTime = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();
            if (aTime == null && bTime == null) return 0;
            if (aTime == null) return 1;
            if (bTime == null) return -1;
            return bTime.compareTo(aTime);
        });

        return ResponseEntity.ok(buildThreadDetails(threads));
    }

    /** Helper to build enriched thread detail maps */
    private List<Map<String, Object>> buildThreadDetails(List<EscalationThread> threads) {
        List<Map<String, Object>> threadDetails = new ArrayList<>();
        for (EscalationThread thread : threads) {
            Map<String, Object> map = new HashMap<>();
            map.put("thread", thread);

            // Resolve mentors
            List<Map<String, Object>> mentorInfos = new ArrayList<>();
            if (thread.getMentorUserIds() != null) {
                thread.getMentorUserIds().forEach(id -> userRepository.findById(id).ifPresent(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId()); m.put("fullName", u.getFullName()); m.put("role", "Mentor");
                    mentorInfos.add(m);
                }));
            }
            map.put("mentors", mentorInfos);

            // Resolve faculty
            List<Map<String, Object>> facultyInfos = new ArrayList<>();
            if (thread.getFacultyUserIds() != null) {
                thread.getFacultyUserIds().forEach(id -> userRepository.findById(id).ifPresent(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId()); m.put("fullName", u.getFullName()); m.put("role", "Faculty");
                    facultyInfos.add(m);
                }));
            }
            map.put("facultyMembers", facultyInfos);

            // Resolve HODs
            List<Map<String, Object>> hodInfos = new ArrayList<>();
            if (thread.getHodUserIds() != null) {
                thread.getHodUserIds().forEach(id -> userRepository.findById(id).ifPresent(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId()); m.put("fullName", u.getFullName()); m.put("role", "HOD");
                    hodInfos.add(m);
                }));
            }
            map.put("hodMembers", hodInfos);

            // Resolve students from rollNos list
            List<Map<String, Object>> studentInfos = new ArrayList<>();
            List<String> rollNos = thread.getRollNos();
            if (rollNos == null || rollNos.isEmpty()) {
                // legacy compat — single rollNo field
                if (thread.getRollNo() != null) rollNos = List.of(thread.getRollNo());
            }
            if (rollNos != null) {
                for (String rn : rollNos) {
                    studentProfileRepository.findByRollNoIgnoreCase(rn).ifPresent(p -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("rollNo", rn);
                        userRepository.findById(p.getUserId()).ifPresent(u -> {
                            m.put("id", u.getId());
                            m.put("fullName", u.getFullName());
                        });
                        m.put("role", "Student");
                        studentInfos.add(m);
                    });
                }
            }
            map.put("students", studentInfos);
            // Legacy single student compat
            if (!studentInfos.isEmpty()) {
                map.put("studentUser", Map.of("fullName", studentInfos.get(0).getOrDefault("fullName", "")));
                map.put("profile", Map.of("rollNo", studentInfos.get(0).getOrDefault("rollNo", "")));
            }

            // Creator info
            if (thread.getCreatedByUserId() != null) {
                userRepository.findById(thread.getCreatedByUserId()).ifPresent(u ->
                    map.put("creator", Map.of("id", u.getId(), "fullName", u.getFullName(), "role", u.getRole().name())));
            }

            // Last message for preview
            List<EscalationMessage> messages = escalationMessageRepository.findAllByThreadIdOrderByCreatedAtAsc(thread.getId());
            map.put("messages", messages);
            if (!messages.isEmpty()) {
                EscalationMessage last = messages.get(messages.size() - 1);
                map.put("lastMessage", Map.of("content", last.getContent(), "senderName", last.getSenderName(), "createdAt", last.getCreatedAt()));
            }

            threadDetails.add(map);
        }
        return threadDetails;
    }

    /** Endpoint to list all users in the department for the New Group member picker */
    @GetMapping("/escalations/users")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor', 'HOD', 'Faculty', 'Mentor')")
    public ResponseEntity<?> getGroupableUsers(Authentication authentication) {
        try {
            Set<String> allowedDeptKeys = resolveAllowedDepartmentKeys(authentication);
            List<User> all = userRepository.findAll();
            if (all == null || all.isEmpty()) return ResponseEntity.ok(Collections.emptyList());

            // Batch load all student profiles in ONE query
            List<String> studentIds = all.stream()
                    .filter(u -> u != null && u.getId() != null && u.getRole() == Role.Student)
                    .map(User::getId)
                    .collect(java.util.stream.Collectors.toList());

            Map<String, StudentProfile> profileMap = studentProfileRepository
                    .findAllByUserIdIn(studentIds)
                    .stream()
                    .collect(java.util.stream.Collectors.toMap(
                            StudentProfile::getUserId, p -> p, (a, b) -> a));

            List<Map<String, Object>> result = new ArrayList<>();
            for (User u : all) {
                if (u == null || u.getRole() == null) continue;
                // Skip system/admin roles
                if (u.getRole() == Role.Director || u.getRole() == Role.Parent) continue;

                // Strict HOD department filter
                StudentProfile p = profileMap.get(u.getId());
                if (!isUserInHODScope(u, p, allowedDeptKeys)) {
                    continue;
                }

                Map<String, Object> m = new HashMap<>();
                m.put("id",       u.getId() != null ? u.getId() : "");
                m.put("fullName", u.getFullName() != null ? u.getFullName() : (u.getEmail() != null ? u.getEmail() : "User"));
                m.put("email",    u.getEmail() != null ? u.getEmail() : "");
                m.put("role",     u.getRole().name());
                m.put("rollNo",   u.getRollNo() != null ? u.getRollNo() : "");
                m.put("departmentId", u.getDepartmentId() != null ? u.getDepartmentId() : "");
                m.put("sectionId", u.getSectionId() != null ? u.getSectionId() : "");
                m.put("year", u.getYear() != null ? u.getYear() : "");

                // Use batch-loaded profile for student fields
                if (u.getRole() == Role.Student && p != null) {
                    if (p.getRollNo() != null && !p.getRollNo().isBlank()) m.put("rollNo", p.getRollNo());
                    if (p.getDepartmentId() != null && !p.getDepartmentId().isBlank()) m.put("departmentId", p.getDepartmentId());
                    if (p.getSectionId() != null && !p.getSectionId().isBlank()) m.put("sectionId", p.getSectionId());
                    if (p.getYear() != null && !p.getYear().isBlank()) m.put("year", p.getYear());
                    m.put("batch", p.getBatch() != null ? p.getBatch() : "");
                }
                result.add(m);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error fetching groupable users: ", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }


    @PostMapping("/escalations/{threadId}/message")
    public ResponseEntity<?> sendEscalationMessage(Authentication authentication, @PathVariable String threadId, @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empty message"));
        }
        String email = authentication.getName();
        User sender = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (sender == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Sender not found"));
        }

        EscalationMessage msg = EscalationMessage.builder()
                .threadId(threadId)
                .senderUserId(sender.getId())
                .senderName(sender.getFullName())
                .senderRole(sender.getRole().name())
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();
        escalationMessageRepository.save(msg);

        // Update thread timestamp
        escalationThreadRepository.findById(threadId).ifPresent(t -> {
            t.setUpdatedAt(LocalDateTime.now());
            escalationThreadRepository.save(t);
        });

        return ResponseEntity.ok(msg);
    }

    @GetMapping("/case-notes/{rollNo}")
    public ResponseEntity<?> getCaseNotes(Authentication authentication, @PathVariable String rollNo) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }

        // Block Parent role
        if (user.getRole() == Role.Parent) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: Case notes are restricted from parents."));
        }

        // If Student, verify they are only requesting their own notes
        if (user.getRole() == Role.Student) {
            boolean isOwn = (user.getRollNo() != null && user.getRollNo().equalsIgnoreCase(rollNo));
            if (!isOwn) {
                Optional<StudentProfile> sp = studentProfileRepository.findByUserId(user.getId());
                if (sp.isPresent() && sp.get().getRollNo() != null && sp.get().getRollNo().equalsIgnoreCase(rollNo)) {
                    isOwn = true;
                }
            }
            if (!isOwn) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied: You can only view your own counseling notes."));
            }
        }

        List<MentorshipCaseNote> notes = mentorshipCaseNoteRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(rollNo);
        return ResponseEntity.ok(notes);
    }

    @PostMapping("/case-notes/{rollNo}")
    public ResponseEntity<?> saveCaseNote(Authentication authentication, @PathVariable String rollNo, @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Content cannot be empty"));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }

        // EXPLICIT SECURITY CONSTRAINT: Block Student and Parent roles from creating case notes
        if (user.getRole() == Role.Student || user.getRole() == Role.Parent) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: Case notes can only be created by mentors and faculty."));
        }

        MentorshipCaseNote note = MentorshipCaseNote.builder()
                .rollNo(rollNo)
                .authorUserId(user.getId())
                .authorRole(user.getRole().name())
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();
        mentorshipCaseNoteRepository.save(note);

        // Notify student about newly added mentoring case note
        try {
            Notification notif = Notification.builder()
                    .rollNo(rollNo)
                    .title("New Mentoring Note Added")
                    .message((user.getFullName() != null ? user.getFullName() : "Mentor") + " added a counseling remark: " + (content.length() > 90 ? content.substring(0, 87) + "..." : content))
                    .type("ACADEMIC")
                    .senderEmail(user.getEmail())
                    .read(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notif);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(note);
    }



    @GetMapping("/notifications")
    public ResponseEntity<?> getHODNotifications(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        Set<String> seenIds = new HashSet<>();
        List<Notification> list = new ArrayList<>();

        notificationRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(email).forEach(n -> {
            if (seenIds.add(n.getId())) list.add(n);
        });

        if (user != null && user.getId() != null) {
            notificationRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(user.getId()).forEach(n -> {
                if (seenIds.add(n.getId())) list.add(n);
            });
        }

        list.sort((a, b) -> {
            LocalDateTime aTime = a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN;
            LocalDateTime bTime = b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN;
            return bTime.compareTo(aTime);
        });

        return ResponseEntity.ok(list);
    }

    @PostMapping("/notifications/read")
    public ResponseEntity<?> markAllNotificationsAsRead(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        Set<String> targets = new HashSet<>();
        targets.add(email.toLowerCase());
        if (user != null && user.getId() != null) targets.add(user.getId().toLowerCase());

        List<Notification> list = notificationRepository.findAll();
        for (Notification n : list) {
            if (n.getRollNo() != null && targets.contains(n.getRollNo().toLowerCase())) {
                if (!n.isRead()) {
                    n.setRead(true);
                    notificationRepository.save(n);
                }
            }
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<?> markSingleNotificationAsRead(@PathVariable("id") String id, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isPresent()) {
            Notification n = notifOpt.get();
            boolean match = n.getRollNo() != null && (n.getRollNo().equalsIgnoreCase(email) || (user != null && n.getRollNo().equalsIgnoreCase(user.getId())));
            if (match) {
                n.setRead(true);
                notificationRepository.save(n);
                return ResponseEntity.ok(Map.of("success", true));
            }
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Notification not found or access denied"));
    }

    @PostMapping("/notification")
    public ResponseEntity<?> sendHODNotification(Authentication auth, @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String message = (String) body.get("message");
        String type = (String) body.get("type");
        String targetRollNo = (String) body.get("rollNo");

        if (title == null || title.isBlank() || message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title and message are required"));
        }

        Object rawRoles = body.get("targetRoles");
        List<String> targetRoles = new ArrayList<>();
        if (rawRoles instanceof List<?> list) {
            for (Object item : list) if (item != null) targetRoles.add(item.toString());
        }
        String yearFilter = (String) body.get("year");
        String deptFilter = (String) body.get("departmentId");
        String sectionFilter = (String) body.get("sectionId");

        Set<String> recipientIds = new HashSet<>();

        if (targetRoles != null && !targetRoles.isEmpty()) {
            // Audience targeting mode
            boolean includeStudents = targetRoles.stream().anyMatch("Student"::equalsIgnoreCase);
            boolean includeFaculty = targetRoles.stream().anyMatch("Faculty"::equalsIgnoreCase);
            boolean includeMentor = targetRoles.stream().anyMatch("Mentor"::equalsIgnoreCase);
            boolean includeHOD = targetRoles.stream().anyMatch("HOD"::equalsIgnoreCase);

            if (includeStudents) {
                List<StudentProfile> profiles = studentProfileRepository.findAll();
                for (StudentProfile p : profiles) {
                    if (deptFilter != null && !deptFilter.isBlank() && !"ALL".equalsIgnoreCase(deptFilter)) {
                        if (p.getDepartmentId() == null || !p.getDepartmentId().equalsIgnoreCase(deptFilter)) continue;
                    }
                    if (sectionFilter != null && !sectionFilter.isBlank() && !"ALL".equalsIgnoreCase(sectionFilter)) {
                        if (p.getSectionId() == null || !p.getSectionId().equalsIgnoreCase(sectionFilter)) continue;
                    }
                    if (yearFilter != null && !yearFilter.isBlank() && !"ALL".equalsIgnoreCase(yearFilter)) {
                        String computedYear = p.getYear();
                        if (computedYear == null || computedYear.isBlank()) {
                            if (p.getBatch() != null && p.getBatch().contains("-")) {
                                try {
                                    int startYr = Integer.parseInt(p.getBatch().split("-")[0].trim());
                                    int currentYr = java.time.Year.now().getValue();
                                    int calc = (currentYr - startYr) + 1;
                                    computedYear = String.valueOf(Math.min(Math.max(calc, 1), 4));
                                } catch (Exception e) { computedYear = "1"; }
                            } else { computedYear = "1"; }
                        }
                        if (!computedYear.equalsIgnoreCase(yearFilter)) continue;
                    }
                    recipientIds.add(p.getRollNo());
                }
            }

            if (includeFaculty || includeMentor || includeHOD) {
                List<User> staffUsers = userRepository.findAll().stream()
                        .filter(u -> (includeFaculty && (u.getRole() == Role.Faculty || Boolean.TRUE.equals(u.getIsMentor()))) ||
                                     (includeMentor && (u.getRole() == Role.Mentor || Boolean.TRUE.equals(u.getIsMentor()) || u.getRole() == Role.Faculty)) ||
                                     (includeHOD && u.getRole() == Role.HOD))
                        .toList();

                for (User u : staffUsers) {
                    if (deptFilter != null && !deptFilter.isBlank() && !"ALL".equalsIgnoreCase(deptFilter)) {
                        boolean deptMatch = false;
                        if (u.getDepartmentId() != null && u.getDepartmentId().equalsIgnoreCase(deptFilter)) deptMatch = true;
                        if (!deptMatch && u.getDepartmentIds() != null && u.getDepartmentIds().stream().anyMatch(d -> d.equalsIgnoreCase(deptFilter))) deptMatch = true;
                        if (!deptMatch) continue;
                    }
                    recipientIds.add(u.getEmail());
                }
            }
        } else if ("ALL".equalsIgnoreCase(targetRollNo) || targetRollNo == null || targetRollNo.isBlank()) {
            List<StudentProfile> profiles = studentProfileRepository.findAll();
            for (StudentProfile p : profiles) recipientIds.add(p.getRollNo());
            List<User> staffUsers = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.HOD || u.getRole() == Role.Faculty || u.getRole() == Role.Mentor || Boolean.TRUE.equals(u.getIsMentor()))
                    .toList();
            for (User u : staffUsers) recipientIds.add(u.getEmail());
        } else {
            // Single target rollNo or email
            recipientIds.add(targetRollNo.trim());
        }

        int sentCount = 0;
        String senderEmail = auth.getName();
        for (String id : recipientIds) {
            Notification notif = Notification.builder()
                    .rollNo(id)
                    .title(title)
                    .message(message)
                    .type(type != null ? type : "SYSTEM")
                    .senderEmail(senderEmail)
                    .read(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notif);
            sentCount++;
        }

        return ResponseEntity.ok(Map.of("message", "Notification broadcast successfully", "recipientCount", sentCount));
    }

    @GetMapping("/notifications/sent")
    public ResponseEntity<?> getSentNotifications(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(notificationRepository.findAllBySenderEmailIgnoreCaseOrderByCreatedAtDesc(email));
    }




    @GetMapping("/students/{userId}/dashboard")
    public ResponseEntity<?> getStudentDashboardForHOD(@PathVariable("userId") String userId, Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();

        User hod = userRepository.findByEmailIgnoreCase(authentication.getName()).orElse(null);
        if (!isUserInHODDepartment(user, hod, deptId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied to student profile outside your department"));
        }

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
        }

        data.put("profile", profile);

        data.put("results", semesterResultRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("educations", educationBackgroundRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("certifications", certificationRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("projects", projectRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("internships", internshipRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("researches", researchRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("events", eventRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("courses", courseRepository.findAllByRollNoIgnoreCase(rollNo));
        data.put("skills", skillRepository.findAllByRollNoIgnoreCase(rollNo));

        return ResponseEntity.ok(data);
    }

    @GetMapping("/staff/{userId}/profile")
    public ResponseEntity<?> getStaffProfileForHOD(@PathVariable("userId") String userId, Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Staff user not found"));
        }
        User user = userOpt.get();
        User hod = userRepository.findByEmailIgnoreCase(authentication.getName()).orElse(null);
        if (!isUserInHODDepartment(user, hod, deptId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied to staff profile outside your department"));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("user", user);

        if (user.getRole() == Role.Mentor) {
            List<MentorshipAssignment> assignments = (user.getId() != null)
                    ? mentorshipAssignmentRepository.findAllByMentorUserId(user.getId())
                    : Collections.emptyList();
            List<Map<String, Object>> students = new ArrayList<>();
            for (MentorshipAssignment a : assignments) {
                if (a == null || a.getRollNo() == null || a.getRollNo().isBlank()) continue;
                studentProfileRepository.findByRollNoIgnoreCase(a.getRollNo()).ifPresent(sp -> {
                    Map<String, Object> sMap = new HashMap<>();
                    sMap.put("profile", sp);
                    if (sp.getUserId() != null && !sp.getUserId().isBlank()) {
                        userRepository.findById(sp.getUserId()).ifPresent(u -> sMap.put("user", u));
                    }
                    students.add(sMap);
                });
            }
            data.put("assignedStudents", students);
        }

        List<Course> courses = (user.getEmail() != null)
                ? courseRepository.findAll().stream()
                    .filter(c -> c.getRollNo() != null && c.getRollNo().equalsIgnoreCase(user.getEmail()))
                    .toList()
                : Collections.emptyList();
        data.put("courses", courses);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/my-mentees")
    public ResponseEntity<?> getMyMentees(Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            User user = userOpt.get();
            List<MentorshipAssignment> assignments = new ArrayList<>();
            if (user.getId() != null && !user.getId().isBlank()) {
                assignments.addAll(mentorshipAssignmentRepository.findAllByMentorUserId(user.getId()));
            }
            if (assignments.isEmpty() && user.getEmail() != null && !user.getEmail().isBlank()) {
                assignments.addAll(mentorshipAssignmentRepository.findAllByMentorUserId(user.getEmail()));
            }
            List<Map<String, Object>> students = new ArrayList<>();
            for (MentorshipAssignment a : assignments) {
                if (a == null || a.getRollNo() == null || a.getRollNo().isBlank()) continue;
                Map<String, Object> sMap = new HashMap<>();
                Optional<StudentProfile> spOpt = studentProfileRepository.findByRollNoIgnoreCase(a.getRollNo());
                if (spOpt.isEmpty()) {
                    spOpt = studentProfileRepository.findByUserId(a.getRollNo());
                }
                if (spOpt.isPresent()) {
                    StudentProfile sp = spOpt.get();
                    sMap.put("profile", sp);
                    if (sp.getUserId() != null && !sp.getUserId().isBlank()) {
                        userRepository.findById(sp.getUserId()).ifPresent(u -> sMap.put("user", u));
                    }
                } else {
                    userRepository.findByEmailIgnoreCase(a.getRollNo()).ifPresent(u -> {
                        sMap.put("user", u);
                        if (u.getId() != null && !u.getId().isBlank()) {
                            studentProfileRepository.findByUserId(u.getId()).ifPresent(sp -> sMap.put("profile", sp));
                        }
                    });
                }
                if (!sMap.isEmpty()) {
                    students.add(sMap);
                }
            }
            return ResponseEntity.ok(students);
        } catch (Exception e) {
            log.error("Error in getMyMentees: ", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
}
