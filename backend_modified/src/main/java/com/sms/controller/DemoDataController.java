package com.sms.controller;

import com.sms.config.DataInitializer;
import com.sms.dto.ApiResponse;
import com.sms.repository.AttendanceRepository;
import com.sms.repository.ResultRepository;
import com.sms.repository.StudentRepository;
import com.sms.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/demo")
public class DemoDataController {
    private final DataInitializer dataInitializer;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final ResultRepository resultRepository;

    public DemoDataController(
            DataInitializer dataInitializer,
            StudentRepository studentRepository,
            UserRepository userRepository,
            AttendanceRepository attendanceRepository,
            ResultRepository resultRepository) {
        this.dataInitializer = dataInitializer;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.resultRepository = resultRepository;
    }

    @PostMapping("/seed")
    public ResponseEntity<ApiResponse<Map<String, Object>>> seed() {
        dataInitializer.seedDemoData();
        return ResponseEntity.ok(ApiResponse.success("Admin login ensured; no predefined courses created", counts()));
    }

    @GetMapping("/counts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> countsEndpoint() {
        return ResponseEntity.ok(ApiResponse.success("Demo counts fetched", counts()));
    }

    private Map<String, Object> counts() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("users", userRepository.count());
        data.put("students", studentRepository.count());
        data.put("attendanceRecords", attendanceRepository.count());
        data.put("resultRecords", resultRepository.count());
        data.put("adminLogin", "admin / admin123");
        return data;
    }
}
