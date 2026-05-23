package com.sms.repository.erp;

import com.sms.entity.erp.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimetableRepository extends JpaRepository<Timetable, Long> {
    List<Timetable> findByBranchIdAndSemesterAndSection(Long branchId, Integer semester, String section);
}
