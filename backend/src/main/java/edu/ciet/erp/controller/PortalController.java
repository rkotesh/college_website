package edu.ciet.erp.controller;

import edu.ciet.erp.model.*;
import edu.ciet.erp.repository.*;
import edu.ciet.erp.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/v1/portal")
@RequiredArgsConstructor
public class PortalController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SemesterResultRepository semesterResultRepository;
    private final EducationBackgroundRepository educationBackgroundRepository;
    private final CertificationRepository certificationRepository;
    private final ProjectRepository projectRepository;
    private final InternshipRepository internshipRepository;
    private final ResearchRepository researchRepository;
    private final EventRepository eventRepository;
    private final CourseRepository courseRepository;
    private final SkillRepository skillRepository;
    private final OTPRecordRepository otpRecordRepository;
    private final NotificationRepository notificationRepository;
    private final MessageRepository messageRepository;
    private final PlatformSyncService platformSyncService;
    private final org.springframework.mail.javamail.JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;
    private final AnnouncementRepository announcementRepository;
    private final TrainingProgramRepository trainingProgramRepository;
    private final EscalationThreadRepository escalationThreadRepository;
    private final EscalationMessageRepository escalationMessageRepository;
    private final MentorshipAssignmentRepository mentorshipAssignmentRepository;

    @org.springframework.beans.factory.annotation.Value("${app.mail.from:noreply@ciet.edu}")
    private String fromEmail;

    @GetMapping("/student/dashboard")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentDashboard(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
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
            rollNo = email.split("@")[0].toUpperCase();
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

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            LocalDate cutoff = LocalDate.now().minusMonths(12);
            Map<String, Integer> activityMap = new HashMap<>();

            projects.forEach(item -> {
                if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff))
                    activityMap.merge(item.getCreatedAt().toLocalDate().format(fmt), 1, Integer::sum);
            });
            certifications.forEach(item -> {
                if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff))
                    activityMap.merge(item.getCreatedAt().toLocalDate().format(fmt), 1, Integer::sum);
            });
            internships.forEach(item -> {
                if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff))
                    activityMap.merge(item.getCreatedAt().toLocalDate().format(fmt), 1, Integer::sum);
            });
            research.forEach(item -> {
                if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff))
                    activityMap.merge(item.getCreatedAt().toLocalDate().format(fmt), 1, Integer::sum);
            });
            events.forEach(item -> {
                if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff))
                    activityMap.merge(item.getCreatedAt().toLocalDate().format(fmt), 1, Integer::sum);
            });
            courses.forEach(item -> {
                if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff))
                    activityMap.merge(item.getCreatedAt().toLocalDate().format(fmt), 1, Integer::sum);
            });
            data.put("activityMap", activityMap);
            int totalSubmissions = activityMap.values().stream().mapToInt(Integer::intValue).sum();
            data.put("totalSubmissions", totalSubmissions);

            double completeness = 0.0;
            if (profile.getPhotoUrl() != null && !profile.getPhotoUrl().isBlank()) completeness += 12.5;
            if (profile.getResumeUrl() != null && !profile.getResumeUrl().isBlank()) completeness += 12.5;
            if (profile.getProfileSummary() != null && !profile.getProfileSummary().isBlank()) completeness += 12.5;
            if (profile.isPersonalEmailVerified()) completeness += 12.5;
            if (profile.isPersonalPhoneVerified()) completeness += 12.5;
            
            boolean hasSocial = profile.getLinkedinUrl() != null && !profile.getLinkedinUrl().isBlank()
                    || profile.getGithubUrl() != null && !profile.getGithubUrl().isBlank()
                    || profile.getLeetcodeUrl() != null && !profile.getLeetcodeUrl().isBlank();
            if (hasSocial) completeness += 12.5;
            if (!education.isEmpty()) completeness += 12.5;
            if (!projects.isEmpty() || !certifications.isEmpty()) completeness += 12.5;
            
            data.put("profileCompleteness", completeness);
        }
        
        return ResponseEntity.ok(data);
    }

    @GetMapping("/public/portfolio/{slug}")
    public ResponseEntity<?> getPublicPortfolio(@PathVariable String slug) {
        Optional<StudentProfile> profileOpt = studentProfileRepository.findBySlug(slug);
        if (profileOpt.isEmpty()) {
            profileOpt = studentProfileRepository.findByRollNoIgnoreCase(slug);
        }
        
        if (profileOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        StudentProfile profile = profileOpt.get();
        if (!profile.isPublic()) {
            return ResponseEntity.status(403).body(Map.of("error", "This portfolio is private."));
        }
        
        String rollNo = profile.getRollNo();
        Optional<User> userOpt = userRepository.findById(profile.getUserId());
        
        Map<String, Object> data = new HashMap<>();
        userOpt.ifPresent(u -> {
            Map<String, String> publicUser = new HashMap<>();
            publicUser.put("fullName", u.getFullName());
            data.put("user", publicUser);
        });
        
        data.put("profile", profile);
        
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

        DateTimeFormatter fmt2 = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate cutoff2 = LocalDate.now().minusMonths(12);
        Map<String, Integer> activityMap2 = new HashMap<>();
        projects.forEach(item -> { if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff2)) activityMap2.merge(item.getCreatedAt().toLocalDate().format(fmt2), 1, Integer::sum); });
        certifications.forEach(item -> { if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff2)) activityMap2.merge(item.getCreatedAt().toLocalDate().format(fmt2), 1, Integer::sum); });
        internships.forEach(item -> { if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff2)) activityMap2.merge(item.getCreatedAt().toLocalDate().format(fmt2), 1, Integer::sum); });
        research.forEach(item -> { if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff2)) activityMap2.merge(item.getCreatedAt().toLocalDate().format(fmt2), 1, Integer::sum); });
        events.forEach(item -> { if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff2)) activityMap2.merge(item.getCreatedAt().toLocalDate().format(fmt2), 1, Integer::sum); });
        courses.forEach(item -> { if (item.getCreatedAt() != null && !item.getCreatedAt().toLocalDate().isBefore(cutoff2)) activityMap2.merge(item.getCreatedAt().toLocalDate().format(fmt2), 1, Integer::sum); });
        data.put("activityMap", activityMap2);
        data.put("totalSubmissions", activityMap2.values().stream().mapToInt(Integer::intValue).sum());

        double completeness = 0.0;
        if (profile.getPhotoUrl() != null && !profile.getPhotoUrl().isBlank()) completeness += 12.5;
        if (profile.getResumeUrl() != null && !profile.getResumeUrl().isBlank()) completeness += 12.5;
        if (profile.getProfileSummary() != null && !profile.getProfileSummary().isBlank()) completeness += 12.5;
        if (profile.isPersonalEmailVerified()) completeness += 12.5;
        if (profile.isPersonalPhoneVerified()) completeness += 12.5;
        boolean hasSocial = profile.getLinkedinUrl() != null && !profile.getLinkedinUrl().isBlank()
                || profile.getGithubUrl() != null && !profile.getGithubUrl().isBlank()
                || profile.getLeetcodeUrl() != null && !profile.getLeetcodeUrl().isBlank();
        if (hasSocial) completeness += 12.5;
        if (!education.isEmpty()) completeness += 12.5;
        if (!projects.isEmpty() || !certifications.isEmpty()) completeness += 12.5;
        data.put("profileCompleteness", completeness);
        
        return ResponseEntity.ok(data);
    }

    @GetMapping("/student/notifications")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentNotifications(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        String rollNo = profileOpt.isPresent() ? profileOpt.get().getRollNo() : email.split("@")[0].toUpperCase();

        List<Notification> list = notificationRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(rollNo);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/student/notifications/read")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> markNotificationsAsRead(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        String rollNo = profileOpt.isPresent() ? profileOpt.get().getRollNo() : email.split("@")[0].toUpperCase();

        List<Notification> list = notificationRepository.findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(rollNo);
        for (Notification n : list) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
    @GetMapping("/student/messaging-contacts")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentMessagingContacts(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User student = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(student.getId());
        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student profile not found"));
        }
        StudentProfile profile = profileOpt.get();
        String deptId = profile.getDepartmentId();

        List<Map<String, Object>> contacts = new ArrayList<>();

        // 1. Fetch HOD(s) for the department
        List<User> hods = userRepository.findAllByRole(Role.HOD);
        for (User hod : hods) {
            if (hod.getDepartmentIds() != null && hod.getDepartmentIds().contains(deptId)) {
                Map<String, Object> c = new HashMap<>();
                c.put("userId", hod.getId());
                c.put("fullName", hod.getFullName());
                c.put("email", hod.getEmail());
                c.put("role", "HOD");
                contacts.add(c);
            }
        }

        // 2. Fetch Mentor for the student
        Optional<MentorshipAssignment> assignmentOpt = mentorshipAssignmentRepository.findByRollNoIgnoreCase(profile.getRollNo());
        if (assignmentOpt.isPresent()) {
            String mentorId = assignmentOpt.get().getMentorUserId();
            userRepository.findById(mentorId).ifPresent(m -> {
                Map<String, Object> c = new HashMap<>();
                c.put("userId", m.getId());
                c.put("fullName", m.getFullName());
                c.put("email", m.getEmail());
                c.put("role", "Mentor");
                contacts.add(c);
            });
        }

        // 3. Fetch Faculty members for the department
        List<User> faculties = userRepository.findAllByRole(Role.Faculty);
        for (User f : faculties) {
            if (f.getDepartmentIds() != null && f.getDepartmentIds().contains(deptId)) {
                boolean exists = contacts.stream().anyMatch(c -> c.get("userId").equals(f.getId()));
                if (!exists) {
                    Map<String, Object> c = new HashMap<>();
                    c.put("userId", f.getId());
                    c.put("fullName", f.getFullName());
                    c.put("email", f.getEmail());
                    c.put("role", "Faculty");
                    contacts.add(c);
                }
            }
        }

        return ResponseEntity.ok(contacts);
    }

    @GetMapping("/student/messages")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentMessages(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        String rollNo = profileOpt.isPresent() ? profileOpt.get().getRollNo() : email.split("@")[0].toUpperCase();

        List<Message> list = messageRepository.findAllByStudentRollNoOrderByTimestampAsc(rollNo);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/student/messages")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> sendStudentMessage(Authentication authentication, @RequestBody Map<String, String> payload) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User student = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(student.getId());
        String rollNo = profileOpt.isPresent() ? profileOpt.get().getRollNo() : email.split("@")[0].toUpperCase();

        String text = payload.get("messageText");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message text cannot be empty"));
        }

        String recipientId = payload.get("recipientId");
        if (recipientId == null || recipientId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Recipient ID is required"));
        }

        Optional<User> recipientOpt = userRepository.findById(recipientId);
        if (recipientOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Recipient not found"));
        }
        User recipient = recipientOpt.get();

        Message m = Message.builder()
            .studentRollNo(rollNo)
            .senderId(student.getId())
            .senderName(student.getFullName() != null ? student.getFullName() : student.getEmail())
            .senderRole("Student")
            .recipientId(recipient.getId())
            .recipientName(recipient.getFullName() != null ? recipient.getFullName() : recipient.getEmail())
            .recipientRole(recipient.getRole().name())
            .messageText(text)
            .incoming(false)
            .build();
        messageRepository.save(m);

        return ResponseEntity.ok(messageRepository.findAllByStudentRollNoOrderByTimestampAsc(rollNo));
    }
    @PutMapping("/student/profile")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateStudentProfile(Authentication authentication, @RequestBody StudentProfile updatedProfile) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student profile not found"));
        }
        StudentProfile profile = profileOpt.get();
        
        if (updatedProfile.getPersonalEmail() != null) {
            if (!updatedProfile.getPersonalEmail().equalsIgnoreCase(profile.getPersonalEmail())) {
                profile.setPersonalEmail(updatedProfile.getPersonalEmail());
                profile.setPersonalEmailVerified(false);
            }
        }
        if (updatedProfile.getPersonalPhone() != null) {
            if (!updatedProfile.getPersonalPhone().equals(profile.getPersonalPhone())) {
                profile.setPersonalPhone(updatedProfile.getPersonalPhone());
                profile.setPersonalPhoneVerified(false);
            }
        }
        
        if (updatedProfile.getProfileSummary() != null) profile.setProfileSummary(updatedProfile.getProfileSummary());
        if (updatedProfile.getPhotoUrl() != null) profile.setPhotoUrl(updatedProfile.getPhotoUrl());
        if (updatedProfile.getResumeUrl() != null) profile.setResumeUrl(updatedProfile.getResumeUrl());
        
        profile.setLinkedinUrl(updatedProfile.getLinkedinUrl());
        profile.setGithubUrl(updatedProfile.getGithubUrl());
        profile.setLeetcodeUrl(updatedProfile.getLeetcodeUrl());
        profile.setHackerrankUrl(updatedProfile.getHackerrankUrl());
        profile.setCodechefUrl(updatedProfile.getCodechefUrl());
        profile.setCodeforcesUrl(updatedProfile.getCodeforcesUrl());
        
        profile.setPublic(updatedProfile.isPublic());
        profile.setShowEmailOnProfile(updatedProfile.isShowEmailOnProfile());
        profile.setShowResumeOnProfile(updatedProfile.isShowResumeOnProfile());
        profile.setShowLinkedinOnProfile(updatedProfile.isShowLinkedinOnProfile());
        profile.setShowGithubOnProfile(updatedProfile.isShowGithubOnProfile());
        profile.setShowLeetcodeOnProfile(updatedProfile.isShowLeetcodeOnProfile());
        profile.setShowHackerrankOnProfile(updatedProfile.isShowHackerrankOnProfile());
        profile.setShowCodechefOnProfile(updatedProfile.isShowCodechefOnProfile());
        profile.setShowCodeforcesOnProfile(updatedProfile.isShowCodeforcesOnProfile());
        
        profile.setLeetcodeEasySolved(updatedProfile.getLeetcodeEasySolved());
        profile.setLeetcodeMediumSolved(updatedProfile.getLeetcodeMediumSolved());
        profile.setLeetcodeHardSolved(updatedProfile.getLeetcodeHardSolved());
        profile.setGithubReposCount(updatedProfile.getGithubReposCount());
        profile.setGithubCommitsCount(updatedProfile.getGithubCommitsCount());
        
        profile.setUpdatedAt(LocalDateTime.now());
        studentProfileRepository.save(profile);
        
        if (updatedProfile.getSlug() != null && !updatedProfile.getSlug().isBlank()) {
            user.setFullName(updatedProfile.getSlug());
            userRepository.save(user);
        }
        
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully", "profile", profile));
    }

    @PostMapping("/student/sync-platforms")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> syncPlatforms(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student profile not found"));
        }
        StudentProfile profile = profileOpt.get();
        
        platformSyncService.syncPlatforms(profile);
        studentProfileRepository.save(profile);
        
        return ResponseEntity.ok(Map.of("message", "Platform stats synced successfully", "profile", profile));
    }

    @PostMapping("/student/verify-email/request")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> verifyEmailRequest(Authentication authentication, @RequestBody Map<String, String> body) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        
        String personalEmail = body.get("email");
        if (personalEmail == null || personalEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        
        otpRecordRepository.deleteAllByUserIdAndPurposeAndIsUsedFalse(user.getId(), "EMAIL_VERIFICATION");

        String otp = String.format("%06d", new Random().nextInt(1000000));
        OTPRecord otpRecord = OTPRecord.builder()
                .userId(user.getId())
                .otpCode(otp)
                .purpose("EMAIL_VERIFICATION")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .isUsed(false)
                .build();
        otpRecordRepository.save(otpRecord);
        
        try {
            org.springframework.mail.SimpleMailMessage mailMessage = new org.springframework.mail.SimpleMailMessage();
            mailMessage.setFrom(fromEmail != null ? fromEmail : "noreply@ciet.edu");
            mailMessage.setTo(personalEmail);
            mailMessage.setSubject("Your CIET ERP Personal Email Verification OTP");
            mailMessage.setText("Hello,\n\nYour OTP for verifying your personal email address is: " + otp + "\n\nThis code expires in 10 minutes.\n\n— CIET ERP System");
            mailSender.send(mailMessage);
            log.info("OTP email successfully sent to personal email {}", personalEmail);
        } catch (Exception e) {
            log.warn("Failed to dispatch OTP email via SMTP to personal email {}: {}", personalEmail, e.getMessage());
        }
        
        log.info("SENT OTP CODE [{}] TO EMAIL [{}] FOR STUDENT VERIFICATION", otp, personalEmail);
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully to " + personalEmail, "mockOtp", otp));
    }

    @PostMapping("/student/verify-email/confirm")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> verifyEmailConfirm(Authentication authentication, @RequestBody Map<String, String> body) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student user not found"));
        }
        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student profile not found"));
        }
        StudentProfile profile = profileOpt.get();
        
        String personalEmail = body.get("email");
        String code = body.get("code");
        if (personalEmail == null || code == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and OTP code are required"));
        }
        
        Optional<OTPRecord> otpOpt = otpRecordRepository.findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                user.getId(), "EMAIL_VERIFICATION", LocalDateTime.now());
        
        if (otpOpt.isEmpty() || !otpOpt.get().getOtpCode().equals(code.trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification code"));
        }
        
        OTPRecord otpRecord = otpOpt.get();
        otpRecord.setUsed(true);
        otpRecordRepository.save(otpRecord);
        
        profile.setPersonalEmail(personalEmail);
        profile.setPersonalEmailVerified(true);
        studentProfileRepository.save(profile);
        
        return ResponseEntity.ok(Map.of("message", "Email verified successfully", "profile", profile));
    }

    @PostMapping("/student/education")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addEducation(Authentication authentication, @RequestBody EducationBackground edu) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        String rollNo = profileOpt.get().getRollNo();
        Optional<EducationBackground> existing = educationBackgroundRepository.findByRollNoIgnoreCaseAndEduType(rollNo, edu.getEduType());
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Education of type " + edu.getEduType() + " already exists. Edit the existing one."));
        }
        
        edu.setId(null);
        edu.setRollNo(rollNo);
        edu.setVerified(false);
        edu.setCreatedAt(LocalDateTime.now());
        edu.setUpdatedAt(LocalDateTime.now());
        
        educationBackgroundRepository.save(edu);
        return ResponseEntity.ok(edu);
    }

    @PutMapping("/student/education/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateEducation(Authentication authentication, @PathVariable String id, @RequestBody EducationBackground edu) {
        Optional<EducationBackground> opt = educationBackgroundRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        EducationBackground record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be modified"));
        }
        record.setInstitution(edu.getInstitution());
        record.setBoardUniversity(edu.getBoardUniversity());
        record.setYearOfPassing(edu.getYearOfPassing());
        record.setScore(edu.getScore());
        record.setScoreType(edu.getScoreType());
        record.setUpdatedAt(LocalDateTime.now());
        
        educationBackgroundRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/education/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteEducation(Authentication authentication, @PathVariable String id) {
        Optional<EducationBackground> opt = educationBackgroundRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        EducationBackground record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be deleted"));
        }
        educationBackgroundRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/projects")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addProject(Authentication authentication, @RequestBody Project proj) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        proj.setId(null);
        proj.setRollNo(profileOpt.get().getRollNo());
        proj.setVerified(false);
        proj.setCreatedAt(LocalDateTime.now());
        proj.setUpdatedAt(LocalDateTime.now());
        
        if (proj.isFeatured()) {
            List<Project> others = projectRepository.findAllByRollNoIgnoreCase(proj.getRollNo());
            for (Project o : others) {
                if (o.isFeatured()) {
                    o.setFeatured(false);
                    projectRepository.save(o);
                }
            }
        }
        
        projectRepository.save(proj);
        return ResponseEntity.ok(proj);
    }

    @PutMapping("/student/projects/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateProject(Authentication authentication, @PathVariable String id, @RequestBody Project proj) {
        Optional<Project> opt = projectRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Project record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be modified"));
        }
        record.setTitle(proj.getTitle());
        record.setProjectType(proj.getProjectType());
        record.setDescription(proj.getDescription());
        record.setTechStack(proj.getTechStack());
        record.setRepoUrl(proj.getRepoUrl());
        record.setCoverImageUrl(proj.getCoverImageUrl());
        record.setGroup(proj.isGroup());
        record.setTeamSize(proj.getTeamSize());
        record.setUpdatedAt(LocalDateTime.now());
        
        if (proj.isFeatured()) {
            List<Project> others = projectRepository.findAllByRollNoIgnoreCase(record.getRollNo());
            for (Project o : others) {
                if (!o.getId().equals(record.getId()) && o.isFeatured()) {
                    o.setFeatured(false);
                    projectRepository.save(o);
                }
            }
        }
        record.setFeatured(proj.isFeatured());
        
        projectRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/projects/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteProject(Authentication authentication, @PathVariable String id) {
        Optional<Project> opt = projectRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Project record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be deleted"));
        }
        projectRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/certifications")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addCertification(Authentication authentication, @RequestBody Certification cert) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        cert.setId(null);
        cert.setRollNo(profileOpt.get().getRollNo());
        cert.setVerified(false);
        cert.setCreatedAt(LocalDateTime.now());
        cert.setUpdatedAt(LocalDateTime.now());
        
        if (cert.isFeatured()) {
            List<Certification> others = certificationRepository.findAllByRollNoIgnoreCase(cert.getRollNo());
            for (Certification o : others) {
                if (o.isFeatured()) {
                    o.setFeatured(false);
                    certificationRepository.save(o);
                }
            }
        }
        
        certificationRepository.save(cert);
        return ResponseEntity.ok(cert);
    }

    @PutMapping("/student/certifications/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateCertification(Authentication authentication, @PathVariable String id, @RequestBody Certification cert) {
        Optional<Certification> opt = certificationRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Certification record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be modified"));
        }
        record.setTitle(cert.getTitle());
        record.setCertType(cert.getCertType());
        record.setIssuer(cert.getIssuer());
        record.setIssuedDate(cert.getIssuedDate());
        record.setCertUrl(cert.getCertUrl());
        record.setFileUrl(cert.getFileUrl());
        record.setDescription(cert.getDescription());
        record.setUpdatedAt(LocalDateTime.now());
        
        if (cert.isFeatured()) {
            List<Certification> others = certificationRepository.findAllByRollNoIgnoreCase(record.getRollNo());
            for (Certification o : others) {
                if (!o.getId().equals(record.getId()) && o.isFeatured()) {
                    o.setFeatured(false);
                    certificationRepository.save(o);
                }
            }
        }
        record.setFeatured(cert.isFeatured());
        
        certificationRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/certifications/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteCertification(Authentication authentication, @PathVariable String id) {
        Optional<Certification> opt = certificationRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Certification record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be deleted"));
        }
        certificationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/internships")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addInternship(Authentication authentication, @RequestBody Internship intern) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        intern.setId(null);
        intern.setRollNo(profileOpt.get().getRollNo());
        intern.setVerified(false);
        intern.setCreatedAt(LocalDateTime.now());
        intern.setUpdatedAt(LocalDateTime.now());
        
        if (intern.isFeatured()) {
            List<Internship> others = internshipRepository.findAllByRollNoIgnoreCase(intern.getRollNo());
            for (Internship o : others) {
                if (o.isFeatured()) {
                    o.setFeatured(false);
                    internshipRepository.save(o);
                }
            }
        }
        
        internshipRepository.save(intern);
        return ResponseEntity.ok(intern);
    }

    @PutMapping("/student/internships/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateInternship(Authentication authentication, @PathVariable String id, @RequestBody Internship intern) {
        Optional<Internship> opt = internshipRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Internship record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be modified"));
        }
        record.setOrganization(intern.getOrganization());
        record.setRole(intern.getRole());
        record.setStartDate(intern.getStartDate());
        record.setEndDate(intern.getEndDate());
        record.setTechnologies(intern.getTechnologies());
        record.setDescription(intern.getDescription());
        record.setSupervisorName(intern.getSupervisorName());
        record.setSupervisorEmail(intern.getSupervisorEmail());
        record.setCertificateUrl(intern.getCertificateUrl());
        record.setUpdatedAt(LocalDateTime.now());
        
        if (intern.isFeatured()) {
            List<Internship> others = internshipRepository.findAllByRollNoIgnoreCase(record.getRollNo());
            for (Internship o : others) {
                if (!o.getId().equals(record.getId()) && o.isFeatured()) {
                    o.setFeatured(false);
                    internshipRepository.save(o);
                }
            }
        }
        record.setFeatured(intern.isFeatured());
        
        internshipRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/internships/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteInternship(Authentication authentication, @PathVariable String id) {
        Optional<Internship> opt = internshipRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Internship record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be deleted"));
        }
        internshipRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/research")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addResearch(Authentication authentication, @RequestBody Research res) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        res.setId(null);
        res.setRollNo(profileOpt.get().getRollNo());
        res.setVerified(false);
        res.setCreatedAt(LocalDateTime.now());
        res.setUpdatedAt(LocalDateTime.now());
        
        researchRepository.save(res);
        return ResponseEntity.ok(res);
    }

    @PutMapping("/student/research/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateResearch(Authentication authentication, @PathVariable String id, @RequestBody Research res) {
        Optional<Research> opt = researchRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Research record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be modified"));
        }
        record.setResearchType(res.getResearchType());
        record.setTitle(res.getTitle());
        record.setAdvisorName(res.getAdvisorName());
        record.setAdvisorEmail(res.getAdvisorEmail());
        record.setOutcome(res.getOutcome());
        record.setPublisher(res.getPublisher());
        record.setPublicationUrl(res.getPublicationUrl());
        record.setPublishedDate(res.getPublishedDate());
        record.setUpdatedAt(LocalDateTime.now());
        
        researchRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/research/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteResearch(Authentication authentication, @PathVariable String id) {
        Optional<Research> opt = researchRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Research record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be deleted"));
        }
        researchRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/events")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addEvent(Authentication authentication, @RequestBody Event ev) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        ev.setId(null);
        ev.setRollNo(profileOpt.get().getRollNo());
        ev.setCreatedAt(LocalDateTime.now());
        ev.setUpdatedAt(LocalDateTime.now());
        
        eventRepository.save(ev);
        return ResponseEntity.ok(ev);
    }

    @PutMapping("/student/events/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateEvent(Authentication authentication, @PathVariable String id, @RequestBody Event ev) {
        Optional<Event> opt = eventRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Event record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        record.setName(ev.getName());
        record.setScope(ev.getScope());
        record.setRole(ev.getRole());
        record.setPosition(ev.getPosition());
        record.setOrganizer(ev.getOrganizer());
        record.setLocation(ev.getLocation());
        record.setEventDate(ev.getEventDate());
        record.setUpdatedAt(LocalDateTime.now());
        
        eventRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/events/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteEvent(Authentication authentication, @PathVariable String id) {
        Optional<Event> opt = eventRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Event record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        eventRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/courses")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addCourse(Authentication authentication, @RequestBody Course crs) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));
        
        crs.setId(null);
        crs.setRollNo(profileOpt.get().getRollNo());
        crs.setVerified(false);
        crs.setCreatedAt(LocalDateTime.now());
        crs.setUpdatedAt(LocalDateTime.now());
        
        courseRepository.save(crs);
        return ResponseEntity.ok(crs);
    }

    @PutMapping("/student/courses/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateCourse(Authentication authentication, @PathVariable String id, @RequestBody Course crs) {
        Optional<Course> opt = courseRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Course record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be modified"));
        }
        record.setTitle(crs.getTitle());
        record.setSource(crs.getSource());
        record.setPlatform(crs.getPlatform());
        record.setCompletionPercentage(crs.getCompletionPercentage());
        record.setCertificateUrl(crs.getCertificateUrl());
        record.setUpdatedAt(LocalDateTime.now());
        
        courseRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/courses/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteCourse(Authentication authentication, @PathVariable String id) {
        Optional<Course> opt = courseRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Course record = opt.get();
        
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || !record.getRollNo().equalsIgnoreCase(profile.getRollNo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }
        
        if (record.isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Verified records cannot be deleted"));
        }
        courseRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @PostMapping("/student/skills")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> addSkill(Authentication authentication, @RequestBody Skill skl) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
        if (profileOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Profile not found"));

        // Use roll number from profile; fall back to email prefix if null
        String rollNo = profileOpt.get().getRollNo();
        if (rollNo == null || rollNo.isBlank()) {
            rollNo = email.split("@")[0].toUpperCase();
        }

        // Build via builder so @Builder.Default timestamps are properly initialised
        Skill toSave = Skill.builder()
                .rollNo(rollNo)
                .name(skl.getName())
                .category(skl.getCategory())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        skillRepository.save(toSave);
        return ResponseEntity.ok(toSave);
    }

    @PutMapping("/student/skills/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> updateSkill(Authentication authentication, @PathVariable String id, @RequestBody Skill skl) {
        Optional<Skill> opt = skillRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Skill record = opt.get();

        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        String authEmail = authentication.getName();
        String profileRollNo = (profile != null && profile.getRollNo() != null)
                ? profile.getRollNo()
                : authEmail.split("@")[0].toUpperCase();
        String recordRollNo = record.getRollNo() != null ? record.getRollNo() : "";
        if (!recordRollNo.equalsIgnoreCase(profileRollNo)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }

        record.setName(skl.getName());
        record.setCategory(skl.getCategory());
        record.setUpdatedAt(LocalDateTime.now());

        skillRepository.save(record);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/student/skills/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> deleteSkill(Authentication authentication, @PathVariable String id) {
        Optional<Skill> opt = skillRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Record not found"));
        Skill record = opt.get();

        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        String authEmail = authentication.getName();
        String profileRollNo = (profile != null && profile.getRollNo() != null)
                ? profile.getRollNo()
                : authEmail.split("@")[0].toUpperCase();
        String recordRollNo = record.getRollNo() != null ? record.getRollNo() : "";
        if (!recordRollNo.equalsIgnoreCase(profileRollNo)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not own this record"));
        }

        skillRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Record deleted"));
    }

    @GetMapping("/parent/dashboard")
    @PreAuthorize("hasAnyAuthority('ROLE_Parent')")
    public ResponseEntity<?> getParentDashboard(Authentication authentication, @RequestParam(required = false) String rollNo) {
        String targetRollNo = rollNo;
        boolean lookupByAuth = (targetRollNo == null || targetRollNo.isBlank());
        
        if (!lookupByAuth) {
            // Check if profile exists with this roll number
            if (!studentProfileRepository.existsByRollNoIgnoreCase(targetRollNo.trim())) {
                lookupByAuth = true;
            }
        }

        Optional<StudentProfile> profileOpt = Optional.empty();
        if (lookupByAuth && authentication != null) {
            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isPresent()) {
                profileOpt = studentProfileRepository.findByUserId(userOpt.get().getId());
            }
        } else if (targetRollNo != null) {
            profileOpt = studentProfileRepository.findByRollNoIgnoreCase(targetRollNo.trim());
        }

        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student profile not found. Please verify the roll number."));
        }

        StudentProfile profile = profileOpt.get();
        Optional<User> studentUserOpt = userRepository.findById(profile.getUserId());
        String rollNoTrim = profile.getRollNo();

        List<SemesterResult> results = semesterResultRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<EducationBackground> education = educationBackgroundRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Certification> certifications = certificationRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Project> projects = projectRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Internship> internships = internshipRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Research> research = researchRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Event> events = eventRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Course> courses = courseRepository.findAllByRollNoIgnoreCase(rollNoTrim);
        List<Skill> skills = skillRepository.findAllByRollNoIgnoreCase(rollNoTrim);

        Map<String, Object> data = new HashMap<>();
        data.put("profile", profile);
        studentUserOpt.ifPresent(u -> data.put("studentUser", u));
        data.put("results", results);
        data.put("education", education);
        data.put("certifications", certifications);
        data.put("projects", projects);
        data.put("internships", internships);
        data.put("research", research);
        data.put("events", events);
        data.put("courses", courses);
        data.put("skills", skills);

        // Fetch Mentor
        Optional<MentorshipAssignment> assignmentOpt = mentorshipAssignmentRepository.findByRollNoIgnoreCase(rollNoTrim);
        if (assignmentOpt.isPresent()) {
            String mentorId = assignmentOpt.get().getMentorUserId();
            Optional<User> mentorOpt = userRepository.findById(mentorId);
            mentorOpt.ifPresent(m -> {
                Map<String, Object> mInfo = new HashMap<>();
                mInfo.put("fullName", m.getFullName());
                mInfo.put("email", m.getEmail());
                mInfo.put("phone", m.getPhone());
                data.put("mentor", mInfo);
            });
        }

        return ResponseEntity.ok(data);
    }

    @GetMapping("/faculty/dashboard")
    @PreAuthorize("hasAnyAuthority('ROLE_Faculty', 'ROLE_Mentor')")
    public ResponseEntity<?> getFacultyDashboard(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Faculty user not found"));
        }
        User faculty = userOpt.get();
        List<String> depts = faculty.getDepartmentIds();
        
        List<User> students = new ArrayList<>();
        if (depts == null || depts.isEmpty()) {
            students = userRepository.findAllByRole(Role.Student);
        } else {
            for (String dept : depts) {
                List<User> deptUsers = userRepository.findAllByRole(Role.Student);
                for (User u : deptUsers) {
                    if (u.getDepartmentIds() != null && u.getDepartmentIds().contains(dept)) {
                        students.add(u);
                    }
                }
            }
        }
        
        List<Map<String, Object>> studentsData = new ArrayList<>();
        for (User s : students) {
            Map<String, Object> map = new HashMap<>();
            map.put("user", s);
            studentProfileRepository.findByUserId(s.getId()).ifPresent(p -> map.put("profile", p));
            studentsData.add(map);
        }

        return ResponseEntity.ok(Map.of(
            "faculty", faculty,
            "students", studentsData
        ));
    }

    @GetMapping("/hod/dashboard")
    @PreAuthorize("hasAnyAuthority('ROLE_HOD', 'ROLE_Faculty', 'ROLE_Mentor')")
    public ResponseEntity<?> getHodDashboard(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "HOD user not found"));
        }
        User hod = userOpt.get();
        List<String> depts = hod.getDepartmentIds();
        
        List<User> allStudents = userRepository.findAllByRole(Role.Student);
        List<Map<String, Object>> deptStudents = new ArrayList<>();
        double totalCgpa = 0.0;
        int cgpaCount = 0;
        
        int tierA = 0;
        int tierB = 0;
        int tierC = 0;
        int tierD = 0;
        
        for (User u : allStudents) {
            boolean matchesDept = depts == null || depts.isEmpty();
            if (!matchesDept) {
                for (String d : depts) {
                    if (u.getDepartmentIds() != null && u.getDepartmentIds().contains(d)) {
                        matchesDept = true;
                        break;
                    }
                }
            }
            
            if (matchesDept) {
                Map<String, Object> map = new HashMap<>();
                map.put("user", u);
                Optional<StudentProfile> pOpt = studentProfileRepository.findByUserId(u.getId());
                if (pOpt.isPresent()) {
                    StudentProfile p = pOpt.get();
                    map.put("profile", p);
                    if (p.getCgpa() > 0) {
                        totalCgpa += p.getCgpa();
                        cgpaCount++;
                        if (p.getCgpa() >= 9.0) tierA++;
                        else if (p.getCgpa() >= 8.0) tierB++;
                        else if (p.getCgpa() >= 7.0) tierC++;
                        else tierD++;
                    }
                }
                deptStudents.add(map);
            }
        }
        
        double avgCgpa = cgpaCount > 0 ? (totalCgpa / cgpaCount) : 0.0;

        return ResponseEntity.ok(Map.of(
            "hod", hod,
            "students", deptStudents,
            "metrics", Map.of(
                "totalStudents", deptStudents.size(),
                "averageCgpa", avgCgpa,
                "tierA", tierA,
                "tierB", tierB,
                "tierC", tierC,
                "tierD", tierD
            )
        ));
    }

    private StudentProfile getAuthenticatedStudentProfile(Authentication authentication) {
        if (authentication == null) return null;
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return null;
        return studentProfileRepository.findByUserId(userOpt.get().getId()).orElse(null);
    }

    @GetMapping("/public/departments")
    public ResponseEntity<?> getPublicDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @PutMapping("/student/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> changePassword(Authentication authentication, @RequestBody Map<String, String> body) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        if (currentPassword == null || newPassword == null || currentPassword.isBlank() || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password and new password are required"));
        }
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Incorrect current password"));
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/student/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        try {
            java.io.File uploadDir = new java.io.File("uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = UUID.randomUUID().toString() + extension;
            java.nio.file.Path targetPath = uploadDir.toPath().resolve(newFilename);
            java.nio.file.Files.copy(file.getInputStream(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            
            String fileUrl = "/api/v1/portal/public/files/" + newFilename;
            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "File upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/public/files/{filename:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> getUploadedFile(@PathVariable String filename) {
        try {
            java.nio.file.Path filePath = java.nio.file.Paths.get("uploads").resolve(filename).normalize();
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                String contentType = "application/octet-stream";
                try {
                    contentType = java.nio.file.Files.probeContentType(filePath);
                } catch (Exception ex) {
                    // ignore
                }
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/public/contact")
    public ResponseEntity<?> sendContactMessage(@RequestBody Map<String, String> body) {
        String studentSlug = body.get("studentSlug");
        String senderName = body.get("name");
        String senderEmail = body.get("email");
        String senderMessage = body.get("message");

        if (studentSlug == null || studentSlug.isBlank() || senderName == null || senderName.isBlank() || senderEmail == null || senderEmail.isBlank() || senderMessage == null || senderMessage.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required"));
        }

        Optional<StudentProfile> profileOpt = studentProfileRepository.findBySlug(studentSlug);
        if (profileOpt.isEmpty()) {
            profileOpt = studentProfileRepository.findByRollNoIgnoreCase(studentSlug);
        }

        if (profileOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        }

        StudentProfile profile = profileOpt.get();
        Notification notification = Notification.builder()
                .rollNo(profile.getRollNo())
                .title("New message from " + senderName + " (via Public Portfolio)")
                .message("Name: " + senderName + "\nEmail: " + senderEmail + "\n\nMessage:\n" + senderMessage)
                .type("SYSTEM")
                .read(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        return ResponseEntity.ok(Map.of("message", "Message sent successfully"));
    }

    @GetMapping("/student/announcements")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentAnnouncements(Authentication authentication) {
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || profile.getDepartmentId() == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<Announcement> all = announcementRepository.findAll().stream()
                .filter(a -> matchesDepartment(a.getDepartmentId(), profile.getDepartmentId()))
                .toList();
        List<Announcement> unique = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (Announcement a : all) {
            if (a.getTitle() == null || a.getContent() == null) continue;
            String key = (a.getTitle().trim() + "|" + a.getContent().trim()).toLowerCase();
            if (!seen.contains(key)) {
                seen.add(key);
                unique.add(a);
            }
        }
        return ResponseEntity.ok(unique);
    }

    @GetMapping("/student/trainings")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentTrainings(Authentication authentication) {
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null || profile.getDepartmentId() == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<TrainingProgram> all = trainingProgramRepository.findAll().stream()
                .filter(t -> matchesDepartment(t.getDepartmentId(), profile.getDepartmentId()))
                .toList();
        List<TrainingProgram> unique = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (TrainingProgram t : all) {
            if (t.getTitle() == null) continue;
            String venue = t.getVenue() != null ? t.getVenue().trim() : "";
            String category = t.getCategory() != null ? t.getCategory().trim() : "";
            String key = (t.getTitle().trim() + "|" + venue + "|" + category).toLowerCase();
            if (!seen.contains(key)) {
                seen.add(key);
                unique.add(t);
            }
        }
        return ResponseEntity.ok(unique);
    }

    private boolean matchesDepartment(String deptId1, String deptId2) {
        if (deptId1 == null || deptId2 == null) return false;
        if (deptId1.equalsIgnoreCase(deptId2)) return true;
        String code1 = resolveDeptCode(deptId1);
        String code2 = resolveDeptCode(deptId2);
        return code1.equalsIgnoreCase(code2);
    }

    private String resolveDeptCode(String deptId) {
        Optional<Department> dOpt = departmentRepository.findById(deptId);
        if (dOpt.isPresent()) {
            return dOpt.get().getCode();
        }
        return deptId;
    }

    @GetMapping("/student/escalations")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> getStudentEscalationThreads(Authentication authentication) {
        StudentProfile profile = getAuthenticatedStudentProfile(authentication);
        if (profile == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<EscalationThread> threads = escalationThreadRepository.findAllByRollNoIgnoreCase(profile.getRollNo());
        List<Map<String, Object>> result = new ArrayList<>();
        for (EscalationThread t : threads) {
            Map<String, Object> map = new HashMap<>();
            map.put("thread", t);

            List<User> mentorUsers = new ArrayList<>();
            if (t.getMentorUserIds() != null) {
                t.getMentorUserIds().forEach(id -> userRepository.findById(id).ifPresent(mentorUsers::add));
            }
            map.put("mentors", mentorUsers);
            if (!mentorUsers.isEmpty()) {
                map.put("mentor", mentorUsers.get(0));
            }

            List<User> facultyUsers = new ArrayList<>();
            if (t.getFacultyUserIds() != null) {
                t.getFacultyUserIds().forEach(id -> userRepository.findById(id).ifPresent(facultyUsers::add));
            }
            map.put("facultyMembers", facultyUsers);
            if (!facultyUsers.isEmpty()) {
                map.put("faculty", facultyUsers.get(0));
            }

            List<EscalationMessage> messages = escalationMessageRepository.findAllByThreadIdOrderByCreatedAtAsc(t.getId());
            map.put("messages", messages);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/student/escalations/{threadId}/message")
    @PreAuthorize("hasAnyAuthority('ROLE_Student')")
    public ResponseEntity<?> sendStudentEscalationMessage(Authentication authentication, @PathVariable String threadId, @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }
        String email = authentication.getName();
        User student = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));
        }

        EscalationMessage msg = EscalationMessage.builder()
                .threadId(threadId)
                .senderUserId(student.getId())
                .senderName(student.getFullName())
                .senderRole("Student")
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();
        escalationMessageRepository.save(msg);

        escalationThreadRepository.findById(threadId).ifPresent(t -> {
            t.setUpdatedAt(LocalDateTime.now());
            escalationThreadRepository.save(t);
        });

        return ResponseEntity.ok(msg);
    }
}
