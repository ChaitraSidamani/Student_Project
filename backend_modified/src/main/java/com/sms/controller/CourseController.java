package com.sms.controller;

import com.sms.dto.ApiResponse;
import com.sms.dto.CourseRequest;
import com.sms.dto.CourseResponse;
import com.sms.service.CourseService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired private CourseService courseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Courses fetched", courseService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Course fetched", courseService.getById(id)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<CourseResponse>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success("Course fetched", courseService.getByCode(code)));
    }

    @GetMapping("/active/list")
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getActiveCourses() {
        return ResponseEntity.ok(ApiResponse.success("Active courses fetched", courseService.getActiveCourses()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CourseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Course created", courseService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseResponse>> update(@PathVariable Long id, @Valid @RequestBody CourseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Course updated", courseService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Course deleted", null));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseResponse>> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Course deactivated", courseService.deactivate(id)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Course activated", courseService.activate(id)));
    }
}
