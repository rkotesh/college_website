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

        // 2. Seed Director account (configured via environment variables)
        seedUser(directorEmail, directorPassword, "System Administrator (Director)", Role.Director, List.of());

        log.info("✓ Base data initialization completed successfully.");
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
