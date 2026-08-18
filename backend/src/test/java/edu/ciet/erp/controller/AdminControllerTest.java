package edu.ciet.erp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ciet.erp.model.Role;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.*;
import edu.ciet.erp.security.JwtAuthenticationFilter;
import edu.ciet.erp.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AdminController REST Tests")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean private UserRepository userRepository;
    @MockBean private StudentProfileRepository studentProfileRepository;
    @MockBean private SemesterResultRepository semesterResultRepository;
    @MockBean private OTPRecordRepository otpRecordRepository;
    @MockBean private PasswordEncoder passwordEncoder;
    @MockBean private JavaMailSender mailSender;
    @MockBean private DepartmentRepository departmentRepository;
    @MockBean private NotificationRepository notificationRepository;
    @MockBean private EducationBackgroundRepository educationBackgroundRepository;
    @MockBean private CertificationRepository certificationRepository;
    @MockBean private ProjectRepository projectRepository;
    @MockBean private InternshipRepository internshipRepository;
    @MockBean private ResearchRepository researchRepository;
    @MockBean private EventRepository eventRepository;
    @MockBean private CourseRepository courseRepository;
    @MockBean private SkillRepository skillRepository;
    @MockBean private TrainingProgramRepository trainingProgramRepository;
    @MockBean private BroadcastLogRepository broadcastLogRepository;
    @MockBean private JwtService jwtService;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("GET /api/v1/admin/users - returns list of users")
    void testGetAllUsers() throws Exception {
        User user = User.builder()
                .id("u1")
                .email("student@ciet.edu.in")
                .fullName("Student One")
                .role(Role.Student)
                .isActive(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(user));
        when(studentProfileRepository.findByUserId("u1")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("student@ciet.edu.in"))
                .andExpect(jsonPath("$[0].role").value("Student"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{id}/toggle-active - toggles user status")
    void testToggleUserActive() throws Exception {
        User user = User.builder()
                .id("u1")
                .email("student@ciet.edu.in")
                .isActive(true)
                .build();

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/v1/admin/users/u1/toggle-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));

        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("GET /api/v1/admin/diagnostics - returns system health metrics")
    void testGetDiagnostics() throws Exception {
        when(userRepository.count()).thenReturn(150L);

        mockMvc.perform(get("/api/v1/admin/diagnostics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.dbConnected").value(true))
                .andExpect(jsonPath("$.totalUsers").value(150));
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/users/{id} - deletes user successfully")
    void testDeleteUser() throws Exception {
        User user = User.builder()
                .id("u2")
                .email("staff@ciet.edu.in")
                .role(Role.Faculty)
                .build();

        when(userRepository.findById("u2")).thenReturn(Optional.of(user));

        mockMvc.perform(delete("/api/v1/admin/users/u2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User deleted successfully"));

        verify(userRepository).delete(user);
    }
}
