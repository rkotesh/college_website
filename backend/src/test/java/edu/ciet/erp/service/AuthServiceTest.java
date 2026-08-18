package edu.ciet.erp.service;

import edu.ciet.erp.dto.LoginRequest;
import edu.ciet.erp.dto.LoginResponse;
import edu.ciet.erp.dto.VerifyOtpRequest;
import edu.ciet.erp.model.OTPRecord;
import edu.ciet.erp.model.Role;
import edu.ciet.erp.model.StudentProfile;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.OTPRecordRepository;
import edu.ciet.erp.repository.StudentProfileRepository;
import edu.ciet.erp.repository.UserRepository;
import edu.ciet.erp.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 *
 * All external dependencies (repositories, JWT, OTP, mail) are mocked.
 *
 * Covers:
 *  - loginPhase1: success path (OTP_SENT), blocked IP, wrong role,
 *    bad password, inactive user, user-not-found
 *  - loginPhase2: success path, bad temp token, OTP fail, inactive user
 *  - forgotPassword: success, student restriction, inactive user
 *  - resetPassword: success, weak password, wrong OTP, student restriction
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService")
class AuthServiceTest {

    /* ── Mocks ──────────────────────────────────────────────────────────── */
    @Mock UserRepository userRepository;
    @Mock StudentProfileRepository studentProfileRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock OtpService otpService;
    @Mock JwtService jwtService;
    @Mock LoginAttemptService loginAttemptService;

    @InjectMocks AuthService authService;

    /* ── Helpers ─────────────────────────────────────────────────────────── */

    private User buildUser(Role role, boolean active) {
        return User.builder()
                .id("uid-001")
                .email("faculty@ciet.edu.in")
                .passwordHash("$2a$10$hashedpassword")
                .fullName("Test Faculty")
                .role(role)
                .isActive(active)
                .build();
    }

    private StudentProfile buildStudentProfile(String userId, String rollNo) {
        return StudentProfile.builder()
                .id("sp-001")
                .userId(userId)
                .rollNo(rollNo)
                .build();
    }

    private LoginRequest buildLoginRequest(String identifier, String password, Role role) {
        LoginRequest req = new LoginRequest();
        req.setIdentifier(identifier);
        req.setPassword(password);
        req.setRole(role);
        return req;
    }

