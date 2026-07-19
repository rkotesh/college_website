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
@Document(collection = "projects")
public class Project {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String projectType; // college, external
    private String title;
    private String description;
    private String techStack;
    private String coverImageUrl;
    
    @Builder.Default
    private boolean isGroup = false;
    
    @Builder.Default
    private int teamSize = 1;

    private String repoUrl;

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
