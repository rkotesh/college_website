package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "otp_records")
public class OTPRecord {
    @Id
    private String id;
    
    private String userId;
    private String otpCode;
    private String purpose;
    private LocalDateTime expiresAt;
    
    @Builder.Default
    private boolean isUsed = false;
    
    @Builder.Default
    private int attemptCount = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