    /* ══════════════════════════════════════════════════════════════════════ */
    /*  Phase 1 — Credential Verification                                    */
    /* ══════════════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("loginPhase1")
    class LoginPhase1 {

        @Test
        @DisplayName("success — OTP_SENT status returned")
        void success_returns_otp_sent() {
            User user = buildUser(Role.Faculty, true);
            when(loginAttemptService.isBlocked("1.1.1.1")).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase("faculty@ciet.edu.in"))
                    .thenReturn(Optional.empty());
            when(userRepository.findByEmailIgnoreCase("faculty@ciet.edu.in"))
                    .thenReturn(Optional.of(user));
            when(passwordEncoder.matches("pass123", user.getPasswordHash())).thenReturn(true);
            when(jwtService.generateTempToken("uid-001", "Faculty")).thenReturn("temp-jwt");

            LoginResponse res = authService.loginPhase1(
                    buildLoginRequest("faculty@ciet.edu.in", "pass123", Role.Faculty), "1.1.1.1");

            assertThat(res.getStatus()).isEqualTo("OTP_SENT");
            assertThat(res.getTempToken()).isEqualTo("temp-jwt");
            assertThat(res.getEmail()).isEqualTo("faculty@ciet.edu.in");
            verify(otpService).generateAndSendOtp(user, "login");
            verify(loginAttemptService).loginSucceeded("1.1.1.1");
        }

        @Test
        @DisplayName("blocked IP — throws rate-limit exception")
        void blocked_ip_throws() {
            when(loginAttemptService.isBlocked("9.9.9.9")).thenReturn(true);

            assertThatThrownBy(() ->
                    authService.loginPhase1(
                            buildLoginRequest("anyone@ciet.edu.in", "pw", Role.Faculty), "9.9.9.9"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Too many login attempts");
        }

        @Test
        @DisplayName("user not found — throws descriptive exception")
        void user_not_found_throws() {
            when(loginAttemptService.isBlocked(any())).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    authService.loginPhase1(
                            buildLoginRequest("ghost@ciet.edu.in", "pw", Role.Faculty), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("No account found");

            verify(loginAttemptService).loginFailed("1.1.1.1");
        }

        @Test
        @DisplayName("inactive account — throws account-inactive exception")
        void inactive_account_throws() {
            User user = buildUser(Role.Faculty, false);
            when(loginAttemptService.isBlocked(any())).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() ->
                    authService.loginPhase1(
                            buildLoginRequest("faculty@ciet.edu.in", "pw", Role.Faculty), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("inactive");
        }

        @Test
        @DisplayName("role mismatch — throws role-mismatch exception")
        void role_mismatch_throws() {
            User user = buildUser(Role.Faculty, true);
            when(loginAttemptService.isBlocked(any())).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() ->
                    authService.loginPhase1(
                            buildLoginRequest("faculty@ciet.edu.in", "pw", Role.HOD), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Faculty")
                    .hasMessageContaining("HOD");

            verify(loginAttemptService).loginFailed("1.1.1.1");
        }

        @Test
        @DisplayName("wrong password — throws password-error exception")
        void wrong_password_throws() {
            User user = buildUser(Role.Faculty, true);
            when(loginAttemptService.isBlocked(any())).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(any(), any())).thenReturn(false);

            assertThatThrownBy(() ->
                    authService.loginPhase1(
                            buildLoginRequest("faculty@ciet.edu.in", "wrong", Role.Faculty), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Incorrect password");

            verify(loginAttemptService).loginFailed("1.1.1.1");
        }

        @Test
        @DisplayName("student login with roll number — resolves via StudentProfile")
        void student_login_by_roll_number() {
            User user = buildUser(Role.Student, true);
            StudentProfile sp = buildStudentProfile("uid-001", "21CS001");

            when(loginAttemptService.isBlocked(any())).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase("21CS001"))
                    .thenReturn(Optional.of(sp));
            when(userRepository.findById("uid-001")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("21CS001", user.getPasswordHash())).thenReturn(true);
            when(jwtService.generateTempToken("uid-001", "Student")).thenReturn("temp-token");

            LoginResponse res = authService.loginPhase1(
                    buildLoginRequest("21CS001", "21CS001", Role.Student), "1.1.1.1");

            assertThat(res.getStatus()).isEqualTo("OTP_SENT");
        }

        @Test
        @DisplayName("student — roll number as password (uppercase match) also accepted")
        void student_roll_number_as_password_accepted() {
            User user = buildUser(Role.Student, true);
            StudentProfile sp = buildStudentProfile("uid-001", "21cs001");

            when(loginAttemptService.isBlocked(any())).thenReturn(false);
            when(studentProfileRepository.findByRollNoIgnoreCase("21CS001"))
                    .thenReturn(Optional.of(sp));
            when(userRepository.findById("uid-001")).thenReturn(Optional.of(user));
            // BCrypt doesn't match, but uppercase roll number plaintext does
            when(passwordEncoder.matches(any(), any())).thenReturn(false);
            when(jwtService.generateTempToken(any(), any())).thenReturn("t");

            LoginResponse res = authService.loginPhase1(
                    buildLoginRequest("21CS001", "21CS001", Role.Student), "1.1.1.1");

            assertThat(res.getStatus()).isEqualTo("OTP_SENT");
        }
    }

    /* ══════════════════════════════════════════════════════════════════════ */
    /*  Phase 2 — OTP Verification                                           */
    /* ══════════════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("loginPhase2")
    class LoginPhase2 {

        private VerifyOtpRequest buildVerifyRequest(String tempToken, String otpCode) {
            VerifyOtpRequest req = new VerifyOtpRequest();
            req.setTempToken(tempToken);
            req.setOtpCode(otpCode);
            return req;
        }

        @Test
        @DisplayName("success — SUCCESS status and both tokens returned")
        void success_returns_success_status() {
            User user = buildUser(Role.Faculty, true);

            when(jwtService.extractUserId("valid-temp")).thenReturn("uid-001");
            when(jwtService.extractRole("valid-temp")).thenReturn("Faculty");
            when(jwtService.extractType("valid-temp")).thenReturn("temp_otp");
            when(userRepository.findById("uid-001")).thenReturn(Optional.of(user));
            when(otpService.verifyOtp(user, "123456", "login")).thenReturn(true);
            when(jwtService.generateToken("faculty@ciet.edu.in", "Faculty")).thenReturn("access-token");
            when(jwtService.generateRefreshToken("faculty@ciet.edu.in")).thenReturn("refresh-token");

            LoginResponse res = authService.loginPhase2(
                    buildVerifyRequest("valid-temp", "123456"), "1.1.1.1");

            assertThat(res.getStatus()).isEqualTo("SUCCESS");
            assertThat(res.getAccessToken()).isEqualTo("access-token");
            assertThat(res.getRefreshToken()).isEqualTo("refresh-token");
        }

        @Test
        @DisplayName("invalid temp token — throws session-expired exception")
        void invalid_token_throws() {
            when(jwtService.extractUserId(any())).thenThrow(new RuntimeException("bad token"));

            assertThatThrownBy(() ->
                    authService.loginPhase2(buildVerifyRequest("bad", "111111"), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("expired or invalid");
        }

        @Test
        @DisplayName("non-temp_otp token type — throws invalid session context")
        void non_otp_type_throws() {
            when(jwtService.extractUserId(any())).thenReturn("uid-001");
            when(jwtService.extractRole(any())).thenReturn("Faculty");
            when(jwtService.extractType(any())).thenReturn("access"); // wrong type

            assertThatThrownBy(() ->
                    authService.loginPhase2(buildVerifyRequest("access-token", "111111"), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Invalid session context");
        }

        @Test
        @DisplayName("wrong OTP code — throws incorrect-code exception")
        void wrong_otp_throws() {
            User user = buildUser(Role.Faculty, true);
            when(jwtService.extractUserId(any())).thenReturn("uid-001");
            when(jwtService.extractRole(any())).thenReturn("Faculty");
            when(jwtService.extractType(any())).thenReturn("temp_otp");
            when(userRepository.findById("uid-001")).thenReturn(Optional.of(user));
            when(otpService.verifyOtp(user, "000000", "login")).thenReturn(false);

            assertThatThrownBy(() ->
                    authService.loginPhase2(buildVerifyRequest("temp", "000000"), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Incorrect verification code");
        }

        @Test
        @DisplayName("deactivated user at phase 2 — throws deactivated exception")
        void deactivated_user_throws() {
            User user = buildUser(Role.Faculty, false);
            when(jwtService.extractUserId(any())).thenReturn("uid-001");
            when(jwtService.extractRole(any())).thenReturn("Faculty");
            when(jwtService.extractType(any())).thenReturn("temp_otp");
            when(userRepository.findById("uid-001")).thenReturn(Optional.of(user));

            assertThatThrownBy(() ->
                    authService.loginPhase2(buildVerifyRequest("temp", "123456"), "1.1.1.1"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("deactivated");
        }
    }

    /* ══════════════════════════════════════════════════════════════════════ */
    /*  Password Reset                                                        */
    /* ══════════════════════════════════════════════════════════════════════ */

