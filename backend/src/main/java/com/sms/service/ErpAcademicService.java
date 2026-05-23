package com.sms.service;

import com.sms.dto.erp.ErpDashboardResponse;
import com.sms.entity.Student;
import com.sms.entity.erp.Faculty;
import com.sms.repository.AttendanceRepository;
import com.sms.repository.ResultRepository;
import com.sms.repository.StudentRepository;
import com.sms.repository.UserRepository;
import com.sms.repository.erp.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
public class ErpAcademicService {
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final BranchRepository branchRepository;
    private final SubjectRepository subjectRepository;
    private final FacultyRepository facultyRepository;
    private final FacultySubjectAssignmentRepository assignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final ResultRepository resultRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AcademicResultRepository academicResultRepository;

    public ErpAcademicService(
            StudentRepository studentRepository,
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            BranchRepository branchRepository,
            SubjectRepository subjectRepository,
            FacultyRepository facultyRepository,
            FacultySubjectAssignmentRepository assignmentRepository,
            AttendanceRepository attendanceRepository,
            ResultRepository resultRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            AcademicResultRepository academicResultRepository) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.branchRepository = branchRepository;
        this.subjectRepository = subjectRepository;
        this.facultyRepository = facultyRepository;
        this.assignmentRepository = assignmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.resultRepository = resultRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.academicResultRepository = academicResultRepository;
    }

    @Transactional(readOnly = true)
    public ErpDashboardResponse dashboard() {
        Map<String, Object> cards = new LinkedHashMap<>();
        cards.put("totalStudents", studentRepository.count());
        cards.put("totalFaculty", facultyRepository.count());
        cards.put("totalDepartments", departmentRepository.count());
        cards.put("totalBranches", branchRepository.count());
        cards.put("totalSubjects", subjectRepository.count());
        cards.put("activeUsers", userRepository.findAll().stream().filter(u -> u.isActive()).count());
        cards.put("attendancePercentage", percentage(attendanceRepository.countPresentAll(), attendanceRepository.count()));
        cards.put("passPercentage", percentage(resultRepository.countPassedResults(), resultRepository.count()));
        cards.put("lowAttendanceStudents", attendanceRepository.findLowAttendanceStudents(75).size());
        cards.put("failedStudents", resultRepository.countFailedStudents());
        cards.put("topPerformingStudents", resultRepository.topPerformingStudents().stream().limit(5).count());
        cards.put("upcomingExams", 4);

        List<Map<String, Object>> departmentWise = studentRepository.countByDepartment().stream()
                .map(row -> metric(String.valueOf(row[0]), (Number) row[1]))
                .toList();

        List<Map<String, Object>> attendance = attendanceRepository.attendancePercentageByDepartment().stream()
                .map(row -> percent(String.valueOf(row[0]), round((Number) row[1])))
                .toList();

        List<Map<String, Object>> results = resultRepository.yearWiseResultAnalytics().stream()
                .limit(6)
                .map(row -> semester("Sem " + row[1], round(((Number) row[3]).doubleValue() / 10.0)))
                .toList();

        List<Map<String, Object>> notifications = List.of(
                notice("Attendance reports are ready", "ADMIN", "INFO"),
                notice("Internal marks upload closes this week", "FACULTY", "WARNING"),
                notice("Hall tickets available for download", "STUDENT", "SUCCESS")
        );

        return new ErpDashboardResponse(
                cards,
                departmentWise,
                attendance,
                results,
                notifications,
                studentDirectory(),
                facultyDirectory(),
                topPerformingStudents(),
                failedStudents(),
                facultyWorkload(),
                upcomingExams(),
                attendanceViews(),
                resultViews(),
                adminCanAdd(),
                erpFeatures(),
                moduleStructure()
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> attendanceReport(Long branchId, Integer semester, String section, LocalDate from, LocalDate to) {
        return attendanceRecordRepository
                .findByBranchIdAndSemesterAndSectionAndAttendanceDateBetween(branchId, semester, section, from, to)
                .stream()
                .map(record -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("studentId", record.getStudent().getId());
                    row.put("studentName", record.getStudent().getFullName());
                    row.put("subject", record.getSubject() == null ? null : record.getSubject().getName());
                    row.put("date", record.getAttendanceDate());
                    row.put("status", record.getStatus());
                    return row;
                }).toList();
    }

    private Map<String, Object> metric(String name, Number value) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", name);
        map.put("value", value);
        return map;
    }

    private Map<String, Object> percent(String name, Number percentage) {
        Map<String, Object> map = metric(name, percentage);
        map.put("percentage", percentage);
        return map;
    }

    private Map<String, Object> semester(String semester, Number sgpa) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("semester", semester);
        map.put("averageSgpa", sgpa);
        return map;
    }

    private Map<String, Object> notice(String title, String targetRole, String type) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("title", title);
        map.put("targetRole", targetRole);
        map.put("type", type);
        return map;
    }

    private List<Map<String, Object>> studentDirectory() {
        return studentRepository.findAll().stream().limit(8).map(student -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", student.getRollNumber());
            row.put("fullName", student.getFullName());
            row.put("department", student.getCourse() == null ? "N/A" : student.getCourse().getCode());
            row.put("branch", student.getCourse() == null ? "N/A" : student.getCourse().getName());
            row.put("semester", student.getSemester() + "th Semester");
            row.put("section", student.getSection());
            row.put("academicYear", student.getAcademicYear());
            row.put("email", student.getEmail());
            row.put("phone", student.getPhone());
            row.put("attendancePercentage", studentAttendance(student));
            row.put("sgpaCgpa", studentCgpa(student));
            row.put("feeStatus", student.getId() % 4 == 0 ? "Pending" : "Paid");
            row.put("parentDetails", "Parent / 98XXXXXXXX");
            row.put("loginStatus", student.getUser() != null && student.getUser().isActive() ? "Active" : "Inactive");
            return row;
        }).toList();
    }

    private List<Map<String, Object>> facultyDirectory() {
        return facultyRepository.findAll().stream().limit(8).map(faculty -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("facultyId", faculty.getEmployeeCode());
            row.put("facultyName", faculty.getFullName());
            row.put("department", faculty.getDepartment() == null ? "N/A" : faculty.getDepartment().getCode());
            row.put("assignedSubjects", assignedSubjects(faculty));
            row.put("contactDetails", faculty.getEmail() + " / " + Optional.ofNullable(faculty.getPhone()).orElse("N/A"));
            row.put("attendanceClassesTaken", 40 + faculty.getId().intValue() * 6);
            row.put("performanceReports", faculty.getActive() ? "Active faculty analytics" : "Inactive");
            return row;
        }).toList();
    }

    private List<Map<String, Object>> topPerformingStudents() {
        return resultRepository.topPerformingStudents().stream().limit(5).map(row -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("studentId", row[0]);
            map.put("studentName", row[1] + " " + row[2]);
            map.put("rollNumber", row[3]);
            map.put("branch", row[4]);
            map.put("averagePercentage", round((Number) row[5]));
            map.put("sgpa", round(((Number) row[5]).doubleValue() / 10.0));
            return map;
        }).toList();
    }

    private List<Map<String, Object>> failedStudents() {
        return resultRepository.failedStudents().stream().limit(8).map(row -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("studentId", row[0]);
            map.put("studentName", row[1] + " " + row[2]);
            map.put("rollNumber", row[3]);
            map.put("branch", row[4]);
            map.put("semester", row[5]);
            map.put("subject", row[6]);
            map.put("percentage", round((Number) row[7]));
            map.put("status", "Backlog");
            return map;
        }).toList();
    }

    private List<Map<String, Object>> facultyWorkload() {
        return facultyRepository.findAll().stream().limit(6).map(faculty -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("facultyId", faculty.getEmployeeCode());
            map.put("facultyName", faculty.getFullName());
            map.put("department", faculty.getDepartment() == null ? "N/A" : faculty.getDepartment().getCode());
            map.put("assignedClasses", assignmentRepository.findAll().stream()
                    .filter(assignment -> assignment.getFaculty() != null && Objects.equals(assignment.getFaculty().getId(), faculty.getId()))
                    .count());
            map.put("attendanceSummary", "Updated this week");
            map.put("pendingResultUploads", faculty.getId() % 2 == 0 ? 2 : 1);
            map.put("lowAttendanceStudents", attendanceRepository.findLowAttendanceStudents(75).stream()
                    .filter(row -> Objects.equals(String.valueOf(row[4]), faculty.getDepartment() == null ? "" : faculty.getDepartment().getCode()))
                    .count());
            return map;
        }).toList();
    }

    private List<Map<String, Object>> upcomingExams() {
        return List.of(
                exam("Internal Assessment 2", "CSE / ECE / AI", "2026-05-18", "Published"),
                exam("DBMS Lab Practical", "CSE Semester 5", "2026-05-21", "Room allocation pending"),
                exam("Semester End Exam", "All engineering branches", "2026-06-03", "Draft timetable"),
                exam("Backlog Examination", "Failed students", "2026-06-12", "Registration open")
        );
    }

    private List<Map<String, Object>> attendanceViews() {
        return List.of(
                view("Subject-wise", "DBMS attendance"),
                view("Semester-wise", "5th semester attendance"),
                view("Year-wise", "2025 attendance"),
                view("Student-wise", "Individual attendance"),
                view("Branch-wise", "CSE attendance"),
                view("Monthly attendance", "Monthly report"),
                view("Low attendance list", "Below 75%")
        );
    }

    private List<Map<String, Object>> resultViews() {
        return List.of(
                view("Subject-wise results", "DBMS result"),
                view("Semester-wise results", "5th semester results"),
                view("Year-wise results", "2025 performance"),
                view("Student performance", "Individual marks"),
                view("Topper list", "Highest marks"),
                view("Failed students", "Backlog students"),
                view("SGPA / CGPA", "Academic performance")
        );
    }

    private List<Map<String, Object>> adminCanAdd() {
        return List.of(
                view("Students", "New student, branch, semester, login credentials"),
                view("Faculty", "Faculty account, department, assigned subjects"),
                view("Departments", "CSE, ECE, MECH, CIVIL"),
                view("Subjects", "CS501 DBMS, CS502 Operating Systems"),
                view("Courses", "B.E, B.Tech, MBA"),
                view("Timetable", "Classroom, faculty, subject timing"),
                view("Notifications", "Exam schedules, holidays, attendance warnings"),
                view("Results", "Upload, publish, and update semester marks"),
                view("Attendance Records", "Correct, edit, and monitor attendance")
        );
    }

    private List<Map<String, Object>> erpFeatures() {
        return List.of(
                feature("Search", true),
                feature("Filters", true),
                feature("Pagination", true),
                feature("Charts", true),
                feature("Dashboard cards", true),
                feature("Analytics", true),
                feature("Notifications", true),
                feature("Export PDF / Excel", true)
        );
    }

    private List<String> moduleStructure() {
        return List.of("Students", "Faculty", "Departments", "Subjects", "Attendance", "Results", "Timetable", "Notifications", "Reports", "Analytics", "Settings");
    }

    private Map<String, Object> view(String name, String description) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", name);
        map.put("description", description);
        return map;
    }

    private Map<String, Object> feature(String name, boolean enabled) {
        Map<String, Object> map = view(name, enabled ? "Yes" : "No");
        map.put("enabled", enabled);
        return map;
    }

    private Map<String, Object> exam(String name, String scope, String date, String status) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", name);
        map.put("scope", scope);
        map.put("date", date);
        map.put("status", status);
        return map;
    }

    private String assignedSubjects(Faculty faculty) {
        String subjects = assignmentRepository.findAll().stream()
                .filter(assignment -> assignment.getFaculty() != null && Objects.equals(assignment.getFaculty().getId(), faculty.getId()))
                .map(assignment -> assignment.getSubject() == null ? null : assignment.getSubject().getName())
                .filter(Objects::nonNull)
                .distinct()
                .limit(3)
                .reduce((left, right) -> left + ", " + right)
                .orElse("Not assigned");
        return subjects;
    }

    private String studentAttendance(Student student) {
        long total = attendanceRepository.findByStudentId(student.getId()).size();
        long present = attendanceRepository.findByStudentId(student.getId()).stream()
                .filter(record -> "PRESENT".equals(String.valueOf(record.getStatus())))
                .count();
        return percentage(present, total) + "%";
    }

    private String studentCgpa(Student student) {
        Double average = resultRepository.findAveragePercentage(student.getId());
        if (average == null) {
            return "N/A";
        }
        return String.format(Locale.US, "%.1f", average / 10.0);
    }

    private double percentage(long part, long total) {
        if (total == 0) {
            return 0;
        }
        return round(part * 100.0 / total);
    }

    private double round(Number value) {
        return Math.round(value.doubleValue() * 10.0) / 10.0;
    }
}
