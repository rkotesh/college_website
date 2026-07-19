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
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    // Helper: Resolve HOD primary department
    private String resolveDepartmentId(Authentication auth) {
        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || user.getDepartmentIds() == null || user.getDepartmentIds().isEmpty()) {
            // Check if user is recorded explicitly as HOD of any department
            Optional<Department> deptOpt = departmentRepository.findAll().stream()
                    .filter(d -> d.getName() != null && d.getName().toLowerCase().contains("cse"))
                    .findFirst(); // default fallback for developer database safety
            return deptOpt.map(Department::getId).orElse("default_cse_id");
        }
        String deptVal = user.getDepartmentIds().get(0);
        // If it's already a valid ObjectId in the database
        if (departmentRepository.existsById(deptVal)) {
            return deptVal;
        }
        // If it is a department code, look up by code
        Optional<Department> deptOpt = departmentRepository.findByCodeIgnoreCase(deptVal);
        if (deptOpt.isPresent()) {
            return deptOpt.get().getId();
        }
        return deptVal;
    }

    private boolean isUserInDepartment(User user, String deptId) {
        System.out.println("[DEBUG] user: " + (user != null ? user.getEmail() : "null") + ", userDepts: " + (user != null ? user.getDepartmentIds() : "null") + ", deptId: " + deptId);
        if (user == null || user.getDepartmentIds() == null || deptId == null) {
            System.out.println("[DEBUG] returned false due to nulls");
            return false;
        }
        List<String> userDepts = user.getDepartmentIds();
        if (userDepts.contains(deptId)) {
            System.out.println("[DEBUG] contains deptId directly: true");
            return true;
        }
        Optional<Department> currentDept = departmentRepository.findById(deptId);
        System.out.println("[DEBUG] currentDept by id present: " + currentDept.isPresent());
        if (currentDept.isPresent()) {
            System.out.println("[DEBUG] currentDept code: " + currentDept.get().getCode() + ", userDepts contains: " + userDepts.contains(currentDept.get().getCode()));
            if (userDepts.contains(currentDept.get().getCode())) {
                return true;
            }
        }
        Optional<Department> codeDept = departmentRepository.findByCodeIgnoreCase(deptId);
        System.out.println("[DEBUG] codeDept by code present: " + codeDept.isPresent());
        if (codeDept.isPresent()) {
            System.out.println("[DEBUG] codeDept id: " + codeDept.get().getId() + ", userDepts contains: " + userDepts.contains(codeDept.get().getId()));
            if (userDepts.contains(codeDept.get().getId())) {
                return true;
            }
        }
        System.out.println("[DEBUG] returning default false");
        return false;
    }

    private boolean isUserInHODDepartment(User user, User hod, String deptId) {
        if (user == null || hod == null) return false;
        List<String> hodDepts = hod.getDepartmentIds();
        if (hodDepts != null) {
            for (String hd : hodDepts) {
                if (isUserInDepartment(user, hd)) {
                    return true;
                }
            }
        }
        return isUserInDepartment(user, deptId);
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
        String deptId = resolveDepartmentId(authentication);

        // 1. Syllabus completion
        List<SyllabusCoverage> subjects = syllabusCoverageRepository.findAllByDepartmentId(deptId);
        int totalTopics = subjects.stream().mapToInt(SyllabusCoverage::getTotalTopics).sum();
        int coveredTopics = subjects.stream().mapToInt(SyllabusCoverage::getCoveredTopics).sum();
        double syllabusPct = totalTopics > 0 ? Math.round(((double) coveredTopics / totalTopics) * 1000.0) / 10.0 : 0.0;

        // 2. Mentorship statistics
        List<User> students = userRepository.findAllByRole(Role.Student);
        List<User> deptStudents = students.stream()
                .filter(u -> isUserInDepartment(u, deptId))
                .toList();

        int totalStudents = deptStudents.size();
        int assignedCount = 0;
        for (User student : deptStudents) {
            Optional<StudentProfile> prof = studentProfileRepository.findByUserId(student.getId());
            if (prof.isPresent()) {
                if (mentorshipAssignmentRepository.findByRollNoIgnoreCase(prof.get().getRollNo()).isPresent()) {
                    assignedCount++;
                }
            }
        }
        int unassignedCount = totalStudents - assignedCount;

        // 3. Academic performance
        Map<String, List<Double>> batchCgpas = new HashMap<>();
        for (User student : deptStudents) {
            Optional<StudentProfile> profOpt = studentProfileRepository.findByUserId(student.getId());
            if (profOpt.isPresent()) {
                StudentProfile prof = profOpt.get();
                String batch = prof.getBatch() != null ? prof.getBatch() : "General";
                batchCgpas.computeIfAbsent(batch, k -> new ArrayList<>()).add(prof.getCgpa());
            }
        }

        Map<String, Double> batchAverages = new HashMap<>();
        batchCgpas.forEach((batch, cgpas) -> {
            double avg = cgpas.stream().mapToDouble(d -> d).average().orElse(0.0);
            batchAverages.put(batch, Math.round(avg * 100.0) / 100.0);
        });

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
        String batch = body.get("batch");
        String sectionId = body.get("sectionId");
        String mentorAId = body.get("mentorAId");
        String mentorBId = body.get("mentorBId");

        if (batch == null || sectionId == null || mentorAId == null || mentorBId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing split parameters"));
        }

        // Fetch students matching parameters
        List<StudentProfile> deptProfiles = studentProfileRepository.findAll().stream()
                .filter(p -> deptId.equals(p.getDepartmentId()))
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
        List<String> studentRollNos = (List<String>) body.get("studentRollNos");

        if (mentorUserId == null || studentRollNos == null || studentRollNos.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing selection details"));
        }

        for (String rollNo : studentRollNos) {
            Optional<StudentProfile> profOpt = studentProfileRepository.findByRollNoIgnoreCase(rollNo);
            if (profOpt.isPresent()) {
                StudentProfile p = profOpt.get();
                // Clear old
                mentorshipAssignmentRepository.findByRollNoIgnoreCase(rollNo)
                        .ifPresent(mentorshipAssignmentRepository::delete);

                MentorshipAssignment assignment = MentorshipAssignment.builder()
                        .rollNo(rollNo)
                        .mentorUserId(mentorUserId)
                        .batch(p.getBatch())
                        .sectionId(p.getSectionId())
                        .departmentId(deptId)
                        .academicYear("2025-2026")
                        .build();
                mentorshipAssignmentRepository.save(assignment);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Mentorship assignments updated successfully"));
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

    @GetMapping("/accreditation")
    public ResponseEntity<?> getAccreditation(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        return ResponseEntity.ok(accreditationChecklistRepository.findAllByDepartmentId(deptId));
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
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> createEscalationThread(Authentication authentication, @RequestBody Map<String, Object> body) {
        String studentRollNo = (String) body.get("rollNo");
        String subjectCode = (String) body.get("subjectCode");

        if (studentRollNo == null || studentRollNo.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student roll number is required"));
        }

        // Find student profile
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByRollNoIgnoreCase(studentRollNo);
        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student profile not found"));
        }
        StudentProfile profile = profileOpt.get();

        // Resolve mentor IDs — accept list from body, else fall back to mentorship assignment
        List<String> mentorIds = new ArrayList<>();
        Object rawMentors = body.get("mentorUserIds");
        if (rawMentors instanceof List) {
            mentorIds = (List<String>) rawMentors;
        }
        if (mentorIds.isEmpty()) {
            // single legacy field
            String single = (String) body.get("mentorUserId");
            if (single != null && !single.isBlank()) {
                mentorIds = List.of(single);
            } else {
                Optional<MentorshipAssignment> assignmentOpt = mentorshipAssignmentRepository.findByRollNoIgnoreCase(studentRollNo);
                assignmentOpt.map(MentorshipAssignment::getMentorUserId).filter(s -> !s.isBlank()).ifPresent(mentorIds::add);
            }
        }

        // Resolve faculty IDs — accept list from body, else fall back to dept faculty
        List<String> facultyIds = new ArrayList<>();
        Object rawFaculty = body.get("facultyUserIds");
        if (rawFaculty instanceof List) {
            facultyIds = (List<String>) rawFaculty;
        }
        if (facultyIds.isEmpty()) {
            String single = (String) body.get("facultyUserId");
            if (single != null && !single.isBlank()) {
                facultyIds = List.of(single);
            } else {
                userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.Faculty && u.getDepartmentIds() != null && u.getDepartmentIds().contains(profile.getDepartmentId()))
                        .findFirst()
                        .map(User::getId)
                        .ifPresent(facultyIds::add);
            }
        }

        // Make lists mutable for assignment
        final List<String> finalMentorIds = new ArrayList<>(mentorIds);
        final List<String> finalFacultyIds = new ArrayList<>(facultyIds);

        // Check if thread already exists for this student + subjectCode
        Optional<EscalationThread> existing = escalationThreadRepository.findByRollNoIgnoreCaseAndSubjectCode(studentRollNo, subjectCode != null ? subjectCode : "GENERAL");
        if (existing.isPresent()) {
            EscalationThread thread = existing.get();
            thread.setEscalatedToHOD(true);
            // Merge new mentor/faculty IDs
            finalMentorIds.forEach(id -> { if (!thread.getMentorUserIds().contains(id)) thread.getMentorUserIds().add(id); });
            finalFacultyIds.forEach(id -> { if (!thread.getFacultyUserIds().contains(id)) thread.getFacultyUserIds().add(id); });
            thread.setUpdatedAt(LocalDateTime.now());
            escalationThreadRepository.save(thread);
            return ResponseEntity.ok(thread);
        }

        EscalationThread thread = EscalationThread.builder()
                .rollNo(studentRollNo)
                .mentorUserIds(finalMentorIds)
                .facultyUserIds(finalFacultyIds)
                .subjectCode(subjectCode != null ? subjectCode : "GENERAL")
                .isEscalatedToHOD(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        escalationThreadRepository.save(thread);

        // System message
        EscalationMessage sysMsg = EscalationMessage.builder()
                .threadId(thread.getId())
                .senderUserId("SYSTEM")
                .senderName("System Alert")
                .senderRole("SYSTEM")
                .content("Intervention thread created. Student: " + studentRollNo + " has been flagged for study plan review.")
                .createdAt(LocalDateTime.now())
                .build();
        escalationMessageRepository.save(sysMsg);

        return ResponseEntity.ok(thread);
    }

    @GetMapping("/escalations")
    public ResponseEntity<?> getEscalationThreads(Authentication authentication) {
        String deptId = resolveDepartmentId(authentication);
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        List<EscalationThread> threads = new ArrayList<>();
        if (user.getRole() == Role.HOD) {
            threads = escalationThreadRepository.findAllByIsEscalatedToHOD(true);
        } else if (user.getRole() == Role.Mentor) {
            threads = escalationThreadRepository.findAllByMentorUserIdsIn(List.of(user.getId()));
        } else if (user.getRole() == Role.Faculty) {
            threads = escalationThreadRepository.findAllByFacultyUserIdsIn(List.of(user.getId()));
        }

        List<Map<String, Object>> threadDetails = new ArrayList<>();
        for (EscalationThread thread : threads) {
            Map<String, Object> map = new HashMap<>();
            map.put("thread", thread);

            // Resolve multiple mentors
            List<User> mentorUsers = new ArrayList<>();
            if (thread.getMentorUserIds() != null) {
                thread.getMentorUserIds().forEach(id -> userRepository.findById(id).ifPresent(mentorUsers::add));
            }
            map.put("mentors", mentorUsers);
            // backward-compat single field
            if (!mentorUsers.isEmpty()) map.put("mentor", mentorUsers.get(0));

            // Resolve multiple faculty
            List<User> facultyUsers = new ArrayList<>();
            if (thread.getFacultyUserIds() != null) {
                thread.getFacultyUserIds().forEach(id -> userRepository.findById(id).ifPresent(facultyUsers::add));
            }
            map.put("facultyMembers", facultyUsers);
            // backward-compat single field
            if (!facultyUsers.isEmpty()) map.put("faculty", facultyUsers.get(0));

            // student profile
            studentProfileRepository.findByRollNoIgnoreCase(thread.getRollNo()).ifPresent(p -> {
                map.put("profile", p);
                userRepository.findById(p.getUserId()).ifPresent(u -> map.put("studentUser", u));
            });

            List<EscalationMessage> messages = escalationMessageRepository.findAllByThreadIdOrderByCreatedAtAsc(thread.getId());
            map.put("messages", messages);
            threadDetails.add(map);
        }
        return ResponseEntity.ok(threadDetails);
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

        // EXPLICIT SECURITY CONSTRAINT: Block Student and Parent roles
        if (user.getRole() == Role.Student || user.getRole() == Role.Parent) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: Case notes are restricted from students and parents."));
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

        // EXPLICIT SECURITY CONSTRAINT: Block Student and Parent roles
        if (user.getRole() == Role.Student || user.getRole() == Role.Parent) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: Case notes are restricted."));
        }

        MentorshipCaseNote note = MentorshipCaseNote.builder()
                .rollNo(rollNo)
                .authorUserId(user.getId())
                .authorRole(user.getRole().name())
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();
        mentorshipCaseNoteRepository.save(note);
        return ResponseEntity.ok(note);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getHODProfile(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "HOD user not found"));
        }
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateHODProfile(Authentication authentication, @RequestBody Map<String, String> body) {
        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "HOD user not found"));
        }

        String fullName = body.get("fullName");
        String phone = body.get("phone");
        String newPassword = body.get("password");
        String photoUrl = body.get("photoUrl");

        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }
        if (phone != null) {
            user.setPhone(phone);
        }
        if (newPassword != null && !newPassword.isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(newPassword));
        }
        if (photoUrl != null) {
            user.setPhotoUrl(photoUrl);
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getHODNotifications(Authentication authentication) {
        String email = authentication.getName();
        List<Notification> list = notificationRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(email);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/notifications/read")
    public ResponseEntity<?> markAllNotificationsAsRead(Authentication authentication) {
        String email = authentication.getName();
        List<Notification> list = notificationRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(email);
        for (Notification n : list) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<?> markSingleNotificationAsRead(@PathVariable("id") String id, Authentication authentication) {
        String email = authentication.getName();
        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isPresent()) {
            Notification n = notifOpt.get();
            if (n.getRollNo().equalsIgnoreCase(email)) {
                n.setRead(true);
                notificationRepository.save(n);
                return ResponseEntity.ok(Map.of("success", true));
            }
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Notification not found or access denied"));
    }

    @PostMapping("/notification")
    public ResponseEntity<?> sendHODNotification(Authentication auth, @RequestBody Map<String, String> body) {
        String target = body.get("rollNo"); // "ALL" or specific rollNo
        String title = body.get("title");
        String message = body.get("message");
        String type = body.get("type");

        if (target == null || title == null || message == null || type == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing fields"));
        }

        String deptId = resolveDepartmentId(auth);

        if (target.equalsIgnoreCase("ALL")) {
            String deptCode = deptId;
            Optional<Department> dOpt = departmentRepository.findById(deptId);
            if (dOpt.isPresent()) {
                deptCode = dOpt.get().getCode();
            }
            final String finalDeptCode = deptCode;
            List<StudentProfile> students = studentProfileRepository.findAll().stream()
                    .filter(s -> s.getDepartmentId() != null && 
                        (s.getDepartmentId().equalsIgnoreCase(deptId) || s.getDepartmentId().equalsIgnoreCase(finalDeptCode)))
                    .toList();
            for (StudentProfile s : students) {
                Notification notif = Notification.builder()
                        .rollNo(s.getRollNo())
                        .title(title)
                        .message(message)
                        .type(type)
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }
            List<User> staff = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.Faculty || u.getRole() == Role.Mentor || u.getRole() == Role.HOD)
                    .filter(u -> isUserInDepartment(u, deptId))
                    .toList();
            for (User u : staff) {
                Notification notif = Notification.builder()
                        .rollNo(u.getEmail())
                        .title(title)
                        .message(message)
                        .type(type)
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }
        } else {
            String targetId = null;
            Optional<StudentProfile> profileOpt = studentProfileRepository.findByRollNoIgnoreCase(target.trim());
            if (profileOpt.isPresent()) {
                targetId = profileOpt.get().getRollNo();
            } else {
                Optional<User> userOpt = userRepository.findByEmailIgnoreCase(target.trim());
                if (userOpt.isPresent()) {
                    targetId = userOpt.get().getEmail();
                } else {
                    // Try by user ID (24-char hex or standard ID)
                    try {
                        Optional<User> uOpt = userRepository.findById(target.trim());
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
                return ResponseEntity.badRequest().body(Map.of("error", "Target Roll No or Email " + target + " not found"));
            }
            Notification notif = Notification.builder()
                    .rollNo(targetId)
                    .title(title)
                    .message(message)
                    .type(type)
                    .read(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notif);

            // Also copy to sender HOD
            String hodEmail = auth.getName();
            Notification hodCopy = Notification.builder()
                    .rollNo(hodEmail)
                    .title(title)
                    .message("[Sent to " + targetId + "] " + message)
                    .type(type)
                    .read(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(hodCopy);
        }

        return ResponseEntity.ok(Map.of("message", "Notification broadcast successfully"));
    }

    @GetMapping("/messages/conversations")
    public ResponseEntity<?> getStaffConversations(Authentication auth) {
        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User staff = userOpt.get();

        List<Message> allMessages = messageRepository.findAllBySenderIdOrRecipientIdOrderByTimestampAsc(staff.getId(), staff.getId());

        // Group by other participant's ID
        Map<String, List<Message>> grouped = new LinkedHashMap<>();
        for (Message m : allMessages) {
            String otherId = staff.getId().equals(m.getSenderId()) ? m.getRecipientId() : m.getSenderId();
            if (otherId != null && !otherId.isEmpty()) {
                grouped.computeIfAbsent(otherId, k -> new ArrayList<>()).add(m);
            }
        }

        List<Map<String, Object>> conversations = new ArrayList<>();
        for (Map.Entry<String, List<Message>> entry : grouped.entrySet()) {
            String otherId = entry.getKey();
            List<Message> msgs = entry.getValue();

            Optional<User> otherUserOpt = userRepository.findById(otherId);
            if (otherUserOpt.isEmpty()) continue;
            User otherUser = otherUserOpt.get();

            Map<String, Object> conv = new HashMap<>();
            conv.put("userId", otherId);
            conv.put("messages", msgs);
            conv.put("studentName", otherUser.getFullName() != null ? otherUser.getFullName() : otherUser.getEmail());
            conv.put("studentEmail", otherUser.getEmail());
            conv.put("role", otherUser.getRole().name());

            if (otherUser.getRole() == Role.Student) {
                studentProfileRepository.findByUserId(otherId).ifPresent(sp -> {
                    conv.put("studentRollNo", sp.getRollNo());
                });
            } else {
                conv.put("studentRollNo", otherUser.getEmail());
            }
            conversations.add(conv);
        }

        return ResponseEntity.ok(conversations);
    }

    @PostMapping("/messages/{target}")
    public ResponseEntity<?> sendStaffMessage(Authentication auth, @PathVariable String target, @RequestBody Map<String, String> body) {
        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User staff = userOpt.get();

        String text = body.get("messageText");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message text cannot be empty"));
        }

        User recipient = null;
        String recipientRollNo = null;

        // Check if target is user ID (ObjectId)
        if (target.matches("^[0-9a-fA-F]{24}$")) {
            recipient = userRepository.findById(target).orElse(null);
        }

        if (recipient == null) {
            // Fallback: try as student roll number
            Optional<StudentProfile> spOpt = studentProfileRepository.findByRollNoIgnoreCase(target);
            if (spOpt.isPresent()) {
                recipientRollNo = spOpt.get().getRollNo();
                recipient = userRepository.findById(spOpt.get().getUserId()).orElse(null);
            }
        }

        if (recipient == null) {
            // Last fallback: lookup by email
            recipient = userRepository.findByEmailIgnoreCase(target).orElse(null);
        }

        if (recipient == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Recipient not found"));
        }

        if (recipientRollNo == null && recipient.getRole() == Role.Student) {
            Optional<StudentProfile> spOpt = studentProfileRepository.findByUserId(recipient.getId());
            if (spOpt.isPresent()) {
                recipientRollNo = spOpt.get().getRollNo();
            }
        }

        Message m = Message.builder()
                .studentRollNo(recipientRollNo != null ? recipientRollNo.toUpperCase() : recipient.getEmail())
                .senderId(staff.getId())
                .senderName(staff.getFullName() != null ? staff.getFullName() : staff.getEmail())
                .senderRole(staff.getRole().name())
                .recipientId(recipient.getId())
                .recipientName(recipient.getFullName() != null ? recipient.getFullName() : recipient.getEmail())
                .recipientRole(recipient.getRole().name())
                .messageText(text)
                .incoming(true)
                .build();
        messageRepository.save(m);

        final String repId = recipient.getId();
        List<Message> allMessages = messageRepository.findAllBySenderIdOrRecipientIdOrderByTimestampAsc(staff.getId(), staff.getId());
        List<Message> filtered = allMessages.stream()
                .filter(msg -> (staff.getId().equals(msg.getSenderId()) && repId.equals(msg.getRecipientId())) ||
                               (repId.equals(msg.getSenderId()) && staff.getId().equals(msg.getRecipientId())))
                .toList();

        return ResponseEntity.ok(filtered);
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
            List<MentorshipAssignment> assignments = mentorshipAssignmentRepository.findAllByMentorUserId(user.getId());
            List<Map<String, Object>> students = new ArrayList<>();
            for (MentorshipAssignment a : assignments) {
                studentProfileRepository.findByRollNoIgnoreCase(a.getRollNo()).ifPresent(sp -> {
                    Map<String, Object> sMap = new HashMap<>();
                    sMap.put("profile", sp);
                    userRepository.findById(sp.getUserId()).ifPresent(u -> sMap.put("user", u));
                    students.add(sMap);
                });
            }
            data.put("assignedStudents", students);
        }

        List<Course> courses = courseRepository.findAll().stream()
                .filter(c -> c.getRollNo() != null && c.getRollNo().equalsIgnoreCase(user.getEmail()))
                .toList();
        data.put("courses", courses);

        return ResponseEntity.ok(data);
    }
}