    @Nested
    @DisplayName("forgotPassword")
    class ForgotPassword {

        @Test
        @DisplayName("valid staff email — OTP sent successfully")
        void valid_email_sends_otp() {
            User user = buildUser(Role.Faculty, true);
            when(userRepository.findByEmailIgnoreCase("faculty@ciet.edu.in"))
                    .thenReturn(Optional.of(user));

            assertThatCode(() -> authService.forgotPassword("faculty@ciet.edu.in"))
                    .doesNotThrowAnyException();
            verify(otpService).generateAndSendOtp(user, "reset_password");
        }

        @Test
        @DisplayName("student email — throws restriction exception")
        void student_email_throws() {
            User user = buildUser(Role.Student, true);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.forgotPassword("student@ciet.edu.in"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("fixed to their Register Number");
        }

        @Test
        @DisplayName("unknown email — throws not-found exception")
        void unknown_email_throws() {
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.forgotPassword("nobody@ciet.edu.in"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("No account registered");
        }

        @Test
        @DisplayName("inactive staff — throws inactive exception")
        void inactive_staff_throws() {
            User user = buildUser(Role.Faculty, false);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.forgotPassword("faculty@ciet.edu.in"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("inactive");
        }
    }

    @Nested
    @DisplayName("resetPassword")
    class ResetPassword {

        @Test
        @DisplayName("valid new password — password updated")
        void valid_password_updated() {
            User user = buildUser(Role.Faculty, true);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));
            when(otpService.verifyOtp(user, "654321", "reset_password")).thenReturn(true);
            when(passwordEncoder.encode("Secure@123")).thenReturn("$2a$hashed");

            assertThatCode(() ->
                    authService.resetPassword("faculty@ciet.edu.in", "654321", "Secure@123"))
                    .doesNotThrowAnyException();

            verify(userRepository).save(user);
            assertThat(user.getPasswordHash()).isEqualTo("$2a$hashed");
        }

        @Test
        @DisplayName("weak password — throws complexity exception")
        void weak_password_throws() {
            User user = buildUser(Role.Faculty, true);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));
            when(otpService.verifyOtp(any(), any(), any())).thenReturn(true);

            assertThatThrownBy(() ->
                    authService.resetPassword("faculty@ciet.edu.in", "654321", "weakpass"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("at least 8 characters");
        }

        @Test
        @DisplayName("wrong OTP — throws invalid code exception")
        void wrong_otp_throws() {
            User user = buildUser(Role.Faculty, true);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));
            when(otpService.verifyOtp(any(), any(), any())).thenReturn(false);

            assertThatThrownBy(() ->
                    authService.resetPassword("faculty@ciet.edu.in", "000000", "Secure@123"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Incorrect or expired");
        }

        @Test
        @DisplayName("student account — throws restriction exception")
        void student_reset_throws() {
            User user = buildUser(Role.Student, true);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() ->
                    authService.resetPassword("student@ciet.edu.in", "123456", "Secure@123"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("fixed to their Register Number");
        }
    }
}
