package edu.ciet.erp.service;

import edu.ciet.erp.model.OTPRecord;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.OTPRecordRepository;
import edu.ciet.erp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {
    private final OTPRecordRepository otpRecordRepository;
    private final UserRepository userRepository;
    private final org.springframework.mail.javamail.JavaMailSender mailSender;
    private final Random random = new Random();

    @org.springframework.beans.factory.annotation.Value("${app.mail.from}")
    private String fromEmail;

    public void generateAndSendOtp(User user, String purpose) {
        // Invalidate previous OTPs for this user and purpose
        otpRecordRepository.deleteAllByUserIdAndPurposeAndIsUsedFalse(user.getId(), purpose);

        // Generate 6-digit OTP code
        String otpCode = String.format("%06d", random.nextInt(100000, 999999));
        
        // Save OTPRecord
        OTPRecord otpRecord = OTPRecord.builder()
                .userId(user.getId())
                .otpCode(otpCode)
                .purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
        otpRecordRepository.save(otpRecord);

        // Print to console (development/SMTP fallback)
        System.out.println("\n==================================================");
        System.out.println("  OTP for " + user.getEmail() + ": " + otpCode);
        System.out.println("  Purpose: " + purpose);
        System.out.println("==================================================\n");

        log.info("[OTP] Generated {} OTP for {}: {}", purpose.toUpperCase(), user.getEmail(), otpCode);
        
        final org.springframework.mail.SimpleMailMessage mailMessage = new org.springframework.mail.SimpleMailMessage();
        mailMessage.setFrom(fromEmail);
        mailMessage.setTo(user.getEmail());
        mailMessage.setSubject("Your CIET ERP " + purpose.substring(0, 1).toUpperCase() + purpose.substring(1) + " OTP");
        mailMessage.setText("Hello,\n\nYour OTP for " + purpose + " is: " + otpCode + "\n\nThis code expires in 10 minutes.\n\n— CIET ERP System");

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                mailSender.send(mailMessage);
                log.info("OTP email successfully sent to {}", user.getEmail());
            } catch (Exception e) {
                log.warn("Failed to dispatch OTP email via SMTP user={}: {}. Fallback printed to console.", user.getEmail(), e.getMessage());
            }
        });
    }

    public boolean verifyOtp(User user, String otpCode, String purpose) {
        OTPRecord record = otpRecordRepository
                .findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        user.getId(), purpose, LocalDateTime.now())
                .orElse(null);

        if (record == null) {
            return false;
        }

        if (!record.getOtpCode().equals(otpCode)) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            otpRecordRepository.save(record);

            if (record.getAttemptCount() >= 3) {
                user.setActive(false);
                userRepository.save(user);
                log.warn("[OTP] Account locked due to 3 failed OTP attempts: {}", user.getEmail());
            }
            return false;
        }

        record.setUsed(true);
        otpRecordRepository.save(record);
        return true;
    }
}
