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
@Document(collection = "messages")
public class Message {
    @Id
    private String id;

    @Indexed
    private String studentRollNo;

    private String sender; // e.g. "Placement Officer", "HOD", "You"
    private String messageText;
    private boolean incoming; // true = received by student, false = sent by student

    private String senderId;
    private String senderName;
    private String senderRole;
    private String recipientId;
    private String recipientName;
    private String recipientRole;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
