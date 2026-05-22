package com.sms.controller;

import com.sms.dto.*;
import com.sms.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired private AttendanceService attendanceService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> mark(@Valid @RequestBody AttendanceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Attendance marked", attendanceService.mark(request)));
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> markBulk(
            @Valid @RequestBody List<AttendanceRequest> requests) {
        return ResponseEntity.ok(ApiResponse.success("Bulk attendance marked", attendanceService.markBulk(requests)));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.success("Attendance fetched", attendanceService.getByStudent(studentId)));
    }

    @GetMapping("/summary/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.success("Summary fetched", attendanceService.getSummary(studentId)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getMyAttendance() {
        return ResponseEntity.ok(ApiResponse.success("Attendance fetched", attendanceService.getMyAttendance()));
    }

    @GetMapping("/my/summary")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMySummary() {
        return ResponseEntity.ok(ApiResponse.success("Summary fetched", attendanceService.getMySummary()));
    }
}
