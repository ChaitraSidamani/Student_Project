package com.sms.controller;

import com.sms.dto.ApiResponse;
import com.sms.repository.AttendanceRepository;
import com.sms.repository.ResultRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class AcademicReportController {
    private final AttendanceRepository attendanceRepository;
    private final ResultRepository resultRepository;

    public AcademicReportController(AttendanceRepository attendanceRepository, ResultRepository resultRepository) {
        this.attendanceRepository = attendanceRepository;
        this.resultRepository = resultRepository;
    }

    @GetMapping("/attendance/subject-wise")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> subjectWiseAttendance(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(ApiResponse.success("Subject-wise attendance fetched",
                attendanceRepository.subjectWiseAttendance(branchId, semester, blankToNull(section), blankToNull(academicYear))
                        .stream().map(this::subjectAttendanceRow).toList()));
    }

    @GetMapping("/attendance/low")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> lowAttendance(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String subject,
            @RequestParam(defaultValue = "75") double threshold) {
        return ResponseEntity.ok(ApiResponse.success("Low attendance students fetched",
                attendanceRepository.lowAttendanceBySubjectAndYear(branchId, semester, blankToNull(section), blankToNull(academicYear), blankToNull(subject), threshold)
                        .stream().map(this::lowAttendanceRow).toList()));
    }

    @GetMapping("/attendance/year-wise")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> yearWiseAttendance() {
        return ResponseEntity.ok(ApiResponse.success("Year-wise attendance fetched",
                attendanceRepository.yearWiseSubjectAttendance().stream().map(this::yearAttendanceRow).toList()));
    }

    @GetMapping("/attendance/semester-wise")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> semesterWiseAttendance() {
        return ResponseEntity.ok(ApiResponse.success("Semester-wise attendance fetched",
                attendanceRepository.semesterWiseAttendance().stream().map(this::semesterAttendanceRow).toList()));
    }

    @GetMapping("/results/semester-wise")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> semesterWiseResults(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String subject) {
        return ResponseEntity.ok(ApiResponse.success("Semester-wise result analytics fetched",
                resultRepository.semesterSubjectAnalytics(branchId, semester, blankToNull(academicYear), blankToNull(subject))
                        .stream().map(this::resultRow).toList()));
    }

    @GetMapping("/results/year-wise")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> yearWiseResults() {
        return ResponseEntity.ok(ApiResponse.success("Year-wise result analytics fetched",
                resultRepository.yearWiseResultAnalytics().stream().map(this::yearResultRow).toList()));
    }

    @GetMapping("/results/students")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> resultStudents(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String subject) {
        return ResponseEntity.ok(ApiResponse.success("Student result rows fetched",
                resultRepository.resultStudentsByYearSemesterSubject(branchId, semester, blankToNull(academicYear), blankToNull(subject))
                        .stream().map(this::studentResultRow).toList()));
    }

    private Map<String, Object> subjectAttendanceRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("subject", row[0]);
        map.put("totalClasses", row[1]);
        map.put("presentClasses", row[2]);
        map.put("percentage", round(row[3]));
        return map;
    }

    private Map<String, Object> lowAttendanceRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("studentId", row[0]);
        map.put("studentName", row[1] + " " + row[2]);
        map.put("rollNumber", row[3]);
        map.put("branch", row[4]);
        map.put("semester", row[5]);
        map.put("section", row[6]);
        map.put("subject", row[7]);
        map.put("totalClasses", row[8]);
        map.put("presentClasses", row[9]);
        map.put("percentage", round(row[10]));
        return map;
    }

    private Map<String, Object> yearAttendanceRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("academicYear", row[0]);
        map.put("subject", row[1]);
        map.put("totalClasses", row[2]);
        map.put("presentClasses", row[3]);
        map.put("percentage", round(row[4]));
        return map;
    }

    private Map<String, Object> semesterAttendanceRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("semester", row[0]);
        map.put("label", "Sem " + row[0]);
        map.put("totalClasses", row[1]);
        map.put("presentClasses", row[2]);
        map.put("percentage", round(row[3]));
        return map;
    }

    private Map<String, Object> resultRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("semester", row[0]);
        map.put("subject", row[1]);
        map.put("resultCount", row[2]);
        map.put("averagePercentage", round(row[3]));
        map.put("passPercentage", round(row[4]));
        return map;
    }

    private Map<String, Object> yearResultRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("academicYear", row[0]);
        map.put("semester", row[1]);
        map.put("resultCount", row[2]);
        map.put("averagePercentage", round(row[3]));
        map.put("passPercentage", round(row[4]));
        return map;
    }

    private Map<String, Object> studentResultRow(Object[] row) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("studentId", row[0]);
        map.put("studentName", row[1] + " " + row[2]);
        map.put("rollNumber", row[3]);
        map.put("branch", row[4]);
        map.put("academicYear", row[5]);
        map.put("semester", row[6]);
        map.put("subject", row[7]);
        map.put("resultCount", row[8]);
        map.put("averagePercentage", round(row[9]));
        map.put("passPercentage", round(row[10]));
        return map;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private double round(Object value) {
        if (value == null) return 0;
        return Math.round(((Number) value).doubleValue() * 10.0) / 10.0;
    }
}
