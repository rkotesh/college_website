package edu.ciet.erp.repository;

import edu.ciet.erp.model.OTPRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public interface OTPRecordRepository extends MongoRepository<OTPRecord, String> {
    Optional<OTPRecord> findFirstByUserIdAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String userId, String purpose, LocalDateTime time);
    
    // Custom query to invalidate prior active OTPs
    void deleteAllByUserIdAndPurposeAndIsUsedFalse(String userId, String purpose);
}
