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
@Document(collection = "announcements")
public class Announcement {
    @Id
    private String id;

    private String title;
    private String content;
    private String resourceUrl;

    @Indexed
    private String departmentId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
