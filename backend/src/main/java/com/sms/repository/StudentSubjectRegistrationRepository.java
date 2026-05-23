package com.sms.repository;

import com.sms.entity.StudentSubjectRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StudentSubjectRegistrationRepository extends JpaRepository<StudentSubjectRegistration, Long> {
    List<StudentSubjectRegistration> findByStudentId(Long studentId);

    @Query("SELECT r FROM StudentSubjectRegistration r WHERE r.student.id = :studentId AND r.subject.id = :subjectId")
    java.util.Optional<StudentSubjectRegistration> findByStudentIdAndSubjectId(
        @Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

    @Modifying
    @Query("DELETE FROM StudentSubjectRegistration r WHERE r.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
