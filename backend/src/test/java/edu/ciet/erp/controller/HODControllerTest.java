package edu.ciet.erp.controller;

import edu.ciet.erp.model.*;
import edu.ciet.erp.repository.*;
import edu.ciet.erp.security.JwtAuthenticationFilter;
import edu.ciet.erp.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HODController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("HODController Department Isolation Tests")
class HODControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private UserRepository userRepository;
    @MockBean private StudentProfileRepository studentProfileRepository;
    @MockBean private DepartmentRepository departmentRepository;
    @MockBean private SyllabusCoverageRepository syllabusCoverageRepository;
    @MockBean private MentorshipAssignmentRepository mentorshipAssignmentRepository;
    @MockBean private AcademicDocumentRepository academicDocumentRepository;
    @MockBean private TrainingProgramRepository trainingProgramRepository;
    @MockBean private AnnouncementRepository announcementRepository;
    @MockBean private CourseOutcomeAttainmentRepository courseOutcomeAttainmentRepository;
    @MockBean private AccreditationChecklistRepository accreditationChecklistRepository;
    @MockBean private MentorshipMeetingLogRepository mentorshipMeetingLogRepository;
    @MockBean private MentorshipCaseNoteRepository mentorshipCaseNoteRepository;
    @MockBean private EscalationThreadRepository escalationThreadRepository;
    @MockBean private EscalationMessageRepository escalationMessageRepository;
    @MockBean private CourseRepository courseRepository;
    @MockBean private NotificationRepository notificationRepository;
    @MockBean private MessageRepository messageRepository;
    @MockBean private SemesterResultRepository semesterResultRepository;
    @MockBean private EducationBackgroundRepository educationBackgroundRepository;
    @MockBean private CertificationRepository certificationRepository;
    @MockBean private ProjectRepository projectRepository;
    @MockBean private InternshipRepository internshipRepository;
    @MockBean private ResearchRepository researchRepository;
    @MockBean private EventRepository eventRepository;
    @MockBean private SkillRepository skillRepository;
    @MockBean private ClassTimetableRepository classTimetableRepository;
    @MockBean private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @MockBean private JwtService jwtService;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;

    private User hodUser;
    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        hodUser = User.builder()
                .id("hod1")
                .email("hod_cse@ciet.edu.in")
                .fullName("CSE HOD")
                .role(Role.HOD)
                .departmentIds(List.of("CSE"))
                .departmentId("CSE")
                .build();

        auth = new UsernamePasswordAuthenticationToken(
                "hod_cse@ciet.edu.in", null,
                List.of(new SimpleGrantedAuthority("ROLE_HOD"))
        );

        when(userRepository.findByEmailIgnoreCase("hod_cse@ciet.edu.in")).thenReturn(Optional.of(hodUser));
    }

    @Test
    @DisplayName("GET /api/v1/hod/all-students — returns ONLY students in HOD's department")
    void testGetAllStudentsFiltersByDepartment() throws Exception {
        User cseStudent = User.builder()
                .id("s_cse")
                .email("student_cse@ciet.edu.in")
                .fullName("CSE Student")
                .role(Role.Student)
                .departmentId("CSE")
                .departmentIds(List.of("CSE"))
                .build();

        User eceStudent = User.builder()
                .id("s_ece")
                .email("student_ece@ciet.edu.in")
                .fullName("ECE Student")
                .role(Role.Student)
                .departmentId("ECE")
                .departmentIds(List.of("ECE"))
                .build();

        StudentProfile cseProfile = StudentProfile.builder()
                .userId("s_cse")
                .rollNo("21CS001")
                .departmentId("CSE")
                .build();

        StudentProfile eceProfile = StudentProfile.builder()
                .userId("s_ece")
                .rollNo("21EC001")
                .departmentId("ECE")
                .build();

        when(userRepository.findAllByRole(Role.Student)).thenReturn(List.of(cseStudent, eceStudent));
        when(studentProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of(cseProfile, eceProfile));

        mockMvc.perform(get("/api/v1/hod/all-students").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value("student_cse@ciet.edu.in"))
                .andExpect(jsonPath("$[0].rollNo").value("21CS001"));
    }

    @Test
    @DisplayName("GET /api/v1/hod/all-faculty — returns ONLY faculty/mentors in HOD's department")
    void testGetAllFacultyFiltersByDepartment() throws Exception {
        User cseFaculty = User.builder()
                .id("f_cse")
                .email("fac_cse@ciet.edu.in")
                .fullName("CSE Faculty")
                .role(Role.Faculty)
                .departmentIds(List.of("CSE"))
                .build();

        User eceFaculty = User.builder()
                .id("f_ece")
                .email("fac_ece@ciet.edu.in")
                .fullName("ECE Faculty")
                .role(Role.Faculty)
                .departmentIds(List.of("ECE"))
                .build();

        when(userRepository.findAllByRole(Role.Mentor)).thenReturn(List.of());
        when(userRepository.findAllByRole(Role.Faculty)).thenReturn(List.of(cseFaculty, eceFaculty));

        mockMvc.perform(get("/api/v1/hod/all-faculty").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value("fac_cse@ciet.edu.in"));
    }

    @Test
    @DisplayName("GET /api/v1/hod/mentor/assignments — returns ONLY assignments matching HOD's department")
    void testGetMentorshipAssignmentsFiltersByDepartment() throws Exception {
        MentorshipAssignment cseAssignment = MentorshipAssignment.builder()
                .id("a_cse")
                .rollNo("21CS001")
                .mentorUserId("f_cse")
                .departmentId("CSE")
                .build();

        MentorshipAssignment eceAssignment = MentorshipAssignment.builder()
                .id("a_ece")
                .rollNo("21EC001")
                .mentorUserId("f_ece")
                .departmentId("ECE")
                .build();

        when(mentorshipAssignmentRepository.findAll()).thenReturn(List.of(cseAssignment, eceAssignment));
        when(studentProfileRepository.findByRollNoIgnoreCase("21CS001")).thenReturn(Optional.of(
                StudentProfile.builder().userId("s_cse").rollNo("21CS001").departmentId("CSE").build()
        ));

        mockMvc.perform(get("/api/v1/hod/mentor/assignments").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].rollNo").value("21CS001"));
    }

    @Test
    @DisplayName("GET /api/v1/hod/analytics — returns department metrics and syllabus completion")
    void testGetAnalyticsFiltersByDepartment() throws Exception {
        User cseStudent = User.builder()
                .id("s_cse")
                .email("student_cse@ciet.edu.in")
                .fullName("CSE Student")
                .role(Role.Student)
                .departmentId("CSE")
                .departmentIds(List.of("CSE"))
                .build();

        StudentProfile cseProfile = StudentProfile.builder()
                .userId("s_cse")
                .rollNo("21CS001")
                .departmentId("CSE")
                .batch("2022-2026")
                .cgpa(8.5)
                .build();

        when(userRepository.findAllByRole(Role.Student)).thenReturn(List.of(cseStudent));
        when(studentProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of(cseProfile));

        mockMvc.perform(get("/api/v1/hod/analytics").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").value(1))
                .andExpect(jsonPath("$.batchAverages['2022-2026']").value(8.5));
    }

    @Test
    @DisplayName("GET /api/v1/hod/all-students — AIML HOD cannot see CSE student (e.g. Y23CSE042)")
    void testAIMLHODCannotSeeCSEStudent() throws Exception {
        User aimlHod = User.builder()
                .id("hod_aiml")
                .email("hod_aiml@ciet.edu.in")
                .fullName("AIML HOD")
                .role(Role.HOD)
                .departmentIds(List.of("AIML"))
                .departmentId("AIML")
                .build();

        UsernamePasswordAuthenticationToken aimlAuth = new UsernamePasswordAuthenticationToken(
                "hod_aiml@ciet.edu.in", null,
                List.of(new SimpleGrantedAuthority("ROLE_HOD"))
        );

        when(userRepository.findByEmailIgnoreCase("hod_aiml@ciet.edu.in")).thenReturn(Optional.of(aimlHod));

        User cseStudent = User.builder()
                .id("s_cse42")
                .email("galibasmithrathan@gmail.com")
                .fullName("Gali Basmith Rathan")
                .role(Role.Student)
                .rollNo("Y23CSE042")
                .departmentId("CSE")
                .build();

        StudentProfile cseProfile = StudentProfile.builder()
                .userId("s_cse42")
                .rollNo("Y23CSE042")
                .departmentId("CSE")
                .build();

        when(userRepository.findAllByRole(Role.Student)).thenReturn(List.of(cseStudent));
        when(studentProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of(cseProfile));

        mockMvc.perform(get("/api/v1/hod/all-students").principal(aimlAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
