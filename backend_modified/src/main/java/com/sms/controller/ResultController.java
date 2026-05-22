package com.sms.controller;

import com.sms.dto.*;
import com.sms.service.ResultService;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/results")
public class ResultController {

    @Autowired
    private ResultService resultService;

    // Add result (Admin or Faculty)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<ResultResponse>> add(
            @Valid @RequestBody ResultRequest request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Result added",
                        resultService.add(request)
                )
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<ResultResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ResultRequest request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Result updated",
                        resultService.update(id, request)
                )
        );
    }

    // Get results by student
    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<ResultResponse>>> getByStudent(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Results fetched",
                        resultService.getByStudent(studentId)
                )
        );
    }

    // Get results by semester
    @GetMapping("/student/{studentId}/semester/{semester}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<ResultResponse>>> getBySemester(
            @PathVariable Long studentId,
            @PathVariable Integer semester) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Results fetched",
                        resultService.getBySemester(studentId, semester)
                )
        );
    }

    // Get student report
    @GetMapping("/report/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReport(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Report generated",
                        resultService.getReport(studentId)
                )
        );
    }

    // Student login → view own results
    @PostMapping("/share")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> shareResult(@RequestBody Map<String, Object> request) {
        Long studentId = Long.valueOf(String.valueOf(request.get("studentId")));
        String subject = request.get("subject") == null ? null : String.valueOf(request.get("subject"));
        Integer semester = request.get("semester") == null || String.valueOf(request.get("semester")).isBlank()
                ? null
                : Integer.valueOf(String.valueOf(request.get("semester")));

        return ResponseEntity.ok(ApiResponse.success("Result shared", resultService.shareResult(studentId, subject, semester)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<ResultResponse>>> getMyResults() {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Results fetched",
                        resultService.getMyResults()
                )
        );
    }
}
