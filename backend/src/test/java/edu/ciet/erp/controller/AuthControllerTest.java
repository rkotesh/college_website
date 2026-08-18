package edu.ciet.erp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ciet.erp.dto.LoginRequest;
import edu.ciet.erp.dto.LoginResponse;
import edu.ciet.erp.dto.VerifyOtpRequest;
import edu.ciet.erp.model.Role;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.UserRepository;
import edu.ciet.erp.security.JwtAuthenticationFilter;
import edu.ciet.erp.security.JwtService;
import edu.ciet.erp.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthController REST Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("POST /api/v1/auth/login - returns 200 on valid credentials")
    void testLoginSuccess() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setIdentifier("test@ciet.edu.in");
        req.setPassword("Secret@123");
        req.setRole(Role.Faculty);

        LoginResponse resp = LoginResponse.builder()
                .status("OTP_SENT")
                .tempToken("dummy-temp-token")
                .role("Faculty")
                .email("test@ciet.edu.in")
                .build();

        when(authService.loginPhase1(any(LoginRequest.class), any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OTP_SENT"))
                .andExpect(jsonPath("$.tempToken").value("dummy-temp-token"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - returns 400 on error")
    void testLoginFailure() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setIdentifier("wrong@ciet.edu.in");
        req.setPassword("bad");
        req.setRole(Role.Faculty);

        when(authService.loginPhase1(any(LoginRequest.class), any()))
                .thenThrow(new RuntimeException("No account found with this ID."));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("No account found with this ID."));
    }

    @Test
    @DisplayName("POST /api/v1/auth/verify-otp - returns 200 and cookies on successful OTP")
    void testVerifyOtpSuccess() throws Exception {
        VerifyOtpRequest req = new VerifyOtpRequest();
        req.setTempToken("valid-token");
        req.setOtpCode("123456");

        LoginResponse resp = LoginResponse.builder()
                .status("SUCCESS")
                .accessToken("acc-jwt")
                .refreshToken("ref-jwt")
                .role("Faculty")
                .email("test@ciet.edu.in")
                .fullName("Test Faculty")
                .build();

        when(authService.loginPhase2(any(VerifyOtpRequest.class), any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(cookie().exists("accessToken"))
                .andExpect(cookie().exists("refreshToken"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/session - returns authenticated user details when authenticated")
    void testGetSessionAuthenticated() throws Exception {
        User user = User.builder()
                .id("u1")
                .email("faculty@ciet.edu.in")
                .fullName("Faculty Member")
                .role(Role.Faculty)
                .build();

        when(userRepository.findByEmailIgnoreCase("faculty@ciet.edu.in")).thenReturn(Optional.of(user));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "faculty@ciet.edu.in", null,
                        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_Faculty"))
                );

        mockMvc.perform(get("/api/v1/auth/session").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.email").value("faculty@ciet.edu.in"))
                .andExpect(jsonPath("$.role").value("Faculty"))
                .andExpect(jsonPath("$.fullName").value("Faculty Member"))
                .andExpect(jsonPath("$.isMentor").value(false));
    }

    @Test
    @DisplayName("POST /api/v1/auth/logout - clears cookie tokens")
    void testLogout() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("accessToken", 0))
                .andExpect(cookie().maxAge("refreshToken", 0));
    }

    @Test
    @DisplayName("POST /api/v1/auth/forgot-password - returns 200 on success")
    void testForgotPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "staff@ciet.edu.in"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OTP_SENT"));

        verify(authService).forgotPassword("staff@ciet.edu.in");
    }

    @Test
    @DisplayName("POST /api/v1/auth/reset-password - returns 200 on successful reset")
    void testResetPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "staff@ciet.edu.in",
                                "otpCode", "123456",
                                "newPassword", "NewSecret@123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(authService).resetPassword("staff@ciet.edu.in", "123456", "NewSecret@123");
    }
}
