package edu.ciet.erp.repository;

import edu.ciet.erp.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

import edu.ciet.erp.model.Role;
import java.util.List;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findAllByRole(Role role);
}
