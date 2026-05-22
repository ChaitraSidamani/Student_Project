package com.sms.service;

import com.sms.dto.*;
import com.sms.entity.*;
import com.sms.entity.erp.Subject;
import com.sms.repository.*;
import com.sms.repository.erp.AcademicResultRepository;
import com.sms.repository.erp.AttendanceRecordRepository;
import com.sms.repository.erp.FeeLedgerRepository;
import com.sms.repository.erp.SubjectRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class StudentService {

    @Autowired private StudentRepository studentRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private ResultRepository resultRepository;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private AcademicResultRepository academicResultRepository;
    @Autowired private FeeLedgerRepository feeLedgerRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private NotificationService notificationService;

    public List<StudentResponse> getAll() {
        return studentRepository.findAll().stream()
                .map(StudentResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentResponse> searchStudents(String search, Long branchId, Long subjectId, Integer semester,
                                                        String section, String academicYear, LocalDate fromDate, LocalDate toDate,
                                                        Student.Status status,
                                                        int page, int size, String sortBy, String sortDir) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 5), 100);
        String safeSort = switch (sortBy == null ? "" : sortBy) {
            case "rollNumber", "firstName", "lastName", "email", "semester", "section", "academicYear", "status", "createdAt" -> sortBy;
            case "courseCode", "courseName" -> "rollNumber";
            default -> "rollNumber";
        };
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, safeSort));
        Subject selectedSubject = subjectId == null ? null : subjectRepository.findById(subjectId).orElse(null);

        Specification<Student> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(search)) {
                String q = "%" + search.toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("firstName")), q),
                        cb.like(cb.lower(root.<String>get("lastName")), q),
                        cb.like(cb.lower(root.<String>get("rollNumber")), q),
                        cb.like(cb.lower(cb.concat(cb.concat(root.<String>get("firstName"), " "), root.<String>get("lastName"))), q)
                ));
            }
            if (branchId != null) predicates.add(cb.equal(root.get("course").get("id"), branchId));
            if (semester != null) predicates.add(cb.equal(root.get("semester"), semester));
            if (StringUtils.hasText(section)) predicates.add(cb.equal(cb.lower(root.<String>get("section")), section.toLowerCase()));
            if (StringUtils.hasText(academicYear)) predicates.add(cb.equal(root.get("academicYear"), academicYear));
            if (fromDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate.atStartOfDay()));
            if (toDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDate.atTime(LocalTime.MAX)));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (selectedSubject != null) {
                String subjectName = selectedSubject.getName().toLowerCase();
                List<Predicate> subjectPredicates = new ArrayList<>();

                Subquery<Long> attendanceSubquery = query.subquery(Long.class);
                Root<Attendance> attendanceRoot = attendanceSubquery.from(Attendance.class);
                attendanceSubquery.select(attendanceRoot.get("id")).where(
                        cb.equal(attendanceRoot.get("student"), root),
                        cb.equal(cb.lower(attendanceRoot.<String>get("subject")), subjectName)
                );
                subjectPredicates.add(cb.exists(attendanceSubquery));

                Subquery<Long> resultSubquery = query.subquery(Long.class);
                Root<Result> resultRoot = resultSubquery.from(Result.class);
                resultSubquery.select(resultRoot.get("id")).where(
                        cb.equal(resultRoot.get("student"), root),
                        cb.equal(cb.lower(resultRoot.<String>get("subject")), subjectName)
                );
                subjectPredicates.add(cb.exists(resultSubquery));

                if (selectedSubject.getBranch() != null && StringUtils.hasText(selectedSubject.getBranch().getCode()) && selectedSubject.getSemester() != null) {
                    subjectPredicates.add(cb.and(
                            cb.like(cb.lower(root.get("course").<String>get("code")), "%" + selectedSubject.getBranch().getCode().toLowerCase() + "%"),
                            cb.equal(root.get("semester"), selectedSubject.getSemester().getNumber())
                    ));
                }

                predicates.add(cb.or(subjectPredicates.toArray(new Predicate[0])));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<StudentResponse> result = studentRepository.findAll(spec, pageable).map(StudentResponse::from);
        return new PageResponse<>(result);
    }

    @Transactional(readOnly = true)
    public StudentFilterOptionsResponse getFilterOptions() {
        return new StudentFilterOptionsResponse(
                studentRepository.findDistinctSections(),
                studentRepository.findDistinctAcademicYears(),
                subjectRepository.findAll().stream()
                        .map(subject -> new StudentFilterOptionsResponse.SubjectOption(
                                subject.getId(),
                                subject.getCode(),
                                subject.getName(),
                                subject.getBranch() == null ? null : subject.getBranch().getCode(),
                                subject.getSemester() == null ? null : subject.getSemester().getNumber()
                        ))
                        .collect(Collectors.toList())
        );
    }

    @Transactional(readOnly = true)
    public StudentAnalyticsResponse getAnalytics() {
        StudentAnalyticsResponse response = new StudentAnalyticsResponse();
        long totalStudents = studentRepository.count();
        long totalAttendance = attendanceRepository.count();
        long presentAttendance = attendanceRepository.countPresentAll();
        long totalResults = resultRepository.count();
        long passedResults = resultRepository.countPassedResults();

        response.setTotalStudents(totalStudents);
        response.setActiveStudents(studentRepository.countActiveStudents());
        response.setAverageAttendance(totalAttendance == 0 ? 0 : round((presentAttendance * 100.0) / totalAttendance));
        response.setPassPercentage(totalResults == 0 ? 0 : round((passedResults * 100.0) / totalResults));
        response.setDepartmentCounts(toMetricRows(studentRepository.countByDepartment()));
        response.setAttendanceByDepartment(toMetricRows(attendanceRepository.attendancePercentageByDepartment()));
        response.setPassPercentageByDepartment(toMetricRows(resultRepository.passPercentageByDepartment()));

        List<Object[]> lowAttendanceRows = attendanceRepository.findLowAttendanceStudents(75);
        List<StudentAnalyticsResponse.LowAttendanceAlert> alerts = lowAttendanceRows
                .stream()
                .limit(8)
                .map(row -> new StudentAnalyticsResponse.LowAttendanceAlert(
                        ((Number) row[0]).longValue(),
                        row[1] + " " + row[2],
                        (String) row[3],
                        (String) row[4],
                        round(((Number) row[5]).doubleValue())
                ))
                .collect(Collectors.toList());
        response.setLowAttendanceAlerts(alerts);
        response.setLowAttendanceCount(lowAttendanceRows.size());
        return response;
    }

    public StudentResponse getById(@NonNull Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found: " + id));
        return StudentResponse.from(student);
    }

    public StudentResponse create(StudentRequest req) {
        String rollNumber = clean(req.getRollNumber());
        if (!StringUtils.hasText(rollNumber)) {
            rollNumber = generateRollNumber(req.getCourseId(), req.getAcademicYear());
        }
        String loginUsername = StringUtils.hasText(req.getLoginUsername()) ? req.getLoginUsername().trim() : rollNumber;
        String loginPassword = StringUtils.hasText(req.getLoginPassword()) ? req.getLoginPassword().trim() : "student123";

        if (studentRepository.existsByRollNumber(rollNumber))
            throw new RuntimeException("Roll number already exists: " + rollNumber);
        if (studentRepository.existsByEmail(req.getEmail()))
            throw new RuntimeException("Email already exists: " + req.getEmail());
        if (userRepository.existsByUsername(loginUsername))
            throw new RuntimeException("Login username already exists: " + loginUsername);

        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new RuntimeException("Course not found: " + req.getCourseId()));

        Student student = new Student();
        student.setRollNumber(rollNumber);
        student.setFirstName(req.getFirstName());
        student.setLastName(req.getLastName());
        student.setEmail(req.getEmail());
        student.setPhone(req.getPhone());
        student.setAddress(req.getAddress());
        student.setDateOfBirth(req.getDateOfBirth());
        student.setGender(req.getGender());
        student.setCourse(course);
        student.setSemester(req.getSemester());
        student.setSection(clean(req.getSection()));
        student.setAcademicYear(StringUtils.hasText(req.getAcademicYear()) ? req.getAcademicYear().trim() : "2025-26");
        student.setPhotoUrl(clean(req.getPhotoUrl()));
        student.setSubjectRegistrationAllowed(Boolean.TRUE.equals(req.getSubjectRegistrationAllowed()));
        student.setStatus(req.getStatus() != null ? req.getStatus() : Student.Status.ACTIVE);
        Student savedStudent = studentRepository.save(student);

        // Create user account for student
        User user = new User();
        user.setUsername(loginUsername);
        user.setPassword(passwordEncoder.encode(loginPassword));
        user.setFullName(req.getFirstName() + " " + req.getLastName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setRole(User.Role.STUDENT);
        user.setActive(true);
        user.setMustChangePassword(true);
        User savedUser = userRepository.save(user);
        savedStudent.setUser(savedUser);
        studentRepository.save(savedStudent);

        return StudentResponse.from(savedStudent);
    }

    public StudentResponse update(Long id, StudentRequest req) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found: " + id));

        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new RuntimeException("Course not found: " + req.getCourseId()));

        student.setFirstName(req.getFirstName());
        student.setLastName(req.getLastName());
        student.setEmail(req.getEmail());
        student.setPhone(req.getPhone());
        student.setAddress(req.getAddress());
        student.setDateOfBirth(req.getDateOfBirth());
        student.setGender(req.getGender());
        student.setCourse(course);
        student.setSemester(req.getSemester());
        student.setSection(clean(req.getSection()));
        student.setAcademicYear(clean(req.getAcademicYear()));
        student.setPhotoUrl(clean(req.getPhotoUrl()));
        student.setSubjectRegistrationAllowed(Boolean.TRUE.equals(req.getSubjectRegistrationAllowed()));
        if (req.getStatus() != null) student.setStatus(req.getStatus());
        if (student.getUser() != null) {
            User user = student.getUser();
            user.setFullName(req.getFirstName() + " " + req.getLastName());
            user.setEmail(req.getEmail());
            user.setPhone(req.getPhone());
            if (StringUtils.hasText(req.getLoginPassword())) {
                user.setPassword(passwordEncoder.encode(req.getLoginPassword().trim()));
                user.setMustChangePassword(true);
            }
            userRepository.save(user);
        }
        Student savedStudent = studentRepository.save(student);
        if (savedStudent.getUser() != null) {
            notificationService.createNotification(
                    savedStudent.getUser(),
                    "Student details updated",
                    "Your student details were updated by admin or faculty. Please check your profile.",
                    Notification.NotificationType.SYSTEM_MESSAGE,
                    savedStudent.getId(),
                    Notification.RelatedEntityType.STUDENT
            );
        }
        return StudentResponse.from(savedStudent);
    }

    public void delete(@NonNull Long id) {
        if (!studentRepository.existsById(id))
            throw new RuntimeException("Student not found: " + id);
        feeLedgerRepository.deleteByStudentId(id);
        attendanceRecordRepository.deleteByStudentId(id);
        academicResultRepository.deleteByStudentId(id);
        attendanceRepository.deleteByStudentId(id);
        resultRepository.deleteByStudentId(id);
        studentRepository.deleteById(id);
    }

    public StudentResponse getProfile() {
        Student student = getCurrentStudent()
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return StudentResponse.from(student);
    }

    public StudentResponse updateMySection(String section) {
        Student student = getCurrentStudent()
                .orElseThrow(() -> new RuntimeException("Student not found"));
        if (!StringUtils.hasText(section)) {
            throw new RuntimeException("Section is required");
        }
        student.setSection(clean(section));
        return StudentResponse.from(studentRepository.save(student));
    }

    public StudentResponse registerSubjects(List<String> subjects) {
        Student student = getCurrentStudent()
                .orElseThrow(() -> new RuntimeException("Student not found"));
        if (!student.isSubjectRegistrationAllowed()) {
            throw new RuntimeException("Subject registration is not open yet");
        }
        String registered = subjects == null ? "" : subjects.stream()
                .map(this::clean)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.joining("||"));
        student.setRegisteredSubjects(registered);
        return StudentResponse.from(studentRepository.save(student));
    }

    private java.util.Optional<Student> getCurrentStudent() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return java.util.Optional.empty();
        String username = auth.getName();
        return userRepository.findByUsername(username)
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .or(() -> studentRepository.findByRollNumber(username));
    }

    private List<StudentAnalyticsResponse.MetricRow> toMetricRows(List<Object[]> rows) {
        return rows.stream()
                .map(row -> new StudentAnalyticsResponse.MetricRow(String.valueOf(row[0]), round(((Number) row[1]).doubleValue())))
                .collect(Collectors.toList());
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String clean(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String generateRollNumber(Long courseId, String academicYear) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseId));
        String prefix = course.getCode() == null ? "BTECH" : course.getCode().replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        String year = StringUtils.hasText(academicYear) && academicYear.length() >= 4 ? academicYear.substring(2, 4) : "25";
        long count = studentRepository.findAll().stream()
                .filter(student -> student.getCourse() != null && student.getCourse().getId().equals(courseId))
                .filter(student -> !StringUtils.hasText(academicYear) || academicYear.equals(student.getAcademicYear()))
                .count() + 1;
        String rollNumber;
        do {
            rollNumber = prefix + year + String.format("%03d", count++);
        } while (studentRepository.existsByRollNumber(rollNumber));
        return rollNumber;
    }
}
