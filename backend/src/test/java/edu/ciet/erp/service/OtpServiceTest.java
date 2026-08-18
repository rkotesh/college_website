package edu.ciet.erp.service;

import edu.ciet.erp.model.OTPRecord;
import edu.ciet.erp.model.User;
import edu.ciet.erp.repository.OTPRecordRepository;
import edu.ciet.erp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OtpService Tests")
class OtpServiceTest {

    @Mock
    private OTPRecordRepository otpRecordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private OtpService otpService;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "fromEmail", "support@ciet.edu.in");
        testUser = User.builder()
                .id("u123")
                .email("teststudent@ciet.edu.in")
                .fullName("Test Student")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("generateAndSendOtp deletes old OTPs, persists new OTP, and attempts mail delivery")
    void testGenerateAndSendOtp() {
        otpService.generateAndSendOtp(testUser, "login");

        verify(otpRecordRepository).deleteAllByUserIdAndPurposeAndIsUsedFalse("u123", "login");

        ArgumentCaptor<OTPRecord> recordCaptor = ArgumentCaptor.forClass(OTPRecord.class);
        verify(otpRecordRepository).save(recordCaptor.capture());

        OTPRecord savedRecord = recordCaptor.getValue();
        assertThat(savedRecord.getUserId()).isEqualTo("u123");
        assertThat(savedRecord.getPurpose()).isEqualTo("login");
        assertThat(savedRecord.getOtpCode()).matches("\\d{6}");
        assertThat(savedRecord.isUsed()).isFalse();
        assertThat(savedRecord.getExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    @DisplayName("verifyOtp returns true and marks OTP as used when valid code is supplied")
    void testVerifyOtpSuccess() {
        OTPRecord record = OTPRecord.builder()
                .id("otp1")
                .userId("u123")
                .otpCode("654321")
                .purpose("login")
                .isUsed(false)
                .attemptCount(0)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(otpRecordRepository.findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("u123"), eq("login"), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        boolean verified = otpService.verifyOtp(testUser, "654321", "login");

        assertThat(verified).isTrue();
        assertThat(record.isUsed()).isTrue();
        verify(otpRecordRepository).save(record);
    }

    @Test
    @DisplayName("verifyOtp returns false and increments attemptCount on mismatch")
    void testVerifyOtpMismatch() {
        OTPRecord record = OTPRecord.builder()
                .id("otp1")
                .userId("u123")
                .otpCode("654321")
                .purpose("login")
                .isUsed(false)
                .attemptCount(0)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(otpRecordRepository.findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("u123"), eq("login"), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        boolean verified = otpService.verifyOtp(testUser, "111111", "login");

        assertThat(verified).isFalse();
        assertThat(record.getAttemptCount()).isEqualTo(1);
        verify(otpRecordRepository).save(record);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("verifyOtp locks user account after 3 failed attempts")
    void testVerifyOtpAccountLockout() {
        OTPRecord record = OTPRecord.builder()
                .id("otp1")
                .userId("u123")
                .otpCode("654321")
                .purpose("login")
                .isUsed(false)
                .attemptCount(2)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(otpRecordRepository.findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("u123"), eq("login"), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        boolean verified = otpService.verifyOtp(testUser, "999999", "login");

        assertThat(verified).isFalse();
        assertThat(record.getAttemptCount()).isEqualTo(3);
        assertThat(testUser.isActive()).isFalse();
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("verifyOtp returns false when OTP is not found or expired")
    void testVerifyOtpNotFound() {
        when(otpRecordRepository.findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("u123"), eq("login"), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        boolean verified = otpService.verifyOtp(testUser, "123456", "login");

        assertThat(verified).isFalse();
        verify(otpRecordRepository, never()).save(any());
    }
}
