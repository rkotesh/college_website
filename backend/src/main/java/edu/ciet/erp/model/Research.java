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
@Document(collection = "research")
public class Research {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String researchType; // college, external
    private String title;
    private String advisorName;
    private String advisorEmail;
    private String outcome; // paper, book, other
    private String publisher;
    private String publicationUrl;
    private String publishedDate; // YYYY-MM-DD

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
