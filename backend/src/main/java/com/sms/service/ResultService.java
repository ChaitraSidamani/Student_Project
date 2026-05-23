package com.sms.service;

import com.sms.dto.*;
import com.sms.entity.*;
import com.sms.entity.erp.Faculty;
import com.sms.entity.erp.FacultySubjectAssignment;
import com.sms.repository.*;
import com.sms.repository.erp.FacultyRepository;
import com.sms.repository.erp.FacultySubjectAssignmentRepository;
import com.sms.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ResultService {

    @Autowired private ResultRepository resultRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private FacultyRepository facultyRepository;
    @Autowired private FacultySubjectAssignmentRepository assignmentRepository;
    @Autowired private StudentSubjectRegistrationRepository registrationRepository;
    @Autowired private NotificationService notificationService;

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl ud) {
            return userRepository.findById(ud.getId()).orElse(null);
        }
        return null;
    }

    private String computeGrade(double percentage) {
        if (percentage >= 90) return "O";
        if (percentage >= 80) return "A+";
        if (percentage >= 70) return "A";
        if (percentage >= 60) return "B+";
        if (percentage >= 50) return "B";
        if (percentage >= 40) return "C";
        return "F";
    }

    public ResultResponse add(ResultRequest req) {
        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY && req.getExamType() != Result.ExamType.INTERNAL) {
            throw new RuntimeException("Faculty can add internal marks only");
        }
        validateMarks(req);

        Student student = studentRepository.findById(req.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found"));

        double pct = (req.getMarksObtained() / req.getMaxMarks()) * 100;

        String subject = req.getSubject().trim();
        validateRegisteredInternalSubject(student, subject, req.getExamType());
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY
                && !canFacultyAccessSubject(currentUser, student, subject, req.getSemester())) {
            throw new RuntimeException("Faculty is not assigned to this subject");
        }
        validateFinalSubjectEligibility(student, subject, req.getExamType(), req.getSemester());

        Result result = findExistingResult(req.getStudentId(), subject, req.getExamType(), req.getSemester())
                .orElseGet(Result::new);

        result.setStudent(student);
        result.setSubject(subject);
        result.setSemester(req.getSemester());
        result.setExamType(req.getExamType());
        result.setMarksObtained(req.getMarksObtained());
        result.setMaxMarks(req.getMaxMarks());
        result.setGrade(computeGrade(pct));
        result.setEnteredBy(currentUser);
        result.setRemarks(req.getRemarks());
        // Preserve existing publish state if updating
        if (result.getId() == null) {
            result.setPublished(false);
            result.setExportedToAdmin(false);
        }

        return ResultResponse.from(resultRepository.save(result));
    }

    public List<ResultResponse> getByStudent(Long studentId) {
        List<Result> results = resultRepository.findByStudentId(studentId);
        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY) {
            results = results.stream()
                    .filter(result -> canFacultyAccessSubject(currentUser, result.getStudent(), result.getSubject(), result.getSemester()))
                    .toList();
        }
        return results.stream().map(ResultResponse::from).collect(Collectors.toList());
    }

    public List<ResultResponse> getBySemester(Long studentId, Integer semester) {
        return resultRepository.findByStudentIdAndSemester(studentId, semester)
                .stream().map(ResultResponse::from).collect(Collectors.toList());
    }

    public ResultResponse update(Long id, ResultRequest req) {
        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY && req.getExamType() != Result.ExamType.INTERNAL) {
            throw new RuntimeException("Faculty can update internal marks only");
        }
        validateMarks(req);

        Result result = resultRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Result not found: " + id));
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY) {
            if (req.getStudentId() != null && !Objects.equals(result.getStudent().getId(), req.getStudentId())) {
                throw new RuntimeException("Result does not belong to this student");
            }
            if (!canFacultyAccessSubject(currentUser, result.getStudent(), req.getSubject(), req.getSemester())) {
                throw new RuntimeException("Faculty is not assigned to this subject");
            }
        }
        validateRegisteredInternalSubject(result.getStudent(), req.getSubject(), req.getExamType());
        validateFinalSubjectEligibility(result.getStudent(), req.getSubject(), req.getExamType(), req.getSemester());

        result.setMarksObtained(req.getMarksObtained());
        result.setMaxMarks(req.getMaxMarks());
        result.setRemarks(req.getRemarks());

        double pct = (req.getMarksObtained() / req.getMaxMarks()) * 100;
        result.setGrade(computeGrade(pct));

        return ResultResponse.from(resultRepository.save(result));
    }

    public Map<String, Object> getReport(Long studentId) {
        List<Result> results = resultRepository.findByStudentId(studentId);
        Map<String, Object> report = new HashMap<>();

        if (results.isEmpty()) {
            report.put("message", "No results found");
            return report;
        }

        List<Result> academicRows = results.stream()
                .filter(r -> !"Overall Result".equalsIgnoreCase(r.getSubject()))
                .toList();
        if (academicRows.isEmpty()) academicRows = results;

        double avg = academicRows.stream()
                .mapToDouble(r -> (r.getMarksObtained() / r.getMaxMarks()) * 100)
                .average().orElse(0);
        double marksObtained = academicRows.stream().mapToDouble(Result::getMarksObtained).sum();
        double maxMarks = academicRows.stream().mapToDouble(Result::getMaxMarks).sum();
        double sgpa = academicRows.stream()
                .mapToDouble(r -> gradePoint((r.getMarksObtained() / r.getMaxMarks()) * 100))
                .average().orElse(0);
        Map<Integer, Double> semesterSgpa = academicRows.stream()
                .collect(Collectors.groupingBy(Result::getSemester,
                        Collectors.averagingDouble(r -> gradePoint((r.getMarksObtained() / r.getMaxMarks()) * 100))));
        double cgpa = semesterSgpa.values().stream().mapToDouble(Double::doubleValue).average().orElse(0);

        Map<String, List<ResultResponse>> bySemester = new HashMap<>();
        for (Result r : results) {
            bySemester.computeIfAbsent("Semester " + r.getSemester(), k -> new ArrayList<>())
                    .add(ResultResponse.from(r));
        }

        report.put("totalExams", results.size());
        report.put("averagePercentage", Math.round(avg * 10.0) / 10.0);
        report.put("totalMarksObtained", Math.round(marksObtained * 10.0) / 10.0);
        report.put("totalMaxMarks", Math.round(maxMarks * 10.0) / 10.0);
        report.put("sgpa", Math.round(sgpa * 100.0) / 100.0);
        report.put("cgpa", Math.round(cgpa * 100.0) / 100.0);
        report.put("overallGrade", computeGrade(avg));
        report.put("semesterWise", bySemester);
        report.put("results", results.stream().map(ResultResponse::from).collect(Collectors.toList()));
        return report;
    }

    /**
     * Publishes (shares) a result to the student dashboard.
     * Uses proper boolean columns instead of JSON string manipulation.
     */
    public Map<String, Object> shareResult(Long studentId, String subject, Integer semester) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        List<Result> rows = resultRepository.findByStudentId(studentId).stream()
                .filter(r -> subject == null || subject.isBlank() || r.getSubject().equalsIgnoreCase(subject.trim()))
                .filter(r -> semester == null || r.getSemester().equals(semester))
                .toList();

        if (rows.isEmpty()) {
            throw new RuntimeException("No saved result found to share");
        }

        // Mark as published/exported using proper boolean columns
        rows.forEach(r -> {
            r.setPublished(true);
            r.setExportedToAdmin(true);
            resultRepository.save(r);
        });

        String subjectText = (subject == null || subject.isBlank()) ? "results" : subject.trim() + " result";
        String title = "Result Published";
        String message = student.getFullName() + "'s " + subjectText + " has been published for Semester " + rows.get(0).getSemester() + ".";

        int notifications = 0;
        if (student.getUser() != null) {
            notificationService.createNotification(
                    student.getUser(), title,
                    "Your " + subjectText + " has been published. Please check your results page.",
                    Notification.NotificationType.RESULT,
                    student.getId(),
                    Notification.RelatedEntityType.RESULT);
            notifications++;
        }

        for (User admin : userRepository.findByRole(User.Role.ADMIN)) {
            notificationService.createNotification(admin, title, message,
                    Notification.NotificationType.RESULT,
                    student.getId(),
                    Notification.RelatedEntityType.RESULT);
            notifications++;
        }

        return Map.of("shared", true, "notifications", notifications);
    }

    public Student getStudentByRollNumber(String rollNumber) {
        return studentRepository.findByRollNumber(rollNumber)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    public List<ResultResponse> getMyResults() {
        Student student = getCurrentStudent()
                .orElseThrow(() -> new RuntimeException("Student not found"));
        // Students only see published results
        return resultRepository.findByStudentId(student.getId()).stream()
                .filter(r -> Boolean.TRUE.equals(r.getPublished()))
                .map(ResultResponse::from)
                .collect(Collectors.toList());
    }

    // ─── private helpers ─────────────────────────────────────────────────────

    private Optional<Student> getCurrentStudent() {
        User user = getCurrentUser();
        if (user == null) return Optional.empty();
        return studentRepository.findByUserId(user.getId())
                .or(() -> studentRepository.findByRollNumber(user.getUsername()));
    }

    private boolean canFacultyAccessSubject(User user, Student student, String subject, Integer semester) {
        if (user == null || student == null || subject == null || subject.isBlank()) return false;
        Optional<Faculty> faculty = facultyRepository.findByUserId(user.getId())
                .or(() -> facultyRepository.findByUserUsername(user.getUsername()))
                .or(() -> facultyRepository.findByEmployeeCode(user.getUsername()));
        if (faculty.isEmpty()) return false;
        return assignmentRepository.findByFacultyIdAndActiveTrue(faculty.get().getId()).stream()
                .anyMatch(a -> studentMatchesAssignment(student, a, semester) && subjectMatchesAssignment(subject, a));
    }

    private Optional<Result> findExistingResult(Long studentId, String subject, Result.ExamType examType, Integer semester) {
        Optional<Result> exact = resultRepository.findExistingResult(studentId, subject, examType, semester);
        if (exact.isPresent()) return exact;
        return resultRepository.findByStudentIdAndExamTypeAndSemester(studentId, examType, semester).stream()
                .filter(r -> subjectsAreCompatible(r.getSubject(), subject))
                .findFirst();
    }

    private void validateMarks(ResultRequest req) {
        if (req.getMarksObtained() == null || req.getMaxMarks() == null)
            throw new RuntimeException("Marks and maximum marks are required");
        if (req.getMaxMarks() <= 0)
            throw new RuntimeException("Maximum marks must be greater than zero");
        if (req.getMarksObtained() < 0)
            throw new RuntimeException("Marks cannot be negative");
        if (req.getMarksObtained() > req.getMaxMarks())
            throw new RuntimeException("Marks cannot exceed maximum marks");
    }

    private void validateRegisteredInternalSubject(Student student, String subject, Result.ExamType examType) {
        if (examType != Result.ExamType.INTERNAL) return;
        if (student == null || isBlank(subject))
            throw new RuntimeException("Student and subject are required for internal marks");
        // Check new join-table registrations
        List<StudentSubjectRegistration> regs = registrationRepository.findByStudentId(student.getId());
        if (regs.isEmpty()) {
            // Fall back to legacy field during migration
            List<String> legacy = parseLegacyRegisteredSubjects(student.getRegisteredSubjects());
            if (legacy.isEmpty())
                throw new RuntimeException("Cannot enter internal marks because the student has not registered any subjects");
            boolean registered = legacy.stream().anyMatch(s -> subjectsAreCompatible(s, subject));
            if (!registered)
                throw new RuntimeException("Cannot enter internal marks because the student has not registered this subject");
            return;
        }
        boolean registered = regs.stream()
                .anyMatch(r -> subjectsAreCompatible(
                        r.getSubject().getCode() + " - " + r.getSubject().getName(), subject)
                        || subjectsAreCompatible(r.getSubject().getName(), subject));
        if (!registered)
            throw new RuntimeException("Cannot enter internal marks because the student has not registered this subject");
    }

    private void validateFinalSubjectEligibility(Student student, String subject, Result.ExamType examType, Integer semester) {
        if (examType == Result.ExamType.INTERNAL) return;
        if (student == null || isBlank(subject))
            throw new RuntimeException("Student and subject are required for final marks");
        boolean hasInternalMarks = resultRepository
                .findByStudentIdAndExamTypeAndSemester(student.getId(), Result.ExamType.INTERNAL, semester)
                .stream().anyMatch(r -> subjectsAreCompatible(r.getSubject(), subject));
        if (!hasInternalMarks)
            throw new RuntimeException("Subject not eligible: faculty has not entered internal marks for this subject");
    }

    private List<String> parseLegacyRegisteredSubjects(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split("\\|\\|"))
                .map(String::trim).filter(s -> !s.isBlank()).distinct().toList();
    }

    private boolean studentMatchesAssignment(Student student, FacultySubjectAssignment assignment, Integer semester) {
        boolean matchesSemester = assignment.getSemester() == null
                || Objects.equals(assignment.getSemester(), semester)
                || Objects.equals(assignment.getSemester(), student.getSemester());
        if (!matchesSemester) return false;
        if (student.getCourse() == null || assignment.getBranch() == null) return true;
        return branchMatchesStudentCourse(assignment.getBranch().getCode(), assignment.getBranch().getName(), student);
    }

    private boolean subjectMatchesAssignment(String value, FacultySubjectAssignment assignment) {
        if (assignment.getSubject() == null) return false;
        String sv = assignment.getSubject().getCode() + " - " + assignment.getSubject().getName();
        if (subjectsAreCompatible(value, sv)) return true;
        String norm = normalizedSubject(value);
        return norm.equals(normalizedSubject(assignment.getSubject().getCode()))
                || norm.equals(normalizedSubject(assignment.getSubject().getName()));
    }

    private boolean branchMatchesStudentCourse(String branchCode, String branchName, Student student) {
        if (student == null || student.getCourse() == null) return true;
        return normalizedBranchCode(branchCode).equals(normalizedBranchCode(student.getCourse().getCode()))
                || normalizedName(branchName).equals(normalizedName(student.getCourse().getName()));
    }

    private boolean subjectsAreCompatible(String left, String right) {
        String l = normalizedSubject(left);
        String r = normalizedSubject(right);
        if (l.isBlank() || r.isBlank()) return false;
        if (l.equals(r)) return true;
        String ln = normalizedSubject(subjectNamePart(left));
        String rn = normalizedSubject(subjectNamePart(right));
        return !ln.isBlank() && ln.equals(rn) && (hasCodePart(left) || hasCodePart(right));
    }

    private String subjectNamePart(String v) {
        if (v == null) return "";
        int i = v.indexOf(" - ");
        return i >= 0 ? v.substring(i + 3) : v;
    }

    private boolean hasCodePart(String v) { return v != null && v.contains(" - "); }

    private String normalizedSubject(String v) {
        return v == null ? "" : v.trim().toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
    }

    private String normalizedName(String v) { return normalizedSubject(v); }

    private String normalizedBranchCode(String v) {
        String c = v == null ? "" : v.trim().toUpperCase();
        if (c.startsWith("BTECH-")) return c.replace("BTECH-", "");
        if (c.matches("^CS\\d*$")) return "CSE";
        if (c.matches("^EC\\d*$")) return "ECE";
        if (c.matches("^MC\\d*$")) return "MCA";
        if (c.matches("^MB\\d*$")) return "MBA";
        if (c.contains("CSE")) return "CSE";
        if (c.contains("ECE")) return "ECE";
        if (c.contains("AIDS")) return "AIDS";
        if (c.contains("AI")) return "AI";
        if (c.contains("ME")) return "ME";
        if (c.contains("MCA")) return "MCA";
        if (c.contains("MBA")) return "MBA";
        return c;
    }

    private boolean isBlank(String v) { return v == null || v.trim().isEmpty(); }

    private double gradePoint(double pct) {
        if (pct >= 90) return 10;
        if (pct >= 80) return 9;
        if (pct >= 70) return 8;
        if (pct >= 60) return 7;
        if (pct >= 50) return 6;
        if (pct >= 40) return 5;
        return 0;
    }
}
