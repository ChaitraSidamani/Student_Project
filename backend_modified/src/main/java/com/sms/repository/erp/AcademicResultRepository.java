package com.sms.repository.erp;

import com.sms.entity.erp.AcademicResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AcademicResultRepository extends JpaRepository<AcademicResult, Long> {
    List<AcademicResult> findByStudentId(Long studentId);
    void deleteByStudentId(Long studentId);
    List<AcademicResult> findBySemester(Integer semester);
    List<AcademicResult> findBySubjectId(Long subjectId);
}
