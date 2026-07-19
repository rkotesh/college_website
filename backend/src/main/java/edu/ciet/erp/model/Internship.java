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
@Document(collection = "internships")
public class Internship {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String organization;
    private String role;
    private String startDate; // YYYY-MM-DD
    private String endDate; // YYYY-MM-DD
    private String technologies;
    private String description;
    private String supervisorName;
    private String supervisorEmail;
    private String certificateUrl;

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
