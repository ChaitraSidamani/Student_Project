package com.sms.controller;

import com.sms.dto.ApiResponse;
import com.sms.dto.erp.ErpDashboardResponse;
import com.sms.entity.User;
import com.sms.entity.erp.*;
import com.sms.repository.UserRepository;
import com.sms.repository.erp.*;
import com.sms.service.ErpAcademicService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/erp")
public class ErpController {
    private final ErpAcademicService erpAcademicService;
    private final DepartmentRepository departmentRepository;
    private final BranchRepository branchRepository;
    private final SemesterRepository semesterRepository;
    private final SubjectRepository subjectRepository;
    private final FacultyRepository facultyRepository;
    private final FacultySubjectAssignmentRepository assignmentRepository;
    private final TimetableRepository timetableRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AcademicResultRepository academicResultRepository;
    private final AcademicYearRepository academicYearRepository;
    private final FeeLedgerRepository feeLedgerRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ErpController(
            ErpAcademicService erpAcademicService,
            DepartmentRepository departmentRepository,
            BranchRepository branchRepository,
            SemesterRepository semesterRepository,
            SubjectRepository subjectRepository,
            FacultyRepository facultyRepository,
            FacultySubjectAssignmentRepository assignmentRepository,
            TimetableRepository timetableRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            AcademicResultRepository academicResultRepository,
            AcademicYearRepository academicYearRepository,
            FeeLedgerRepository feeLedgerRepository,
            LeaveRequestRepository leaveRequestRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.erpAcademicService = erpAcademicService;
        this.departmentRepository = departmentRepository;
        this.branchRepository = branchRepository;
        this.semesterRepository = semesterRepository;
        this.subjectRepository = subjectRepository;
        this.facultyRepository = facultyRepository;
        this.assignmentRepository = assignmentRepository;
        this.timetableRepository = timetableRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.academicResultRepository = academicResultRepository;
        this.academicYearRepository = academicYearRepository;
        this.feeLedgerRepository = feeLedgerRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<ErpDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success("ERP dashboard fetched", erpAcademicService.dashboard()));
    }

    @GetMapping("/departments")
    public ResponseEntity<ApiResponse<List<Department>>> departments() {
        return ResponseEntity.ok(ApiResponse.success("Departments fetched", departmentRepository.findAll()));
    }

    @PostMapping("/departments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Department>> saveDepartment(@Valid @RequestBody Department department) {
        return ResponseEntity.ok(ApiResponse.success("Department saved", departmentRepository.save(department)));
    }

    @GetMapping("/branches")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> branches() {
        return ResponseEntity.ok(ApiResponse.success("Branches fetched", branchRepository.findAll().stream().map(this::branchRow).toList()));
    }

    @PostMapping("/branches")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> saveBranch(@Valid @RequestBody Branch branch) {
        return ResponseEntity.ok(ApiResponse.success("Branch saved", branchRepository.save(branch)));
    }

    @GetMapping("/semesters")
    public ResponseEntity<ApiResponse<List<Semester>>> semesters() {
        return ResponseEntity.ok(ApiResponse.success("Semesters fetched", semesterRepository.findAll()));
    }

    @PostMapping("/semesters")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Semester>> saveSemester(@Valid @RequestBody Semester semester) {
        return ResponseEntity.ok(ApiResponse.success("Semester saved", semesterRepository.save(semester)));
    }

    @GetMapping("/subjects")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> subjects() {
        return ResponseEntity.ok(ApiResponse.success("Subjects fetched", subjectRepository.findAll().stream().map(this::subjectRow).toList()));
    }

    @PostMapping("/subjects")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Subject>> saveSubject(@Valid @RequestBody Subject subject) {
        return ResponseEntity.ok(ApiResponse.success("Subject saved", subjectRepository.save(subject)));
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> faculty() {
        return ResponseEntity.ok(ApiResponse.success("Faculty fetched", facultyRepository.findAll().stream()
                .map(this::facultyRow)
                .toList()));
    }

    @PostMapping("/faculty")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveFaculty(@RequestBody Map<String, Object> request) {
        Long id = number(request, "id");
        String employeeCode = text(request, "employeeCode");
        String fullName = text(request, "fullName");
        String email = text(request, "email");
        String phone = text(request, "phone");
        String designation = text(request, "designation");
        String username = text(request, "username");
        String password = text(request, "password");
        Boolean active = bool(request, "active");
        Long departmentId = number(request, "departmentId");
        if (departmentId == null) {
            departmentId = nestedNumber(request, "department", "id");
        }

        if (fullName == null || fullName.isBlank()) {
            throw new RuntimeException("Faculty full name is required");
        }
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Faculty email is required");
        }
        validateFacultyPhone(phone);
        if (username == null || username.isBlank()) {
            username = employeeCode == null ? email : employeeCode.toLowerCase();
        }

        Faculty faculty = id == null
                ? new Faculty()
                : facultyRepository.findById(id).orElseThrow(() -> new RuntimeException("Faculty not found: " + id));

        String finalEmail = email;
        boolean emailExists = facultyRepository.findAll().stream()
                .anyMatch(item -> !item.getId().equals(faculty.getId()) && item.getEmail().equalsIgnoreCase(finalEmail));
        if (emailExists) {
            throw new RuntimeException("Faculty email already exists: " + email);
        }

        User user = faculty.getUser();
        if (user == null && (password == null || password.isBlank())) {
            throw new RuntimeException("Faculty password is required");
        }
        String finalUsername = username;
        Long currentUserId = user == null ? null : user.getId();
        userRepository.findByUsername(finalUsername).ifPresent(existingUser -> {
            if (currentUserId == null || !existingUser.getId().equals(currentUserId)) {
                throw new RuntimeException("Faculty username already exists: " + finalUsername);
            }
        });

        if (user == null) {
            user = new User();
            user.setRole(User.Role.FACULTY);
        }

        boolean isActive = active == null || active;
        user.setUsername(username);
        if (password != null && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        }
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setActive(isActive);
        User savedUser = userRepository.save(user);

        faculty.setEmployeeCode(employeeCode);
        faculty.setFullName(fullName);
        faculty.setEmail(email);
        faculty.setPhone(phone);
        faculty.setDesignation(designation);
        faculty.setDepartment(departmentId == null ? null : departmentRepository.findById(departmentId).orElse(null));
        faculty.setUser(savedUser);
        faculty.setActive(isActive);

        Faculty savedFaculty = facultyRepository.save(faculty);
        return ResponseEntity.ok(ApiResponse.success("Faculty saved", facultyRow(savedFaculty)));
    }

    @PostMapping("/faculty-with-assignment")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveFacultyWithAssignment(@RequestBody Map<String, Object> request) {
        String employeeCode = text(request, "employeeCode");
        String fullName = text(request, "fullName");
        String email = text(request, "email");
        String phone = text(request, "phone");
        String designation = text(request, "designation");
        String username = text(request, "username");
        String password = text(request, "password");
        String departmentCode = text(request, "departmentCode");
        String departmentName = text(request, "departmentName");
        String branchCode = text(request, "branchCode");
        String branchName = text(request, "branchName");
        String subjectCode = text(request, "subjectCode");
        String subjectName = text(request, "subjectName");
        Long departmentId = number(request, "departmentId");
        Long subjectId = number(request, "subjectId");
        Long branchId = number(request, "branchId");
        Integer semester = integer(request, "semester");
        String section = text(request, "section");
        String academicYear = text(request, "academicYear");

        String requestedEmployeeCode = employeeCode;
        if (employeeCode == null || employeeCode.isBlank()) {
            employeeCode = generateEmployeeCode();
        }
        if (facultyRepository.findByEmployeeCode(employeeCode).isPresent()) {
            employeeCode = generateEmployeeCode();
            if (username == null || username.isBlank() || username.equalsIgnoreCase(requestedEmployeeCode)) {
                username = employeeCode.toLowerCase();
            }
        }
        if (username == null || username.isBlank()) {
            username = employeeCode.toLowerCase();
        }
        if (fullName == null || fullName.isBlank()) {
            throw new RuntimeException("Faculty full name is required");
        }
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Faculty email is required");
        }
        validateFacultyPhone(phone);
        if (password == null || password.isBlank()) {
            throw new RuntimeException("Faculty password is required");
        }
        if (semester == null) {
            semester = 1;
        }
        if (section == null || section.isBlank()) {
            section = "A";
        }
        if (academicYear != null && academicYear.isBlank()) {
            academicYear = null;
        }

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Faculty username already exists: " + username);
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Faculty email already exists: " + email);
        }
        Department department = resolveDepartment(departmentId, departmentCode, departmentName);
        Branch branch = resolveBranch(branchId, branchCode, branchName, department);
        Subject subject = resolveSubject(subjectId, subjectCode, subjectName, branch, semester);
        validateAssignmentAvailable(subject.getId(), semester, section, academicYear, null);

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setRole(User.Role.FACULTY);
        user.setActive(true);
        User savedUser = userRepository.save(user);

        Faculty faculty = new Faculty();
        faculty.setEmployeeCode(employeeCode);
        faculty.setFullName(fullName);
        faculty.setEmail(email);
        faculty.setPhone(phone);
        faculty.setDesignation(designation);
        faculty.setDepartment(department);
        faculty.setJoiningDate(LocalDate.now());
        faculty.setActive(true);
        faculty.setUser(savedUser);
        Faculty savedFaculty = facultyRepository.save(faculty);

        FacultySubjectAssignment assignment = new FacultySubjectAssignment();
        assignment.setFaculty(savedFaculty);
        assignment.setSubject(subject);
        assignment.setBranch(branch);
        assignment.setSemester(semester);
        assignment.setSection(section);
        assignment.setAcademicYear(academicYear);
        assignment.setActive(true);

        FacultySubjectAssignment savedAssignment = assignmentRepository.save(assignment);
        return ResponseEntity.ok(ApiResponse.success("Faculty and subject assignment saved", savedFacultyAssignmentResponse(savedAssignment)));
    }

    @PutMapping("/faculty-with-assignment/{assignmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateFacultyWithAssignment(
            @PathVariable Long assignmentId,
            @RequestBody Map<String, Object> request) {
        FacultySubjectAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Faculty assignment not found: " + assignmentId));
        Faculty faculty = assignment.getFaculty();
        if (faculty == null) {
            throw new RuntimeException("Faculty record not found for assignment: " + assignmentId);
        }

        String fullName = text(request, "fullName");
        String email = text(request, "email");
        String phone = text(request, "phone");
        String designation = text(request, "designation");
        String username = text(request, "username");
        String password = text(request, "password");
        String departmentCode = text(request, "departmentCode");
        String departmentName = text(request, "departmentName");
        String branchCode = text(request, "branchCode");
        String branchName = text(request, "branchName");
        String subjectCode = text(request, "subjectCode");
        String subjectName = text(request, "subjectName");
        Long departmentId = number(request, "departmentId");
        Long subjectId = number(request, "subjectId");
        Long branchId = number(request, "branchId");
        Integer semester = integer(request, "semester");
        String section = text(request, "section");
        String academicYear = text(request, "academicYear");

        if (fullName == null || fullName.isBlank()) {
            throw new RuntimeException("Faculty full name is required");
        }
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Faculty email is required");
        }
        validateFacultyPhone(phone);
        if (semester == null) {
            semester = assignment.getSemester() == null ? 1 : assignment.getSemester();
        }
        if (section == null || section.isBlank()) {
            section = assignment.getSection() == null || assignment.getSection().isBlank() ? "A" : assignment.getSection();
        }
        if (academicYear == null || academicYear.isBlank()) {
            academicYear = assignment.getAcademicYear();
        }

        boolean emailExists = facultyRepository.findAll().stream()
                .anyMatch(item -> !item.getId().equals(faculty.getId()) && email.equalsIgnoreCase(item.getEmail()));
        if (emailExists) {
            throw new RuntimeException("Faculty email already exists: " + email);
        }

        User user = faculty.getUser();
        if (user != null) {
            if (username != null && !username.isBlank() && !username.equalsIgnoreCase(user.getUsername()) && userRepository.existsByUsername(username)) {
                throw new RuntimeException("Faculty username already exists: " + username);
            }
            if (username != null && !username.isBlank()) {
                user.setUsername(username);
            }
            user.setFullName(fullName);
            user.setEmail(email);
            user.setPhone(phone);
            user.setRole(User.Role.FACULTY);
            user.setActive(true);
            if (password != null && !password.isBlank()) {
                user.setPassword(passwordEncoder.encode(password));
            }
            userRepository.save(user);
        }

        Department department = resolveDepartment(departmentId, departmentCode, departmentName);
        Branch branch = resolveBranch(branchId, branchCode, branchName, department);
        Subject subject = resolveSubject(subjectId, subjectCode, subjectName, branch, semester);
        validateFacultySemesterAvailable(faculty.getId(), semester, academicYear, assignment.getId());
        validateAssignmentAvailable(subject.getId(), semester, section, academicYear, assignment.getId());

        faculty.setFullName(fullName);
        faculty.setEmail(email);
        faculty.setPhone(phone);
        faculty.setDesignation(designation);
        faculty.setDepartment(department);
        faculty.setActive(true);
        Faculty savedFaculty = facultyRepository.save(faculty);

        assignment.setFaculty(savedFaculty);
        assignment.setSubject(subject);
        assignment.setBranch(branch);
        assignment.setSemester(semester);
        assignment.setSection(section);
        assignment.setAcademicYear(academicYear);
        assignment.setActive(true);

        FacultySubjectAssignment savedAssignment = assignmentRepository.save(assignment);
        return ResponseEntity.ok(ApiResponse.success("Faculty assignment updated", savedFacultyAssignmentResponse(savedAssignment)));
    }

    @DeleteMapping("/faculty-with-assignment/{assignmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteFacultyWithAssignment(@PathVariable Long assignmentId) {
        FacultySubjectAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Faculty assignment not found: " + assignmentId));
        assignment.setActive(false);
        assignmentRepository.save(assignment);

        return ResponseEntity.ok(ApiResponse.success("Faculty assignment deleted", null));
    }

    @GetMapping("/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> assignments() {
        return ResponseEntity.ok(ApiResponse.success("Assignments fetched", assignmentRepository.findAll().stream()
                .filter(assignment -> Boolean.TRUE.equals(assignment.getActive()))
                .map(this::assignmentRow)
                .toList()));
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FacultySubjectAssignment>> saveAssignment(@RequestBody FacultySubjectAssignment assignment) {
        if (assignment.getSubject() == null || assignment.getSubject().getId() == null) {
            throw new RuntimeException("Subject is required for faculty assignment");
        }
        if (assignment.getFaculty() == null || assignment.getFaculty().getId() == null) {
            throw new RuntimeException("Faculty is required for faculty assignment");
        }
        validateFacultySemesterAvailable(assignment.getFaculty().getId(), assignment.getSemester(), assignment.getAcademicYear(), assignment.getId());
        validateAssignmentAvailable(assignment.getSubject().getId(), assignment.getSemester(), assignment.getSection(), assignment.getAcademicYear(), assignment.getId());
        return ResponseEntity.ok(ApiResponse.success("Assignment saved", assignmentRepository.save(assignment)));
    }

    @GetMapping("/timetable")
    public ResponseEntity<ApiResponse<List<Timetable>>> timetable() {
        return ResponseEntity.ok(ApiResponse.success("Timetable fetched", timetableRepository.findAll()));
    }

    @PostMapping("/timetable")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<Timetable>> saveTimetable(@RequestBody Timetable timetable) {
        return ResponseEntity.ok(ApiResponse.success("Timetable saved", timetableRepository.save(timetable)));
    }

    @GetMapping("/attendance-records")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<AttendanceRecord>>> attendanceRecords() {
        return ResponseEntity.ok(ApiResponse.success("Attendance records fetched", attendanceRecordRepository.findAll()));
    }

    @PostMapping("/attendance-records")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<AttendanceRecord>> saveAttendance(@RequestBody AttendanceRecord record) {
        return ResponseEntity.ok(ApiResponse.success("Attendance saved", attendanceRecordRepository.save(record)));
    }

    @GetMapping("/attendance-report")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> attendanceReport(
            @RequestParam Long branchId,
            @RequestParam Integer semester,
            @RequestParam String section,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success("Attendance report fetched", erpAcademicService.attendanceReport(branchId, semester, section, from, to)));
    }

    @GetMapping("/academic-results")
    public ResponseEntity<ApiResponse<List<AcademicResult>>> academicResults() {
        return ResponseEntity.ok(ApiResponse.success("Academic results fetched", academicResultRepository.findAll()));
    }

    @PostMapping("/academic-results")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<AcademicResult>> saveAcademicResult(@RequestBody AcademicResult result) {
        result.setTotalMarks((result.getInternalMarks() == null ? 0 : result.getInternalMarks()) + (result.getExternalMarks() == null ? 0 : result.getExternalMarks()));
        return ResponseEntity.ok(ApiResponse.success("Academic result saved", academicResultRepository.save(result)));
    }

    @GetMapping("/academic-years")
    public ResponseEntity<ApiResponse<List<AcademicYear>>> academicYears() {
        return ResponseEntity.ok(ApiResponse.success("Academic years fetched", academicYearRepository.findAll()));
    }

    @PostMapping("/academic-years")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AcademicYear>> saveAcademicYear(@RequestBody AcademicYear academicYear) {
        return ResponseEntity.ok(ApiResponse.success("Academic year saved", academicYearRepository.save(academicYear)));
    }

    @GetMapping("/fees/student/{studentId}")
    public ResponseEntity<ApiResponse<List<FeeLedger>>> studentFees(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.success("Fee details fetched", feeLedgerRepository.findByStudentId(studentId)));
    }

    @GetMapping("/leave-requests")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> leaveRequests() {
        return ResponseEntity.ok(ApiResponse.success("Leave requests fetched", leaveRequestRepository.findAll()));
    }

    @PostMapping("/leave-requests")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public ResponseEntity<ApiResponse<LeaveRequest>> saveLeaveRequest(@RequestBody LeaveRequest leaveRequest) {
        return ResponseEntity.ok(ApiResponse.success("Leave request saved", leaveRequestRepository.save(leaveRequest)));
    }

    private String text(Map<String, Object> request, String key) {
        Object value = request.get(key);
        return value == null ? null : String.valueOf(value).trim();
    }

    private void validateFacultyPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new RuntimeException("Faculty phone number is required");
        }
        if (!phone.matches("[6-9]\\d{9}")) {
            throw new RuntimeException("Faculty phone number must be 10 digits and start with 6, 7, 8, or 9");
        }
    }

    private Long number(Map<String, Object> request, String key) {
        Object value = request.get(key);
        if (value == null || String.valueOf(value).isBlank()) return null;
        return Long.valueOf(String.valueOf(value));
    }

    @SuppressWarnings("unchecked")
    private Long nestedNumber(Map<String, Object> request, String parentKey, String childKey) {
        Object parent = request.get(parentKey);
        if (!(parent instanceof Map<?, ?> parentMap)) return null;
        Object value = ((Map<String, Object>) parentMap).get(childKey);
        if (value == null || String.valueOf(value).isBlank()) return null;
        return Long.valueOf(String.valueOf(value));
    }

    private Boolean bool(Map<String, Object> request, String key) {
        Object value = request.get(key);
        if (value == null || String.valueOf(value).isBlank()) return null;
        if (value instanceof Boolean boolValue) return boolValue;
        return Boolean.valueOf(String.valueOf(value));
    }

    private Integer integer(Map<String, Object> request, String key) {
        Object value = request.get(key);
        if (value == null || String.valueOf(value).isBlank()) return null;
        return Integer.valueOf(String.valueOf(value));
    }

    private Map<String, Object> departmentRow(Department department) {
        return Map.of(
                "id", department.getId(),
                "code", department.getCode(),
                "name", department.getName(),
                "hodName", department.getHodName() == null ? "" : department.getHodName()
        );
    }

    private Map<String, Object> branchRow(Branch branch) {
        return Map.of(
                "id", branch.getId(),
                "code", branch.getCode(),
                "name", branch.getName(),
                "department", branch.getDepartment() == null ? Map.of() : departmentRow(branch.getDepartment())
        );
    }

    private Map<String, Object> subjectRow(Subject subject) {
        return Map.of(
                "id", subject.getId(),
                "code", subject.getCode(),
                "name", subject.getName(),
                "branch", subject.getBranch() == null ? Map.of() : branchRow(subject.getBranch()),
                "semester", subject.getSemester() == null ? Map.of() : Map.of(
                        "id", subject.getSemester().getId(),
                        "number", subject.getSemester().getNumber(),
                        "name", subject.getSemester().getName()
                )
        );
    }

    private Map<String, Object> facultyRow(Faculty faculty) {
        return Map.of(
                "id", faculty.getId(),
                "employeeCode", faculty.getEmployeeCode(),
                "fullName", faculty.getFullName(),
                "email", faculty.getEmail(),
                "userId", faculty.getUser() == null ? "" : faculty.getUser().getId(),
                "username", faculty.getUser() == null ? "" : faculty.getUser().getUsername(),
                "phone", faculty.getPhone() == null ? "" : faculty.getPhone(),
                "designation", faculty.getDesignation() == null ? "" : faculty.getDesignation(),
                "department", faculty.getDepartment() == null ? Map.of() : departmentRow(faculty.getDepartment()),
                "active", Boolean.TRUE.equals(faculty.getActive())
        );
    }

    private Map<String, Object> assignmentRow(FacultySubjectAssignment assignment) {
        return Map.of(
                "id", assignment.getId(),
                "faculty", assignment.getFaculty() == null ? Map.of() : facultyRow(assignment.getFaculty()),
                "subject", assignment.getSubject() == null ? Map.of() : subjectRow(assignment.getSubject()),
                "branch", assignment.getBranch() == null ? Map.of() : branchRow(assignment.getBranch()),
                "semester", assignment.getSemester() == null ? "" : assignment.getSemester(),
                "section", assignment.getSection() == null ? "" : assignment.getSection(),
                "academicYear", assignment.getAcademicYear() == null ? "" : assignment.getAcademicYear()
        );
    }

    private Map<String, Object> savedFacultyAssignmentResponse(FacultySubjectAssignment assignment) {
        Faculty faculty = assignment.getFaculty();
        Subject subject = assignment.getSubject();
        Branch branch = assignment.getBranch();
        Department department = faculty == null ? null : faculty.getDepartment();
        return Map.of(
                "id", assignment.getId(),
                "facultyId", faculty == null ? "" : faculty.getId(),
                "employeeCode", faculty == null ? "" : faculty.getEmployeeCode(),
                "facultyName", faculty == null ? "" : faculty.getFullName(),
                "department", department == null ? "" : department.getCode(),
                "subject", subject == null ? "" : subject.getName(),
                "branch", branch == null ? "" : branch.getCode(),
                "semester", assignment.getSemester() == null ? "" : assignment.getSemester(),
                "section", assignment.getSection() == null ? "" : assignment.getSection(),
                "academicYear", assignment.getAcademicYear() == null ? "" : assignment.getAcademicYear()
        );
    }

    private void validateAssignmentAvailable(Long subjectId, Integer semester, String section, String academicYear, Long excludeAssignmentId) {
        if (subjectId == null || semester == null) {
            throw new RuntimeException("Subject and semester are required for faculty assignment");
        }
        String safeSection = section == null || section.isBlank() ? "A" : section.trim();
        String safeAcademicYear = academicYear == null || academicYear.isBlank() ? "" : academicYear.trim();
        List<FacultySubjectAssignment> conflicts = assignmentRepository.findActiveConflicts(subjectId, semester, safeSection, safeAcademicYear, excludeAssignmentId);
        if (!conflicts.isEmpty()) {
            FacultySubjectAssignment conflict = conflicts.get(0);
            String subjectName = conflict.getSubject() == null ? "This subject" : conflict.getSubject().getName();
            String facultyName = conflict.getFaculty() == null ? "another faculty" : conflict.getFaculty().getFullName();
            String yearLabel = safeAcademicYear.isBlank() ? "" : safeAcademicYear + ", ";
            throw new RuntimeException(subjectName + " for " + yearLabel + "Semester " + semester + ", Division " + safeSection + " is already assigned to " + facultyName);
        }
    }

    private void validateFacultySemesterAvailable(Long facultyId, Integer semester, String academicYear, Long excludeAssignmentId) {
        if (facultyId == null || semester == null) {
            throw new RuntimeException("Faculty and semester are required for faculty assignment");
        }
        String safeAcademicYear = academicYear == null || academicYear.isBlank() ? "" : academicYear.trim();
        List<FacultySubjectAssignment> conflicts = assignmentRepository.findActiveFacultySemesterConflicts(facultyId, semester, safeAcademicYear, excludeAssignmentId);
        if (!conflicts.isEmpty()) {
            FacultySubjectAssignment conflict = conflicts.get(0);
            String facultyName = conflict.getFaculty() == null ? "This faculty" : conflict.getFaculty().getFullName();
            String yearLabel = safeAcademicYear.isBlank() ? "" : " for " + safeAcademicYear;
            throw new RuntimeException(facultyName + " is already allocated to Semester " + semester + yearLabel);
        }
    }

    private Department resolveDepartment(Long id, String code, String name) {
        if (id != null) {
            return departmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Department not found: " + id));
        }
        if (code == null || code.isBlank()) {
            throw new RuntimeException("Department is required");
        }
        String safeCode = code.trim().toUpperCase();
        return departmentRepository.findByCode(safeCode).orElseGet(() -> {
            Department department = new Department();
            department.setCode(safeCode);
            department.setName(name == null || name.isBlank() ? safeCode : name);
            department.setHodName("To be assigned");
            department.setActive(true);
            return departmentRepository.save(department);
        });
    }

    private Branch resolveBranch(Long id, String code, String name, Department department) {
        if (id != null) {
            return branchRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
        }
        if (code == null || code.isBlank()) {
            throw new RuntimeException("Branch is required");
        }
        String safeCode = code.trim().toUpperCase();
        return branchRepository.findByCode(safeCode).orElseGet(() -> {
            Branch branch = new Branch();
            branch.setCode(safeCode);
            branch.setName(name == null || name.isBlank() ? safeCode : name);
            branch.setDepartment(department);
            branch.setDurationSemesters(4);
            branch.setActive(true);
            return branchRepository.save(branch);
        });
    }

    private Subject resolveSubject(Long id, String code, String name, Branch branch, Integer semesterNumber) {
        if (id != null) {
            return subjectRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Subject not found: " + id));
        }
        if (code == null || code.isBlank()) {
            throw new RuntimeException("Subject is required");
        }
        String safeCode = code.trim().toUpperCase();
        Semester semester = semesterRepository.findAll().stream()
                .filter(item -> item.getNumber() != null && item.getNumber().equals(semesterNumber))
                .findFirst()
                .orElseGet(() -> {
                    Semester next = new Semester();
                    next.setNumber(semesterNumber);
                    next.setName("Semester " + semesterNumber);
                    next.setActive(true);
                    return semesterRepository.save(next);
                });
        return subjectRepository.findByCode(safeCode).orElseGet(() -> {
            Subject subject = new Subject();
            subject.setCode(safeCode);
            subject.setName(name == null || name.isBlank() ? safeCode : name);
            subject.setBranch(branch);
            subject.setSemester(semester);
            subject.setCredits(4);
            subject.setActive(true);
            return subjectRepository.save(subject);
        });
    }

    private String generateEmployeeCode() {
        long count = facultyRepository.count() + 1;
        String code;
        do {
            code = "FAC" + String.format("%03d", count++);
        } while (facultyRepository.findByEmployeeCode(code).isPresent());
        return code;
    }
}
