package com.sms.repository.erp;

import com.sms.entity.erp.FeeLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeeLedgerRepository extends JpaRepository<FeeLedger, Long> {
    List<FeeLedger> findByStudentId(Long studentId);
    void deleteByStudentId(Long studentId);
}
