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

    @Autowired
    private ResultRepository resultRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FacultyRepository facultyRepository;

    @Autowired
    private FacultySubjectAssignmentRepository assignmentRepository;

    @Autowired
    private NotificationService notificationService;

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

        Student student = studentRepository
                .findById(req.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found"));

        double pct = (req.getMarksObtained() / req.getMaxMarks()) * 100;

        String subject = req.getSubject().trim();
        validateRegisteredInternalSubject(student, subject, req.getExamType());
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY && !canFacultyAccessSubject(currentUser, student, subject, req.getSemester())) {
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

        return resultRepository
                .findByStudentIdAndSemester(studentId, semester)
                .stream()
                .map(ResultResponse::from)
                .collect(Collectors.toList());
    }

    public ResultResponse update(Long id, ResultRequest req) {
        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getRole() == User.Role.FACULTY && req.getExamType() != Result.ExamType.INTERNAL) {
            throw new RuntimeException("Faculty can update internal marks only");
        }
        validateMarks(req);

        Result result = resultRepository
                .findById(id)
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
                .filter(result -> !"Overall Result".equalsIgnoreCase(result.getSubject()))
                .toList();
        if (academicRows.isEmpty()) {
            academicRows = results;
        }

        double avg = academicRows.stream()
                .mapToDouble(result ->
                        (result.getMarksObtained() / result.getMaxMarks()) * 100
                )
                .average()
                .orElse(0);
        double marksObtained = academicRows.stream().mapToDouble(Result::getMarksObtained).sum();
        double maxMarks = academicRows.stream().mapToDouble(Result::getMaxMarks).sum();
        double sgpa = academicRows.stream()
                .mapToDouble(result -> gradePoint((result.getMarksObtained() / result.getMaxMarks()) * 100))
                .average()
                .orElse(0);
        Map<Integer, Double> semesterSgpa = academicRows.stream()
                .collect(Collectors.groupingBy(
                        Result::getSemester,
                        Collectors.averagingDouble(result -> gradePoint((result.getMarksObtained() / result.getMaxMarks()) * 100))
                ));
        double cgpa = semesterSgpa.values().stream().mapToDouble(Double::doubleValue).average().orElse(0);

        Map<String, List<ResultResponse>> bySemester = new HashMap<>();

        for (Result r : results) {

            String semesterKey = "Semester " + r.getSemester();

            bySemester
                    .computeIfAbsent(semesterKey, k -> new ArrayList<>())
                    .add(ResultResponse.from(r));
        }

        String overallGrade = computeGrade(avg);

        report.put("totalExams", results.size());
        report.put("averagePercentage", Math.round(avg * 10.0) / 10.0);
        report.put("totalMarksObtained", Math.round(marksObtained * 10.0) / 10.0);
        report.put("totalMaxMarks", Math.round(maxMarks * 10.0) / 10.0);
        report.put("sgpa", Math.round(sgpa * 100.0) / 100.0);
        report.put("cgpa", Math.round(cgpa * 100.0) / 100.0);
        report.put("overallGrade", overallGrade);
        report.put("semesterWise", bySemester);
        report.put(
                "results",
                results.stream()
                        .map(ResultResponse::from)
                        .collect(Collectors.toList())
        );

        return report;
    }

    public Map<String, Object> shareResult(Long studentId, String subject, Integer semester) {
        Student student = studentRepository
                .findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        List<Result> rows = resultRepository.findByStudentId(studentId).stream()
                .filter(result -> subject == null || subject.isBlank() || result.getSubject().equalsIgnoreCase(subject.trim()))
                .filter(result -> semester == null || result.getSemester().equals(semester))
                .toList();

        if (rows.isEmpty()) {
            throw new RuntimeException("No saved result found to share");
        }

        rows.forEach(result -> {
            result.setRemarks(markRemarksPublished(result.getRemarks()));
            resultRepository.save(result);
        });

        String subjectText = subject == null || subject.isBlank() ? "results" : subject.trim() + " result";
        String title = "Result shared";
        String message = student.getFullName() + "'s " + subjectText + " has been shared for Semester " + rows.get(0).getSemester() + ".";

        int notifications = 0;
        if (student.getUser() != null) {
            notificationService.createNotification(
                    student.getUser(),
                    title,
                    "Your " + subjectText + " has been published. Please check your results page.",
                    Notification.NotificationType.RESULT,
                    student.getId(),
                    Notification.RelatedEntityType.RESULT
            );
            notifications++;
        }

        for (User admin : userRepository.findByRole(User.Role.ADMIN)) {
            notificationService.createNotification(
                    admin,
                    title,
                    message,
                    Notification.NotificationType.RESULT,
                    student.getId(),
                    Notification.RelatedEntityType.RESULT
            );
            notifications++;
        }

        return Map.of("shared", true, "notifications", notifications);
    }

    private String markRemarksPublished(String remarks) {
        if (remarks == null || remarks.isBlank()) {
            return "{\"published\":true,\"exportedToAdmin\":true}";
        }
        String updated = remarks;
        if (updated.contains("\"published\"")) {
            updated = updated.replaceAll("\"published\"\\s*:\\s*false", "\"published\":true");
        } else if (updated.trim().startsWith("{")) {
            updated = updated.replaceFirst("\\{", "{\"published\":true,");
        }
        if (updated.contains("\"exportedToAdmin\"")) {
            updated = updated.replaceAll("\"exportedToAdmin\"\\s*:\\s*false", "\"exportedToAdmin\":true");
        } else if (updated.trim().startsWith("{")) {
            updated = updated.replaceFirst("\\{", "{\"exportedToAdmin\":true,");
        }
        return updated;
    }

    public Student getStudentByRollNumber(String rollNumber) {

        return studentRepository
                .findByRollNumber(rollNumber)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    public List<ResultResponse> getMyResults() {
        Student student = getCurrentStudent()
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return getByStudent(student.getId());
    }

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
                .anyMatch(assignment -> studentMatchesAssignment(student, assignment, semester) && subjectMatchesAssignment(subject, assignment));
    }

    private Optional<Result> findExistingResult(Long studentId, String subject, Result.ExamType examType, Integer semester) {
        Optional<Result> exact = resultRepository.findExistingResult(studentId, subject, examType, semester);
        if (exact.isPresent()) return exact;

        return resultRepository.findByStudentIdAndExamTypeAndSemester(studentId, examType, semester).stream()
                .filter(result -> subjectsAreCompatible(result.getSubject(), subject))
                .findFirst();
    }

    private void validateMarks(ResultRequest req) {
        if (req.getMarksObtained() == null || req.getMaxMarks() == null) {
            throw new RuntimeException("Marks and maximum marks are required");
        }
        if (req.getMaxMarks() <= 0) {
            throw new RuntimeException("Maximum marks must be greater than zero");
        }
        if (req.getMarksObtained() < 0) {
            throw new RuntimeException("Marks cannot be negative");
        }
        if (req.getMarksObtained() > req.getMaxMarks()) {
            throw new RuntimeException("Marks cannot exceed maximum marks");
        }
    }

    private void validateRegisteredInternalSubject(Student student, String subject, Result.ExamType examType) {
        if (examType != Result.ExamType.INTERNAL) return;
        if (student == null || isBlank(subject)) {
            throw new RuntimeException("Student and subject are required for internal marks");
        }
        List<String> registeredSubjects = parseRegisteredSubjects(student.getRegisteredSubjects());
        if (registeredSubjects.isEmpty()) {
            throw new RuntimeException("Cannot enter internal marks because the student has not registered any subjects");
        }
        boolean registered = registeredSubjects.stream().anyMatch(registeredSubject -> subjectsAreCompatible(registeredSubject, subject));
        if (!registered) {
            throw new RuntimeException("Cannot enter internal marks because the student has not registered this subject");
        }
    }

    private void validateFinalSubjectEligibility(Student student, String subject, Result.ExamType examType, Integer semester) {
        if (examType == Result.ExamType.INTERNAL) return;
        if (student == null || isBlank(subject)) {
            throw new RuntimeException("Student and subject are required for final marks");
        }
        boolean hasInternalMarks = resultRepository
                .findByStudentIdAndExamTypeAndSemester(student.getId(), Result.ExamType.INTERNAL, semester)
                .stream()
                .anyMatch(result -> subjectsAreCompatible(result.getSubject(), subject));
        if (!hasInternalMarks) {
            throw new RuntimeException("Subject not eligible: faculty has not entered internal marks for this subject");
        }
    }

    private List<String> parseRegisteredSubjects(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split("\\|\\|"))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .distinct()
                .toList();
    }

    private boolean studentMatchesAssignment(Student student, FacultySubjectAssignment assignment, Integer semester) {
        boolean matchesSemester = assignment.getSemester() == null
                || Objects.equals(assignment.getSemester(), semester)
                || Objects.equals(assignment.getSemester(), student.getSemester());
        if (!matchesSemester) return false;

        if (student.getCourse() == null || assignment.getBranch() == null) return true;

        boolean matchesAssignmentBranch = branchMatchesStudentCourse(
                assignment.getBranch().getCode(),
                assignment.getBranch().getName(),
                student
        );
        boolean matchesSubjectBranch = assignment.getSubject() != null
                && assignment.getSubject().getBranch() != null
                && branchMatchesStudentCourse(
                assignment.getSubject().getBranch().getCode(),
                assignment.getSubject().getBranch().getName(),
                student
        );
        return matchesAssignmentBranch || matchesSubjectBranch;
    }

    private boolean subjectMatchesAssignment(String value, FacultySubjectAssignment assignment) {
        if (assignment.getSubject() == null) return false;
        String subjectCode = assignment.getSubject().getCode();
        String subjectName = assignment.getSubject().getName();
        String subjectValue = subjectCode + " - " + subjectName;
        if (subjectsAreCompatible(value, subjectValue)) return true;
        String normalizedValue = normalizedSubject(value);
        return normalizedValue.equals(normalizedSubject(subjectCode))
                || normalizedValue.equals(normalizedSubject(subjectName));
    }

    private boolean branchMatchesStudentCourse(String branchCode, String branchName, Student student) {
        if (student == null || student.getCourse() == null) return true;
        return normalizedBranchCode(branchCode).equals(normalizedBranchCode(student.getCourse().getCode()))
                || normalizedName(branchName).equals(normalizedName(student.getCourse().getName()));
    }

    private boolean subjectsAreCompatible(String left, String right) {
        String normalizedLeft = normalizedSubject(left);
        String normalizedRight = normalizedSubject(right);
        if (normalizedLeft.isBlank() || normalizedRight.isBlank()) return false;
        if (normalizedLeft.equals(normalizedRight)) return true;

        String leftName = normalizedSubject(subjectNamePart(left));
        String rightName = normalizedSubject(subjectNamePart(right));
        return !leftName.isBlank() && leftName.equals(rightName) && (hasSubjectCodePart(left) || hasSubjectCodePart(right));
    }

    private String subjectNamePart(String value) {
        if (value == null) return "";
        String marker = " - ";
        int index = value.indexOf(marker);
        return index >= 0 ? value.substring(index + marker.length()) : value;
    }

    private boolean hasSubjectCodePart(String value) {
        return value != null && value.contains(" - ");
    }

    private String normalizedSubject(String value) {
        return value == null ? "" : value.trim().toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
    }

    private String normalizedName(String value) {
        return normalizedSubject(value);
    }

    private String normalizedBranchCode(String value) {
        String code = value == null ? "" : value.trim().toUpperCase();
        if (code.startsWith("BTECH-")) return code.replace("BTECH-", "");
        if (code.matches("^CS\\d*$")) return "CSE";
        if (code.matches("^EC\\d*$")) return "ECE";
        if (code.matches("^MC\\d*$")) return "MCA";
        if (code.matches("^MB\\d*$")) return "MBA";
        if (code.contains("CSE")) return "CSE";
        if (code.contains("ECE")) return "ECE";
        if (code.contains("AIDS")) return "AIDS";
        if (code.contains("AI")) return "AI";
        if (code.contains("ME")) return "ME";
        if (code.contains("MCA")) return "MCA";
        if (code.contains("MBA")) return "MBA";
        return code;
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return String.valueOf(left == null ? "" : left).trim().equalsIgnoreCase(String.valueOf(right == null ? "" : right).trim());
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private double gradePoint(double percentage) {
        if (percentage >= 90) return 10;
        if (percentage >= 80) return 9;
        if (percentage >= 70) return 8;
        if (percentage >= 60) return 7;
        if (percentage >= 50) return 6;
        if (percentage >= 40) return 5;
        return 0;
    }
}
