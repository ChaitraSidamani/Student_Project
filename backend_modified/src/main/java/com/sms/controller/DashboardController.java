package com.sms.controller;

import com.sms.dto.ApiResponse;
import com.sms.repository.*;
import com.sms.repository.erp.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired private StudentRepository studentRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private ResultRepository resultRepository;
    @Autowired private SubjectRepository subjectRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {

        long totalStudents = studentRepository.count();
        long activeStudents = studentRepository.countActiveStudents();
        long totalCourses = courseRepository.count();
        long totalSubjects = subjectRepository.count();

        long totalFaculty = userRepository.findAll()
                .stream()
                .filter(u -> u.getRole().name().equals("FACULTY"))
                .count();

        long totalAttendance = attendanceRepository.count();
        long presentAttendance = attendanceRepository.countPresentAll();
        long totalResults = resultRepository.count();
        long passedResults = resultRepository.countPassedResults();
        long studentsWithResults = resultRepository.countStudentsWithResults();
        long failedStudents = resultRepository.countFailedStudents();
        long passedStudents = Math.max(0, studentsWithResults - failedStudents);
        long lowAttendanceStudents = attendanceRepository.findLowAttendanceStudents(75).size();

        double attendancePercentage = totalAttendance == 0 ? 0 : round((presentAttendance * 100.0) / totalAttendance);
        double passPercentage = studentsWithResults == 0 ? 0 : round((passedStudents * 100.0) / studentsWithResults);
        double lowAttendancePercentage = totalStudents == 0 ? 0 : round((lowAttendanceStudents * 100.0) / totalStudents);

        Map<String, Object> stats = new HashMap<>();

        stats.put("totalStudents", totalStudents);
        stats.put("activeStudents", activeStudents);
        stats.put("totalCourses", totalCourses);
        stats.put("totalSubjects", totalSubjects);
        stats.put("totalFaculty", totalFaculty);
        stats.put("totalAttendanceRecords", totalAttendance);
        stats.put("presentAttendanceRecords", presentAttendance);
        stats.put("totalResultRecords", totalResults);
        stats.put("passedResultRecords", passedResults);
        stats.put("studentsWithResults", studentsWithResults);
        stats.put("passedStudents", passedStudents);
        stats.put("failedStudents", failedStudents);
        stats.put("attendancePercentage", attendancePercentage);
        stats.put("passPercentage", passPercentage);
        stats.put("lowAttendanceStudents", lowAttendanceStudents);
        stats.put("lowAttendancePercentage", lowAttendancePercentage);
        stats.put("yearWiseResults", resultRepository.dashboardYearWiseResults().stream().map(this::yearResultRow).toList());
        stats.put("semesterWiseResults", resultRepository.dashboardSemesterWiseResults().stream().map(this::semesterResultRow).toList());
        stats.put("subjectWiseResults", resultRepository.dashboardSubjectWiseResults().stream().map(this::subjectResultRow).toList());

        return ResponseEntity.ok(ApiResponse.success("Stats fetched", stats));
    }

    private Map<String, Object> yearResultRow(Object[] row) {
        Map<String, Object> map = baseResultRow(row);
        map.put("academicYear", row[0]);
        return map;
    }

    private Map<String, Object> semesterResultRow(Object[] row) {
        Map<String, Object> map = baseResultRow(row);
        map.put("semester", row[0]);
        map.put("label", "Sem " + row[0]);
        return map;
    }

    private Map<String, Object> subjectResultRow(Object[] row) {
        Map<String, Object> map = baseResultRow(row);
        map.put("subject", row[0]);
        map.put("label", row[0]);
        return map;
    }

    private Map<String, Object> baseResultRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("studentCount", row[1]);
        map.put("resultCount", row[2]);
        map.put("averagePercentage", roundNumber(row[3]));
        map.put("passPercentage", roundNumber(row[4]));
        return map;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double roundNumber(Object value) {
        if (value == null) return 0;
        return round(((Number) value).doubleValue());
    }
}
