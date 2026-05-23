package com.sms.repository.erp;

import com.sms.entity.erp.FacultySubjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FacultySubjectAssignmentRepository extends JpaRepository<FacultySubjectAssignment, Long> {
    List<FacultySubjectAssignment> findByFacultyIdAndActiveTrue(Long facultyId);

    @Query("SELECT a FROM FacultySubjectAssignment a WHERE a.active = true " +
           "AND a.subject.id = :subjectId " +
           "AND a.semester = :semester " +
           "AND LOWER(COALESCE(a.section, '')) = LOWER(COALESCE(:section, '')) " +
           "AND COALESCE(a.academicYear, '') = COALESCE(:academicYear, '') " +
           "AND (:excludeId IS NULL OR a.id <> :excludeId)")
    List<FacultySubjectAssignment> findActiveConflicts(@Param("subjectId") Long subjectId,
                                                       @Param("semester") Integer semester,
                                                       @Param("section") String section,
                                                       @Param("academicYear") String academicYear,
                                                       @Param("excludeId") Long excludeId);

    @Query("SELECT a FROM FacultySubjectAssignment a WHERE a.active = true " +
           "AND a.faculty.id = :facultyId " +
           "AND a.semester = :semester " +
           "AND COALESCE(a.academicYear, '') = COALESCE(:academicYear, '') " +
           "AND (:excludeId IS NULL OR a.id <> :excludeId)")
    List<FacultySubjectAssignment> findActiveFacultySemesterConflicts(@Param("facultyId") Long facultyId,
                                                                      @Param("semester") Integer semester,
                                                                      @Param("academicYear") String academicYear,
                                                                      @Param("excludeId") Long excludeId);
}
