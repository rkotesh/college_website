package edu.ciet.erp.config;

import edu.ciet.erp.model.*;
import edu.ciet.erp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
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

    @org.springframework.beans.factory.annotation.Value("${app.director.email}")
    private String directorEmail;

    @org.springframework.beans.factory.annotation.Value("${app.director.password}")
    private String directorPassword;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Departments & Sections first so we can map users to them
        if (departmentRepository.count() == 0) {
            departmentRepository.save(Department.builder().code("CSE").name("Computer Science and Engineering").sections(List.of("A", "B", "C")).build());
            departmentRepository.save(Department.builder().code("ECE").name("Electronics and Communication Engineering").sections(List.of("A", "B")).build());
            departmentRepository.save(Department.builder().code("EEE").name("Electrical and Electronics Engineering").sections(List.of("A")).build());
            departmentRepository.save(Department.builder().code("AI").name("Artificial Intelligence").sections(List.of("A")).build());
            departmentRepository.save(Department.builder().code("AIML").name("AI and Machine Learning").sections(List.of("A", "B")).build());
            log.info("Seeded default departments.");
        }

        // Get resolved ID of CSE department
        Optional<Department> cseOpt = departmentRepository.findByCodeIgnoreCase("CSE");
        String cseId = cseOpt.isPresent() ? cseOpt.get().getId() : "default_cse_id";

        // 2. Seed Director
        seedUser(directorEmail, directorPassword, "System Administrator (Director)", Role.Director, List.of());

        // 3. Seed HOD
        seedUser("hod@ciet.edu.in", "hod123", "Prof. Suresh (HOD)", Role.HOD, List.of(cseId));

        // 4. Seed Faculty
        seedUser("faculty@ciet.edu.in", "faculty123", "Dr. Ramesh (Faculty)", Role.Faculty, List.of(cseId));

        // 5. Seed Mentor
        seedUser("mentor@ciet.edu.in", "mentor123", "Dr. Satish (Mentor)", Role.Mentor, List.of(cseId));

        // 6. Seed Student & StudentProfile
        seedStudent("student@ciet.edu.in", "22B01A0501", "Ravi Kumar", cseId);

        log.info("✓ Base development data seeding completed successfully.");
    }

    private void seedUser(String email, String rawPassword, String name, Role role, List<String> departmentIds) {
        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        if (existing.isEmpty()) {
            User user = User.builder()
                    .email(email.toLowerCase())
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .fullName(name)
                    .role(role)
                    .departmentIds(departmentIds)
                    .isActive(true)
                    .build();
            userRepository.save(user);
            log.info("Seeded default {} user: {}", role, email);
        } else {
            // Update department IDs if missing
            User user = existing.get();
            if (user.getDepartmentIds() == null || user.getDepartmentIds().isEmpty()) {
                user.setDepartmentIds(departmentIds);
                userRepository.save(user);
            }
        }
    }

    private void seedStudent(String email, String rollNo, String name, String cseId) {
        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(email);
        User studentUser;
        if (existingUser.isEmpty()) {
            User user = User.builder()
                    .email(email.toLowerCase())
                    .passwordHash(passwordEncoder.encode(rollNo)) // default password is roll number
                    .fullName(name)
                    .role(Role.Student)
                    .departmentIds(List.of(cseId))
                    .isActive(true)
                    .build();
            studentUser = userRepository.save(user);
            log.info("Seeded default Student user: {}", email);
        } else {
            studentUser = existingUser.get();
            if (studentUser.getDepartmentIds() == null || studentUser.getDepartmentIds().isEmpty()) {
                studentUser.setDepartmentIds(List.of(cseId));
                userRepository.save(studentUser);
            }
        }

        if (!studentProfileRepository.existsByRollNoIgnoreCase(rollNo)) {
            StudentProfile profile = StudentProfile.builder()
                    .userId(studentUser.getId())
                    .rollNo(rollNo)
                    .batch("2022-2026")
                    .departmentId(cseId)
                    .sectionId("A")
                    .cgpa(8.03)
                    .slug(rollNo.toLowerCase() + "-student")
                    .personalEmail("ravi.personal@gmail.com")
                    .personalPhone("9876543210")
                    .build();
            studentProfileRepository.save(profile);
            log.info("Seeded default Student profile for: {}", rollNo);
        } else {
            // Update profile with departmentId if not set
            studentProfileRepository.findByRollNoIgnoreCase(rollNo).ifPresent(p -> {
                if (p.getDepartmentId() == null || p.getDepartmentId().equals("default_cse_id")) {
                    p.setDepartmentId(cseId);
                    p.setSectionId("A");
                    studentProfileRepository.save(p);
                }
            });
        }
    }


}
