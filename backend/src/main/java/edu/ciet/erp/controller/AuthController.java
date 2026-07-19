package edu.ciet.erp.controller;

import edu.ciet.erp.dto.LoginRequest;
import edu.ciet.erp.dto.LoginResponse;
import edu.ciet.erp.dto.VerifyOtpRequest;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.UserRepository;
import edu.ciet.erp.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> loginPhase1(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        try {
            String clientIp = getClientIp(request);
            LoginResponse response = authService.loginPhase1(loginRequest, clientIp);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> loginPhase2(@RequestBody VerifyOtpRequest verifyRequest, HttpServletRequest request, HttpServletResponse response) {
        try {
            String clientIp = getClientIp(request);
            LoginResponse loginResponse = authService.loginPhase2(verifyRequest, clientIp);
            
            if ("SUCCESS".equals(loginResponse.getStatus())) {
                // Set HttpOnly access token cookie
                Cookie accessCookie = new Cookie("accessToken", loginResponse.getAccessToken());
                accessCookie.setHttpOnly(true);
                accessCookie.setSecure(true); // secure: browser will only send this cookie over HTTPS
                accessCookie.setAttribute("SameSite", "Strict");
                accessCookie.setPath("/");
                accessCookie.setMaxAge(3600); // 1 hour
                response.addCookie(accessCookie);

                // Set HttpOnly refresh token cookie
                Cookie refreshCookie = new Cookie("refreshToken", loginResponse.getRefreshToken());
                refreshCookie.setHttpOnly(true);
                refreshCookie.setSecure(true);
                refreshCookie.setAttribute("SameSite", "Strict");
                refreshCookie.setPath("/");
                refreshCookie.setMaxAge(7 * 24 * 3600); // 7 days
                response.addCookie(refreshCookie);
            }
            
            return ResponseEntity.ok(loginResponse);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/session")
    public ResponseEntity<?> getSession(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        
        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "email", user.getEmail(),
            "role", user.getRole().name(),
            "fullName", user.getFullName()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        // Clear accessToken cookie
        Cookie accessCookie = new Cookie("accessToken", "");
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(true);
        accessCookie.setAttribute("SameSite", "Strict");
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0); // delete cookie instantly
        response.addCookie(accessCookie);

        // Clear refreshToken cookie
        Cookie refreshCookie = new Cookie("refreshToken", "");
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setAttribute("SameSite", "Strict");
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isBlank()) {
                throw new RuntimeException("Email is required.");
            }
            authService.forgotPassword(email);
            return ResponseEntity.ok(Map.of("status", "OTP_SENT", "message", "Verification code sent successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String otpCode = body.get("otpCode");
            String newPassword = body.get("newPassword");
            
            if (email == null || email.isBlank() || otpCode == null || otpCode.isBlank() || newPassword == null || newPassword.isBlank()) {
                throw new RuntimeException("Email, verification code, and new password are required.");
            }
            authService.resetPassword(email, otpCode, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully. Please log in with your new password."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String purpose = body.get("purpose");
            if (email == null || email.isBlank() || purpose == null || purpose.isBlank()) {
                throw new RuntimeException("Email and purpose are required.");
            }
            authService.resendOtp(email, purpose);
            return ResponseEntity.ok(Map.of("message", "Verification code resent successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
