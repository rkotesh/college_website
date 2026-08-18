package edu.ciet.erp.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link LoginAttemptService}.
 *
 * Covers:
 *  - Fresh IP: not blocked
 *  - After < MAX_ATTEMPTS failures: not blocked
 *  - After exactly MAX_ATTEMPTS failures: blocked (lockout applied)
 *  - loginSucceeded() resets the counter
 *  - Lockout auto-expires after LOCKOUT_MINUTES
 */
@DisplayName("LoginAttemptService")
class LoginAttemptServiceTest {

    private static final String IP = "192.168.1.100";

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService();
    }

    // ------------------------------------------------------------------ //
    //  Fresh state                                                         //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("Fresh IP")
    class FreshIp {

        @Test
        @DisplayName("unknown IP is not blocked")
        void unknown_ip_not_blocked() {
            assertThat(service.isBlocked(IP)).isFalse();
        }
    }

    // ------------------------------------------------------------------ //
    //  Incremental failures                                                //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("Incremental failures")
    class IncrementalFailures {

        @Test
        @DisplayName("4 consecutive failures — still not blocked")
        void four_fails_not_blocked() {
            for (int i = 0; i < 4; i++) {
                service.loginFailed(IP);
            }
            assertThat(service.isBlocked(IP)).isFalse();
        }

        @Test
        @DisplayName("exactly 5 failures — becomes blocked")
        void five_fails_blocked() {
            for (int i = 0; i < 5; i++) {
                service.loginFailed(IP);
            }
            assertThat(service.isBlocked(IP)).isTrue();
        }

        @Test
        @DisplayName("6+ failures — still blocked")
        void six_fails_still_blocked() {
            for (int i = 0; i < 7; i++) {
                service.loginFailed(IP);
            }
            assertThat(service.isBlocked(IP)).isTrue();
        }
    }

    // ------------------------------------------------------------------ //
    //  Reset on success                                                    //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("loginSucceeded() reset")
    class SuccessReset {

        @Test
        @DisplayName("succeeds after 3 failures — clears the record")
        void success_clears_after_partial_failures() {
            for (int i = 0; i < 3; i++) {
                service.loginFailed(IP);
            }
            service.loginSucceeded(IP);
            assertThat(service.isBlocked(IP)).isFalse();
        }

        @Test
        @DisplayName("succeeds on fresh IP — no-op, stays unblocked")
        void success_on_fresh_ip_is_noop() {
            service.loginSucceeded(IP);
            assertThat(service.isBlocked(IP)).isFalse();
        }
    }

    // ------------------------------------------------------------------ //
    //  Lockout expiry                                                      //
    // ------------------------------------------------------------------ //

    @Nested
    @DisplayName("Lockout expiry")
    class LockoutExpiry {

        @Test
        @DisplayName("blocked IP becomes unblocked after lockout window passes")
        @SuppressWarnings("unchecked")
        void lockout_expires_after_window() throws Exception {
            // Trigger lockout
            for (int i = 0; i < 5; i++) {
                service.loginFailed(IP);
            }
            assertThat(service.isBlocked(IP)).isTrue();

            // Manually set lockoutExpiry to the past using reflection
            Map<String, Object> attemptsMap =
                    (Map<String, Object>) ReflectionTestUtils.getField(service, "attemptsMap");

            Object attempt = attemptsMap.get(IP);
            ReflectionTestUtils.setField(attempt, "lockoutExpiry",
                    LocalDateTime.now().minusMinutes(1));

            // Should no longer be blocked
            assertThat(service.isBlocked(IP)).isFalse();
        }
    }
}
