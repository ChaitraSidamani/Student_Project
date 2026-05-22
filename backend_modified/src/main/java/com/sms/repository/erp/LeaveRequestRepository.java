package com.sms.repository.erp;

import com.sms.entity.erp.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByFacultyId(Long facultyId);
}
