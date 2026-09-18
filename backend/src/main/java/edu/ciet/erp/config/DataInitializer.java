package edu.ciet.erp.config;

import edu.ciet.erp.model.*;
import edu.ciet.erp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;
    private final StudentProfileRepository studentProfileRepository;

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

        // 2. Seed Director account (configured via environment variables or securely generated)
        String effectivePassword = directorPassword;
        if (effectivePassword == null || effectivePassword.isBlank()) {
            effectivePassword = generateSecurePassword();
            log.warn("\n===========================================================\n" +
                     "[SECURITY NOTICE] No DIRECTOR_PASSWORD set in environment.\n" +
                     "Auto-generated temporary Director password for {}: {}\n" +
                     "Set DIRECTOR_PASSWORD in your .env or hosting environment.\n" +
                     "===========================================================", directorEmail, effectivePassword);
        }
        seedUser(directorEmail, effectivePassword, "System Administrator (Director)", Role.Director, List.of());

        // 3. Seed initial staff & student accounts if database is empty/fresh
        if (userRepository.count() <= 1) {
            String defaultStaffPass = generateSecurePassword();
            log.info("[INITIAL SEED] Provisioning starter institutional accounts with temporary passwords...");
            seedUser("hod.aiml@ciet.edu.in", defaultStaffPass, "Dr. K. Srinivas", Role.HOD, List.of("AIML"));
            seedUser("faculty.aiml@ciet.edu.in", defaultStaffPass, "Prof. M. Prasanna", Role.Faculty, List.of("AIML"));
            seedUser("mentor.aiml@ciet.edu.in", defaultStaffPass, "Dr. V. Ramesh", Role.Mentor, List.of("AIML"));
            
            // Seed a sample student
            Optional<User> studentUser = userRepository.findByEmailIgnoreCase("21cs001@ciet.edu.in");
            if (studentUser.isEmpty()) {
                User s = User.builder()
                        .email("21cs001@ciet.edu.in")
                        .passwordHash(passwordEncoder.encode("21CS001"))
                        .fullName("Rahul Sharma")
                        .role(Role.Student)
                        .departmentIds(List.of("AIML"))
                        .departmentId("AIML")
                        .rollNo("21CS001")
                        .year("4")
                        .sectionId("A")
                        .batch("2021-2025")
                        .isActive(true)
                        .createdAt(java.time.LocalDateTime.now())
                        .updatedAt(java.time.LocalDateTime.now())
                        .build();
                User savedStudent = userRepository.save(s);
                studentProfileRepository.save(StudentProfile.builder()
                        .userId(savedStudent.getId())
                        .rollNo("21CS001")
                        .batch("2021-2025")
                        .departmentId("AIML")
                        .year("4")
                        .sectionId("A")
                        .cgpa(8.75)
                        .slug("rahul-sharma-21cs001")
                        .isPublic(true)
                        .profileSummary("Final year AIML scholar passionate about Machine Learning and Distributed Systems.")
                        .academicStatus(AcademicStatus.ACTIVE)
                        .createdAt(java.time.LocalDateTime.now())
                        .updatedAt(java.time.LocalDateTime.now())
                        .build());
                log.info("Seeded sample student: 21CS001 (Rahul Sharma)");
            }
        }

        log.info("✓ Base data initialization completed successfully.");
    }

    private String generateSecurePassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder(16);
        for (int i = 0; i < 16; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
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
                    .createdAt(java.time.LocalDateTime.now())
                    .updatedAt(java.time.LocalDateTime.now())
                    .build();
            userRepository.save(user);
            log.info("Seeded {} account: {}", role, email);
        } else {
            // Update department IDs if missing
            User user = existing.get();
            if (user.getDepartmentIds() == null || user.getDepartmentIds().isEmpty()) {
                user.setDepartmentIds(departmentIds);
                userRepository.save(user);
            }
        }
    }


}
