package com.sms.repository.erp;

import com.sms.entity.erp.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByStudentId(Long studentId);
    void deleteByStudentId(Long studentId);
    List<AttendanceRecord> findByBranchIdAndSemesterAndSectionAndAttendanceDateBetween(Long branchId, Integer semester, String section, LocalDate from, LocalDate to);
}
