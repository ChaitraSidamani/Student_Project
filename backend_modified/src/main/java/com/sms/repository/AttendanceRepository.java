package com.sms.repository;

import com.sms.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByStudentId(Long studentId);

    void deleteByStudentId(Long studentId);

    List<Attendance> findByStudentIdAndSubject(Long studentId, String subject);

    List<Attendance> findBySubjectAndAttendanceDate(String subject, LocalDate date);

    @Query("SELECT a FROM Attendance a WHERE a.student.course.id = :courseId AND a.subject = :subject AND a.attendanceDate = :date")
    List<Attendance> findByCourseAndSubjectAndDate(@Param("courseId") Long courseId,
                                                    @Param("subject") String subject,
                                                    @Param("date") LocalDate date);
    
    @Query("SELECT a FROM Attendance a WHERE a.student.id = :studentId AND a.subject = :subject AND a.attendanceDate = :date")
    List<Attendance> findByStudentAndSubjectAndDate(@Param("studentId") Long studentId,
                                                     @Param("subject") String string,
                                                     @Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.student.id = :studentId AND a.subject = :subject AND a.status = 'PRESENT'")
    long countPresent(@Param("studentId") Long studentId, @Param("subject") String subject);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.student.id = :studentId AND a.subject = :subject")
    long countTotal(@Param("studentId") Long studentId, @Param("subject") String subject);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.status = 'PRESENT'")
    long countPresentAll();

    @Query("SELECT a.student.course.code, (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) " +
           "FROM Attendance a GROUP BY a.student.course.code")
    List<Object[]> attendancePercentageByDepartment();

    @Query("SELECT a.student.id, a.student.firstName, a.student.lastName, a.student.rollNumber, a.student.course.code, " +
           "(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) AS percentage " +
           "FROM Attendance a GROUP BY a.student.id, a.student.firstName, a.student.lastName, a.student.rollNumber, a.student.course.code " +
           "HAVING (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) < :threshold " +
           "ORDER BY percentage ASC")
    List<Object[]> findLowAttendanceStudents(@Param("threshold") double threshold);

    @Query("SELECT a.subject, COUNT(a), SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), " +
           "(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) " +
           "FROM Attendance a " +
           "WHERE (:courseId IS NULL OR a.student.course.id = :courseId) " +
           "AND (:semester IS NULL OR a.student.semester = :semester) " +
           "AND (:section IS NULL OR LOWER(a.student.section) = LOWER(:section)) " +
           "AND (:academicYear IS NULL OR a.student.academicYear = :academicYear) " +
           "GROUP BY a.subject ORDER BY a.subject")
    List<Object[]> subjectWiseAttendance(@Param("courseId") Long courseId,
                                         @Param("semester") Integer semester,
                                         @Param("section") String section,
                                         @Param("academicYear") String academicYear);

    @Query("SELECT a.student.id, a.student.firstName, a.student.lastName, a.student.rollNumber, a.student.course.code, a.student.semester, a.student.section, a.subject, " +
           "COUNT(a), SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), " +
           "(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) AS percentage " +
           "FROM Attendance a " +
           "WHERE (:courseId IS NULL OR a.student.course.id = :courseId) " +
           "AND (:semester IS NULL OR a.student.semester = :semester) " +
           "AND (:section IS NULL OR LOWER(a.student.section) = LOWER(:section)) " +
           "AND (:academicYear IS NULL OR a.student.academicYear = :academicYear) " +
           "AND (:subject IS NULL OR LOWER(a.subject) = LOWER(:subject)) " +
           "GROUP BY a.student.id, a.student.firstName, a.student.lastName, a.student.rollNumber, a.student.course.code, a.student.semester, a.student.section, a.subject " +
           "HAVING (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) < :threshold " +
           "ORDER BY percentage ASC")
    List<Object[]> lowAttendanceBySubjectAndYear(@Param("courseId") Long courseId,
                                                 @Param("semester") Integer semester,
                                                 @Param("section") String section,
                                                 @Param("academicYear") String academicYear,
                                                 @Param("subject") String subject,
                                                 @Param("threshold") double threshold);

    @Query("SELECT a.student.academicYear, a.subject, COUNT(a), SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), " +
           "(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) " +
           "FROM Attendance a " +
           "WHERE a.student.academicYear IS NOT NULL " +
           "GROUP BY a.student.academicYear, a.subject ORDER BY a.student.academicYear DESC, a.subject")
    List<Object[]> yearWiseSubjectAttendance();

    @Query("SELECT a.student.semester, COUNT(a), SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), " +
           "(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(a)) " +
           "FROM Attendance a " +
           "WHERE a.student.semester IS NOT NULL " +
           "GROUP BY a.student.semester ORDER BY a.student.semester")
    List<Object[]> semesterWiseAttendance();
}
