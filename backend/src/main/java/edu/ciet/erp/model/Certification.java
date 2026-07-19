package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "certifications")
public class Certification {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String certType; // upload, link, college
    private String title;
    private String issuer;
    private String issuedDate; // YYYY-MM-DD
    private String certUrl;
    private String fileUrl;
    private String description;

    @Builder.Default
    private boolean isVerified = false;

    @Builder.Default
    @JsonProperty("isFeatured")
    private boolean isFeatured = false;

    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String rejectionReason;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
