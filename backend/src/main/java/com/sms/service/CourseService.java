package com.sms.service;

import com.sms.dto.CourseRequest;
import com.sms.dto.CourseResponse;
import com.sms.entity.Course;
import com.sms.repository.CourseRepository;
import com.sms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CourseService {

    @Autowired
    private CourseRepository courseRepository;
    @Autowired
    private StudentRepository studentRepository;

    public List<CourseResponse> getAll() {
        return courseRepository.findAll().stream()
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }

    public CourseResponse getById(@NonNull Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found: " + id));
        return CourseResponse.from(course);
    }

    public CourseResponse getByCode(@NonNull String code) {
        Course course = courseRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Course not found with code: " + code));
        return CourseResponse.from(course);
    }

    public CourseResponse create(@NonNull CourseRequest request) {
        String code = generateCourseCode(request);
        if (courseRepository.existsByCode(code)) {
            throw new RuntimeException("Course code already exists: " + code);
        }

        Course course = new Course();
        course.setCode(code);
        course.setName(request.getName());
        course.setDescription(request.getDescription());
        course.setDurationYears(request.getDurationYears());
        course.setTotalSemesters(request.getTotalSemesters());
        course.setMaxStudents(request.getMaxStudents());
        course.setStatus(Course.Status.ACTIVE);

        Course savedCourse = courseRepository.save(course);
        return CourseResponse.from(savedCourse);
    }

    public CourseResponse update(@NonNull Long id, @NonNull CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found: " + id));
        String code = request.getCode() == null || request.getCode().isBlank()
                ? course.getCode()
                : normalizeCourseCode(request.getCode());

        // Check if new code is already used by another course
        if (!course.getCode().equals(code) && courseRepository.existsByCode(code)) {
            throw new RuntimeException("Course code already exists: " + code);
        }

        course.setCode(code);
        course.setName(request.getName());
        course.setDescription(request.getDescription());
        course.setDurationYears(request.getDurationYears());
        course.setTotalSemesters(request.getTotalSemesters());
        course.setMaxStudents(request.getMaxStudents());

        Course updatedCourse = courseRepository.save(course);
        return CourseResponse.from(updatedCourse);
    }

    public void delete(@NonNull Long id) {
        if (!courseRepository.existsById(id)) {
            throw new RuntimeException("Course not found: " + id);
        }

        long enrolledStudents = studentRepository.countByCourseId(id);
        if (enrolledStudents > 0) {
            throw new RuntimeException("Course cannot be deleted now because " + enrolledStudents + " student(s) are enrolled.");
        }

        try {
            courseRepository.deleteById(id);
            courseRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new RuntimeException("Cannot delete course because it is linked to existing academic records. Remove linked records first.");
        }
    }

    public boolean existsById(@NonNull Long id) {
        return courseRepository.existsById(id);
    }

    public long getTotalCount() {
        return courseRepository.count();
    }

    public List<CourseResponse> getActiveCourses() {
        return courseRepository.findByStatus(Course.Status.ACTIVE).stream()
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }

    public CourseResponse deactivate(@NonNull Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found: " + id));
        
        course.setStatus(Course.Status.INACTIVE);
        Course updatedCourse = courseRepository.save(course);
        return CourseResponse.from(updatedCourse);
    }

    public CourseResponse activate(@NonNull Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found: " + id));
        
        course.setStatus(Course.Status.ACTIVE);
        Course updatedCourse = courseRepository.save(course);
        return CourseResponse.from(updatedCourse);
    }

    private String normalizeCourseCode(String value) {
        String code = value == null ? "" : value.trim().toUpperCase();
        if (code.startsWith("BTECH-")) return code.substring("BTECH-".length());
        if (code.startsWith("BTECH")) return code.substring("BTECH".length()).replaceFirst("^[-_]+", "");
        return code;
    }

    private String generateCourseCode(CourseRequest request) {
        String supplied = request.getCode() == null ? "" : request.getCode().trim().toUpperCase();
        if (!supplied.isBlank()) return normalizeCourseCode(supplied);

        String base = courseCodePrefix(request.getName());
        String code = (base.substring(0, Math.min(2, base.length()))
                + digit(request.getDurationYears())
                + digit(request.getTotalSemesters())
                + digit(request.getMaxStudents()))
                .replaceAll("[^A-Z0-9]", "");
        return code.length() > 5 ? code.substring(0, 5) : code;
    }

    private String courseCodePrefix(String name) {
        String value = name == null ? "" : name.toUpperCase();
        if (value.contains("B.TECH") || value.contains("BTECH")) return acronym(value.replace("B.TECH", "").replace("BTECH", ""));
        return acronym(value);
    }

    private String digit(Integer value) {
        int number = value == null ? 0 : Math.abs(value);
        return String.valueOf(number % 10);
    }

    private String acronym(String value) {
        StringBuilder builder = new StringBuilder();
        for (String word : value.split("[^A-Z0-9]+")) {
            if (word.isBlank() || List.of("OF", "AND", "THE", "FOR", "IN").contains(word)) continue;
            builder.append(word.charAt(0));
            if (builder.length() >= 2) break;
        }
        return builder.length() == 0 ? "CR" : builder.toString();
    }

}
