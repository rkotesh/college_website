package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "courses")
public class Course {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String title;
    private String source; // faculty, nptel, external
    private String platform;
    
    @Builder.Default
    private int completionPercentage = 100;
    
    private String certificateUrl;

    @Builder.Default
    private boolean isVerified = false;

    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String rejectionReason;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
