package edu.ciet.erp.security;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link JwtService}.
 *
 * Covers:
 *  - Standard access token generation and claim extraction
 *  - Refresh token generation
 *  - Temporary OTP token generation and claim extraction
 *  - Token validation (valid, wrong username, expired)
 */
@DisplayName("JwtService")
class JwtServiceTest {

    // 256-bit base64-encoded HS256 test key (same as application-test.yml)
    private static final String TEST_SECRET =
            "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 86400000L);     // 24 h
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 604800000L); // 7 d
    }

    // ------------------------------------------------------------------ //
    //  Access Token                                                        //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("Access Token")
    class AccessToken {

        @Test
        @DisplayName("generateToken — subject equals username")
        void subject_equals_username() {
            String token = jwtService.generateToken("faculty@ciet.edu.in", "Faculty");
            assertThat(jwtService.extractUsername(token)).isEqualTo("faculty@ciet.edu.in");
        }

        @Test
        @DisplayName("generateToken — role claim is embedded")
        void role_claim_present() {
            String token = jwtService.generateToken("hod@ciet.edu.in", "HOD");
            assertThat(jwtService.extractRole(token)).isEqualTo("HOD");
        }

        @Test
        @DisplayName("generateToken — type claim is absent (null)")
        void type_claim_absent_for_access_token() {
            String token = jwtService.generateToken("admin@ciet.edu.in", "Director");
            assertThat(jwtService.extractType(token)).isNull();
        }

        @Test
        @DisplayName("isTokenValid — valid token returns true")
        void valid_token_is_accepted() {
            String token = jwtService.generateToken("student@ciet.edu.in", "Student");
            assertThat(jwtService.isTokenValid(token, "student@ciet.edu.in")).isTrue();
        }

        @Test
        @DisplayName("isTokenValid — mismatched username returns false")
        void mismatched_username_rejected() {
            String token = jwtService.generateToken("alice@ciet.edu.in", "Faculty");
            assertThat(jwtService.isTokenValid(token, "bob@ciet.edu.in")).isFalse();
        }

        @Test
        @DisplayName("isTokenValid — expired token throws ExpiredJwtException")
        void expired_token_throws() {
            // Set expiration to -1 ms (immediately expired)
            ReflectionTestUtils.setField(jwtService, "jwtExpiration", -1L);
            String token = jwtService.generateToken("old@ciet.edu.in", "Student");
            assertThatThrownBy(() -> jwtService.isTokenValid(token, "old@ciet.edu.in"))
                    .isInstanceOf(ExpiredJwtException.class);
        }
    }

    // ------------------------------------------------------------------ //
    //  Refresh Token                                                       //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("Refresh Token")
    class RefreshToken {

        @Test
        @DisplayName("generateRefreshToken — subject equals username")
        void refresh_subject_equals_username() {
            String token = jwtService.generateRefreshToken("mentor@ciet.edu.in");
            assertThat(jwtService.extractUsername(token)).isEqualTo("mentor@ciet.edu.in");
        }

        @Test
        @DisplayName("generateRefreshToken — no role claim")
        void refresh_has_no_role() {
            String token = jwtService.generateRefreshToken("mentor@ciet.edu.in");
            assertThat(jwtService.extractRole(token)).isNull();
        }
    }

    // ------------------------------------------------------------------ //
    //  Temp OTP Token                                                      //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("Temp OTP Token")
    class TempOtpToken {

        @Test
        @DisplayName("generateTempToken — userId extracted correctly")
        void user_id_extracted() {
            String token = jwtService.generateTempToken("user-id-42", "Student");
            assertThat(jwtService.extractUserId(token)).isEqualTo("user-id-42");
        }

        @Test
        @DisplayName("generateTempToken — role extracted correctly")
        void role_extracted() {
            String token = jwtService.generateTempToken("user-id-99", "HOD");
            assertThat(jwtService.extractRole(token)).isEqualTo("HOD");
        }

        @Test
        @DisplayName("generateTempToken — type is 'temp_otp'")
        void type_is_temp_otp() {
            String token = jwtService.generateTempToken("user-id-01", "Faculty");
            assertThat(jwtService.extractType(token)).isEqualTo("temp_otp");
        }

        @Test
        @DisplayName("generateTempToken — expires within 10 minutes (token itself is valid immediately)")
        void temp_token_is_immediately_valid() {
            // We just verify extraction doesn't throw — the token is valid right away
            assertThatCode(() -> {
                String token = jwtService.generateTempToken("uid", "Student");
                jwtService.extractUserId(token);
            }).doesNotThrowAnyException();
        }
    }
}
