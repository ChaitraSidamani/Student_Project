package com.sms.repository;

import com.sms.entity.Result;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ResultRepository extends JpaRepository<Result, Long> {

    List<Result> findByStudentId(Long studentId);

    void deleteByStudentId(Long studentId);

    List<Result> findByStudentIdAndSemester(Long studentId, Integer semester);

    List<Result> findByStudentIdAndSubject(Long studentId, String subject);

    List<Result> findByStudentIdAndExamTypeAndSemester(Long studentId, Result.ExamType examType, Integer semester);

    @Query("SELECT r FROM Result r WHERE r.student.id = :studentId " +
           "AND LOWER(TRIM(r.subject)) = LOWER(TRIM(:subject)) " +
           "AND r.examType = :examType AND r.semester = :semester")
    Optional<Result> findExistingResult(@Param("studentId") Long studentId,
                                        @Param("subject") String subject,
                                        @Param("examType") Result.ExamType examType,
                                        @Param("semester") Integer semester);

    @Query("SELECT AVG(r.marksObtained / r.maxMarks * 100) FROM Result r WHERE r.student.id = :studentId")
    Double findAveragePercentage(@Param("studentId") Long studentId);

    @Query("SELECT COUNT(r) FROM Result r WHERE (r.marksObtained / r.maxMarks * 100) >= 40")
    long countPassedResults();

    @Query("SELECT COUNT(DISTINCT r.student.id) FROM Result r")
    long countStudentsWithResults();

    @Query("SELECT COUNT(DISTINCT r.student.id) FROM Result r WHERE (r.marksObtained / r.maxMarks * 100) < 40")
    long countFailedStudents();

    @Query("SELECT r.student.id, r.student.firstName, r.student.lastName, r.student.rollNumber, r.student.course.code, " +
           "AVG(r.marksObtained / r.maxMarks * 100) AS averagePercentage " +
           "FROM Result r GROUP BY r.student.id, r.student.firstName, r.student.lastName, r.student.rollNumber, r.student.course.code " +
           "ORDER BY AVG(r.marksObtained / r.maxMarks * 100) DESC")
    List<Object[]> topPerformingStudents();

    @Query("SELECT r.student.id, r.student.firstName, r.student.lastName, r.student.rollNumber, r.student.course.code, r.semester, r.subject, " +
           "MIN(r.marksObtained / r.maxMarks * 100) AS lowestPercentage " +
           "FROM Result r WHERE (r.marksObtained / r.maxMarks * 100) < 40 " +
           "GROUP BY r.student.id, r.student.firstName, r.student.lastName, r.student.rollNumber, r.student.course.code, r.semester, r.subject " +
           "ORDER BY MIN(r.marksObtained / r.maxMarks * 100) ASC")
    List<Object[]> failedStudents();

    @Query("SELECT r.student.course.code, (SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r GROUP BY r.student.course.code")
    List<Object[]> passPercentageByDepartment();

    @Query("SELECT r.semester, r.subject, COUNT(r), AVG(r.marksObtained / r.maxMarks * 100), " +
           "(SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r " +
           "WHERE (:courseId IS NULL OR r.student.course.id = :courseId) " +
           "AND (:semester IS NULL OR r.semester = :semester) " +
           "AND (:academicYear IS NULL OR r.student.academicYear = :academicYear) " +
           "AND (:subject IS NULL OR LOWER(r.subject) = LOWER(:subject)) " +
           "GROUP BY r.semester, r.subject ORDER BY r.semester, r.subject")
    List<Object[]> semesterSubjectAnalytics(@Param("courseId") Long courseId,
                                            @Param("semester") Integer semester,
                                            @Param("academicYear") String academicYear,
                                            @Param("subject") String subject);

    @Query("SELECT r.student.academicYear, r.semester, COUNT(r), AVG(r.marksObtained / r.maxMarks * 100), " +
           "(SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r WHERE r.student.academicYear IS NOT NULL " +
           "GROUP BY r.student.academicYear, r.semester ORDER BY r.student.academicYear DESC, r.semester")
    List<Object[]> yearWiseResultAnalytics();

    @Query("SELECT r.student.academicYear, COUNT(DISTINCT r.student.id), COUNT(r), AVG(r.marksObtained / r.maxMarks * 100), " +
           "(SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r WHERE r.student.academicYear IS NOT NULL " +
           "GROUP BY r.student.academicYear ORDER BY r.student.academicYear DESC")
    List<Object[]> dashboardYearWiseResults();

    @Query("SELECT r.semester, COUNT(DISTINCT r.student.id), COUNT(r), AVG(r.marksObtained / r.maxMarks * 100), " +
           "(SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r GROUP BY r.semester ORDER BY r.semester")
    List<Object[]> dashboardSemesterWiseResults();

    @Query("SELECT r.subject, COUNT(DISTINCT r.student.id), COUNT(r), AVG(r.marksObtained / r.maxMarks * 100), " +
           "(SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r GROUP BY r.subject ORDER BY AVG(r.marksObtained / r.maxMarks * 100) DESC")
    List<Object[]> dashboardSubjectWiseResults();

    @Query("SELECT r.student.id, r.student.firstName, r.student.lastName, r.student.rollNumber, r.student.course.code, " +
           "r.student.academicYear, r.semester, r.subject, COUNT(r), AVG(r.marksObtained / r.maxMarks * 100), " +
           "(SUM(CASE WHEN (r.marksObtained / r.maxMarks * 100) >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(r)) " +
           "FROM Result r " +
           "WHERE (:courseId IS NULL OR r.student.course.id = :courseId) " +
           "AND (:semester IS NULL OR r.semester = :semester) " +
           "AND (:academicYear IS NULL OR r.student.academicYear = :academicYear) " +
           "AND (:subject IS NULL OR LOWER(r.subject) = LOWER(:subject)) " +
           "GROUP BY r.student.id, r.student.firstName, r.student.lastName, r.student.rollNumber, r.student.course.code, " +
           "r.student.academicYear, r.semester, r.subject " +
           "ORDER BY r.student.academicYear DESC, r.semester, r.subject, r.student.rollNumber")
    List<Object[]> resultStudentsByYearSemesterSubject(@Param("courseId") Long courseId,
                                                       @Param("semester") Integer semester,
                                                       @Param("academicYear") String academicYear,
                                                       @Param("subject") String subject);
}
