package com.sms.dto;

import java.time.LocalDateTime;
import com.sms.entity.Course;

public class CourseResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer durationYears;
    private Integer totalSemesters;
    private Integer maxStudents;
    private String status;
    private Integer enrolledStudents;
    private LocalDateTime createdAt;

    public CourseResponse() {}

    public CourseResponse(Long id, String code, String name, String description, Integer durationYears, Integer totalSemesters, Integer maxStudents, String status, Integer enrolledStudents, LocalDateTime createdAt) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.durationYears = durationYears;
        this.totalSemesters = totalSemesters;
        this.maxStudents = maxStudents;
        this.status = status;
        this.enrolledStudents = enrolledStudents;
        this.createdAt = createdAt;
    }

    public static CourseResponse from(Course course, Integer enrolledStudents) {
        return new CourseResponse(
            course.getId(),
            course.getCode(),
            course.getName(),
            course.getDescription(),
            course.getDurationYears(),
            course.getTotalSemesters(),
            course.getMaxStudents(),
            course.getStatus() == null ? "ACTIVE" : course.getStatus().toString(),
            enrolledStudents != null ? enrolledStudents : 0,
            course.getCreatedAt()
        );
    }

    public static CourseResponse from(Course course) {
        return from(course, course.getStudents() != null ? course.getStudents().size() : 0);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getDurationYears() { return durationYears; }
    public void setDurationYears(Integer durationYears) { this.durationYears = durationYears; }

    public Integer getTotalSemesters() { return totalSemesters; }
    public void setTotalSemesters(Integer totalSemesters) { this.totalSemesters = totalSemesters; }

    public Integer getMaxStudents() { return maxStudents; }
    public void setMaxStudents(Integer maxStudents) { this.maxStudents = maxStudents; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getEnrolledStudents() { return enrolledStudents; }
    public void setEnrolledStudents(Integer enrolledStudents) { this.enrolledStudents = enrolledStudents; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
