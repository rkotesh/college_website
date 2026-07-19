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
@Document(collection = "escalation_messages")
public class EscalationMessage {
    @Id
    private String id;

    @Indexed
    private String threadId;

    private String senderUserId;
    private String senderName;
    private String senderRole;
    private String content;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
