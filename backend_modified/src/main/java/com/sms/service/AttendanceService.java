package com.sms.service;

import com.sms.dto.*;
import com.sms.entity.*;
import com.sms.repository.*;
import com.sms.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl ud) {
            return userRepository.findById(ud.getId()).orElse(null);
        }

        return null;
    }

    public AttendanceResponse mark(AttendanceRequest req) {

        validateAttendanceDate(req.getAttendanceDate());

        Student student = studentRepository.findById(req.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found"));
        
        List<Attendance> byStudentAndSubjectAndDate = attendanceRepository.findByStudentAndSubjectAndDate(req.getStudentId(), req.getSubject(), req.getAttendanceDate());
        
        Attendance attendance = byStudentAndSubjectAndDate.isEmpty()
                ? new Attendance()
                : byStudentAndSubjectAndDate.get(0);

        attendance.setStudent(student);
        attendance.setSubject(req.getSubject());
        attendance.setAttendanceDate(req.getAttendanceDate());
        attendance.setStatus(req.getStatus());
        attendance.setMarkedBy(getCurrentUser());
        attendance.setRemarks(req.getRemarks());

        return AttendanceResponse.from(attendanceRepository.save(attendance));
    }

    public List<AttendanceResponse> markBulk(List<AttendanceRequest> requests) {

        return requests.stream()
                .map(this::mark)
                .collect(Collectors.toList());
    }

    public List<AttendanceResponse> getByStudent(Long studentId) {

        return attendanceRepository
                .findByStudentId(studentId)
                .stream()
                .map(AttendanceResponse::from)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getSummary(Long studentId) {

        List<Attendance> records = attendanceRepository.findByStudentId(studentId);

        Map<String, Long> totalBySubject = new HashMap<>();
        Map<String, Long> presentBySubject = new HashMap<>();

        for (Attendance a : records) {

            String subject = a.getSubject();

            totalBySubject.merge(subject, 1L, (a1, b1) -> a1 + b1);

            if (a.getStatus() == Attendance.AttendanceStatus.PRESENT) {
                presentBySubject.merge(subject, 1L, (a1, b1) -> a1 + b1);
            }
        }

        Map<String, Double> percentageBySubject = new HashMap<>();
        Map<String, Map<String, Object>> countsBySubject = new HashMap<>();

        totalBySubject.forEach((subject, total) -> {

            long present = presentBySubject.getOrDefault(subject, 0L);

            percentageBySubject.put(
                    subject,
                    (double) present / total * 100
            );
            countsBySubject.put(subject, Map.of(
                    "attendedClasses", present,
                    "totalClasses", total,
                    "percentage", Math.round(((double) present / total * 100) * 10.0) / 10.0
            ));
        });

        long totalPresent = records.stream()
                .filter(a -> a.getStatus() == Attendance.AttendanceStatus.PRESENT)
                .count();

        double overallPercentage = records.isEmpty()
                ? 0
                : (double) totalPresent / records.size() * 100;

        return Map.of(
                "totalClasses", records.size(),
                "totalPresent", totalPresent,
                "overallPercentage", Math.round(overallPercentage * 10.0) / 10.0,
                "subjectWise", percentageBySubject,
                "subjectCounts", countsBySubject,
                "records", records.stream()
                        .map(AttendanceResponse::from)
                        .collect(Collectors.toList())
        );
    }

    public List<AttendanceResponse> getMyAttendance() {
        Student student = getCurrentStudent();
        return getByStudent(student.getId());
    }

    public Map<String, Object> getMySummary() {
        Student student = getCurrentStudent();
        return getSummary(student.getId());
    }

    private Student getCurrentStudent() {
        User user = getCurrentUser();
        if (user == null) throw new RuntimeException("Login required");
        return studentRepository.findByUserId(user.getId())
                .or(() -> studentRepository.findByRollNumber(user.getUsername()))
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    private void validateAttendanceDate(LocalDate attendanceDate) {
        if (attendanceDate == null) throw new RuntimeException("Attendance date is required");

        LocalDate today = LocalDate.now();
        User user = getCurrentUser();
        boolean admin = user != null && user.getRole() == User.Role.ADMIN;

        if (attendanceDate.isAfter(today)) {
            throw new RuntimeException("Future attendance is not allowed");
        }

        if (admin) {
            if (attendanceDate.isBefore(today.minusDays(1))) {
                throw new RuntimeException("Admin can add previous attendance only up to one day");
            }
            return;
        }

        if (!attendanceDate.isEqual(today)) {
            throw new RuntimeException("Faculty can mark attendance only for today");
        }
    }
}
