package com.sms.controller;

import com.sms.dto.*;
import com.sms.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired private StudentService studentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<StudentResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Students fetched", studentService.getAll()));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<PageResponse<StudentResponse>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) com.sms.entity.Student.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "rollNumber") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        return ResponseEntity.ok(ApiResponse.success("Students fetched",
                studentService.searchStudents(q, branchId, subjectId, semester, section, academicYear,
                        fromDate, toDate, status, page, size, sortBy, sortDir)));
    }

    @GetMapping("/filters")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<StudentFilterOptionsResponse>> filters() {
        return ResponseEntity.ok(ApiResponse.success("Filters fetched", studentService.getFilterOptions()));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<StudentAnalyticsResponse>> analytics() {
        return ResponseEntity.ok(ApiResponse.success("Analytics fetched", studentService.getAnalytics()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<StudentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Student fetched", studentService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StudentResponse>> create(@Valid @RequestBody StudentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Student created", studentService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StudentResponse>> update(@PathVariable Long id,
            @Valid @RequestBody StudentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Student updated", studentService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        studentService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Student deleted", null));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<StudentResponse>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", studentService.getProfile()));
    }

    @PutMapping("/profile/section")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<StudentResponse>> updateMySection(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(ApiResponse.success("Section updated",
                studentService.updateMySection(request.get("section"))));
    }

    @PostMapping("/profile/subjects")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<StudentResponse>> registerSubjects(
            @RequestBody Map<String, List<String>> request) {
        return ResponseEntity.ok(ApiResponse.success("Subjects registered",
                studentService.registerSubjects(request.get("subjects"))));
    }

    // ─── Global registration toggle (Admin only) ──────────────────────────────

    @GetMapping("/registration/status")
    @PreAuthorize("hasAnyRole('ADMIN','STUDENT','FACULTY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registrationStatus() {
        boolean open = studentService.isRegistrationOpen();
        return ResponseEntity.ok(ApiResponse.success("Registration status",
                Map.of("open", open)));
    }

    @PostMapping("/registration/open")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> openRegistration() {
        studentService.setRegistrationOpen(true);
        return ResponseEntity.ok(ApiResponse.success("Subject registration opened for all students",
                Map.of("open", true)));
    }

    @PostMapping("/registration/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> closeRegistration() {
        studentService.setRegistrationOpen(false);
        return ResponseEntity.ok(ApiResponse.success("Subject registration closed for all students",
                Map.of("open", false)));
    }
}
