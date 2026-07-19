package edu.ciet.erp.service;

import edu.ciet.erp.dto.LoginRequest;
import edu.ciet.erp.dto.LoginResponse;
import edu.ciet.erp.dto.VerifyOtpRequest;
import edu.ciet.erp.model.Role;
import edu.ciet.erp.model.StudentProfile;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.StudentProfileRepository;
import edu.ciet.erp.repository.UserRepository;
import edu.ciet.erp.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    @Value("${app.examcell.email}")
    private String examcellEmail;

    @Value("${app.examcell.password}")
    private String examcellPassword;

    public LoginResponse loginPhase1(LoginRequest request, String clientIp) {
        // 1. Check rate limit lockout
        if (loginAttemptService.isBlocked(clientIp)) {
            throw new RuntimeException("Too many login attempts. Please wait 5 minutes.");
        }

        String identifier = request.getIdentifier().trim();
        String password = request.getPassword().trim();
        Role requestedRole = request.getRole();

        User user = null;
        StudentProfile studentProfile = null;

        // 2. Resolve User & StudentProfile based on role
        if (requestedRole == Role.Examcell) {
            if (!identifier.equalsIgnoreCase(examcellEmail)) {
                loginAttemptService.loginFailed(clientIp);
                throw new RuntimeException("Invalid Exam Cell login ID.");
            }
            user = userRepository.findByEmailIgnoreCase(examcellEmail).orElse(null);
            if (user == null) {
                // Auto-seed/create the Examcell user if not exists
                user = User.builder()
                        .email(examcellEmail.toLowerCase())
                        .passwordHash(passwordEncoder.encode(examcellPassword))
                        .fullName("Exam Cell")
                        .role(Role.Examcell)
                        .isActive(true)
                        .build();
                userRepository.save(user);
            }
        } else {
            // Check if identifier is student roll number
            studentProfile = studentProfileRepository.findByRollNoIgnoreCase(identifier).orElse(null);
            if (studentProfile != null) {
                user = userRepository.findById(studentProfile.getUserId()).orElse(null);
            } else {
                // Fallback to email search
                user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
                if (user != null && user.getRole() == Role.Student) {
                    studentProfile = studentProfileRepository.findByUserId(user.getId()).orElse(null);
                }
            }
        }

        if (user == null) {
            loginAttemptService.loginFailed(clientIp);
            throw new RuntimeException("No account found with this ID. Contact your admin.");
        }

        if (!user.isActive()) {
            throw new RuntimeException("Your account is inactive. Contact your admin.");
        }

        // 3. Validate Roles
        if (user.getRole() != requestedRole && user.getRole() != Role.Director) {
            // Allow Parent to log in using Student credentials
            if (requestedRole == Role.Parent && user.getRole() == Role.Student) {
                log.info("Parent login authenticated for student: {}", user.getEmail());
            } else {
                loginAttemptService.loginFailed(clientIp);
                throw new RuntimeException("This account is registered as " + user.getRole() + ", not " + requestedRole + ".");
            }
        }

        // 4. Validate Password
        boolean passwordOk = false;
        if (requestedRole == Role.Examcell) {
            passwordOk = password.equals(examcellPassword);
        } else if (requestedRole == Role.Student || requestedRole == Role.Parent || user.getRole() == Role.Student) {
            // Uppercase roll number default check
            boolean rollPasswordOk = studentProfile != null && 
                    password.toUpperCase().equals(studentProfile.getRollNo().toUpperCase().trim());
            passwordOk = passwordEncoder.matches(password, user.getPasswordHash()) || rollPasswordOk;
        } else {
            passwordOk = passwordEncoder.matches(password, user.getPasswordHash());
        }

        if (!passwordOk) {
            loginAttemptService.loginFailed(clientIp);
            if (user.getRole() == Role.Student || requestedRole == Role.Parent) {
                throw new RuntimeException("Incorrect password. For students, default password is your Register Number.");
            } else {
                throw new RuntimeException("Incorrect password. Please use the password provided by admin.");
            }
        }

        // Reset rate limits on success
        loginAttemptService.loginSucceeded(clientIp);

        // 5. Send OTP
        otpService.generateAndSendOtp(user, "login");

        // 6. Generate Temp Token
        String tempToken = jwtService.generateTempToken(user.getId(), requestedRole.name());

        return LoginResponse.builder()
                .status("OTP_SENT")
                .tempToken(tempToken)
                .role(requestedRole.name())
                .email(user.getEmail())
                .build();
    }

    public LoginResponse loginPhase2(VerifyOtpRequest request, String clientIp) {
        String token = request.getTempToken();
        
        // 1. Verify Temp Token
        String userId;
        String roleStr;
        String type;
        try {
            userId = jwtService.extractUserId(token);
            roleStr = jwtService.extractRole(token);
            type = jwtService.extractType(token);
        } catch (Exception e) {
            throw new RuntimeException("Session expired or invalid. Please log in again.");
        }

        if (userId == null || roleStr == null || !"temp_otp".equals(type)) {
            throw new RuntimeException("Invalid session context.");
        }

        // 2. Fetch User
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (!user.isActive()) {
            throw new RuntimeException("Your account has been deactivated.");
        }

        // 3. Verify OTP code
        boolean otpOk = otpService.verifyOtp(user, request.getOtpCode(), "login");
        if (!otpOk) {
            throw new RuntimeException("Incorrect verification code.");
        }

        // Update login IP & timestamp
        user.setLastLoginIp(clientIp);
        user.setLastLogin(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // 4. Generate Final JWT Access & Refresh Tokens
        String accessToken = jwtService.generateToken(user.getEmail(), roleStr);
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        return LoginResponse.builder()
                .status("SUCCESS")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(roleStr)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }

    public void forgotPassword(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("No account registered with this email address."));

        if (user.getRole() == Role.Student) {
            throw new RuntimeException("Student passwords are fixed to their Register Number and cannot be reset.");
        }

        if (!user.isActive()) {
            throw new RuntimeException("Your account is inactive. Please contact the administrator.");
        }

        otpService.generateAndSendOtp(user, "reset_password");
    }

    public void resetPassword(String email, String otpCode, String newPassword) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (user.getRole() == Role.Student) {
            throw new RuntimeException("Student passwords are fixed to their Register Number and cannot be reset.");
        }

        if (!user.isActive()) {
            throw new RuntimeException("Your account is inactive.");
        }

        boolean otpOk = otpService.verifyOtp(user, otpCode.trim(), "reset_password");
        if (!otpOk) {
            throw new RuntimeException("Incorrect or expired verification code.");
        }

        // Validate password complexity rules
        String pwd = newPassword.trim();
        boolean lengthOk = pwd.length() >= 8;
        boolean upperOk = pwd.matches(".*[A-Z].*");
        boolean lowerOk = pwd.matches(".*[a-z].*");
        boolean numOk = pwd.matches(".*[0-9].*");
        boolean symOk = pwd.matches(".*[^A-Za-z0-9].*");

        if (!lengthOk || !upperOk || !lowerOk || !numOk || !symOk) {
            throw new RuntimeException("Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one symbol (e.g. @).");
        }

        user.setPasswordHash(passwordEncoder.encode(pwd));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void resendOtp(String emailOrRollNo, String purpose) {
        String identifier = emailOrRollNo.trim();
        User user = null;
        
        // Student can log in with roll number as identifier
        StudentProfile studentProfile = studentProfileRepository.findByRollNoIgnoreCase(identifier).orElse(null);
        if (studentProfile != null) {
            user = userRepository.findById(studentProfile.getUserId()).orElse(null);
        } else {
            user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        }

        if (user == null) {
            throw new RuntimeException("Account not found.");
        }

        if (!user.isActive()) {
            throw new RuntimeException("Your account is inactive.");
        }

        if ("reset_password".equals(purpose) && user.getRole() == Role.Student) {
            throw new RuntimeException("Students cannot reset passwords.");
        }

        otpService.generateAndSendOtp(user, purpose);
    }
}
