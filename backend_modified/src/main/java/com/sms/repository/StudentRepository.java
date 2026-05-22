package com.sms.repository;

import com.sms.entity.Student;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
    Optional<Student> findByRollNumber(String rollNumber);
    Optional<Student> findByUserId(Long userId);
    boolean existsByRollNumber(String rollNumber);
    boolean existsByEmail(String email);
    List<Student> findByCourseId(Long courseId);
    long countByCourseId(Long courseId);

    @Override
    @EntityGraph(attributePaths = "course")
    Page<Student> findAll(Specification<Student> spec, Pageable pageable);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.status = 'ACTIVE'")
    long countActiveStudents();

    @Query("SELECT s.course.code, COUNT(s) FROM Student s GROUP BY s.course.code ORDER BY COUNT(s) DESC")
    List<Object[]> countByDepartment();

    @Query("SELECT DISTINCT s.section FROM Student s WHERE s.section IS NOT NULL AND s.section <> '' ORDER BY s.section")
    List<String> findDistinctSections();

    @Query("SELECT DISTINCT s.academicYear FROM Student s WHERE s.academicYear IS NOT NULL AND s.academicYear <> '' ORDER BY s.academicYear DESC")
    List<String> findDistinctAcademicYears();
}
