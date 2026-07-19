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
@Document(collection = "education_backgrounds")
public class EducationBackground {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String eduType; // SSC, Inter, Diploma, EAMCET, ECET
    private String institution;
    private String boardUniversity;
    private Integer yearOfPassing;
    private String score;
    private String scoreType; // %, GPA, Rank

    @Builder.Default
    private boolean isVerified = false;

    private String verifiedBy; // User ID of verifier
    private LocalDateTime verifiedAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
