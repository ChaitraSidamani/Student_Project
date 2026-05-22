package com.sms.repository;

import com.sms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    List<User> findByRole(User.Role role);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
