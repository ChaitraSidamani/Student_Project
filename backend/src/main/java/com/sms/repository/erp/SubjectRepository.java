package com.sms.repository.erp;

import com.sms.entity.erp.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByBranchIdAndSemester_Number(Long branchId, Integer number);
    Optional<Subject> findByCode(String code);
}
