package com.sms.repository.erp;

import com.sms.entity.erp.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByUserId(Long userId);
    Optional<Faculty> findByUserUsername(String username);
    Optional<Faculty> findByEmployeeCode(String employeeCode);
}
