package com.sms.dto;

import jakarta.validation.constraints.*;

public class CourseRequest {

    private String code;

    @NotBlank(message = "Course name is required")
    @Size(min = 3, max = 100, message = "Course name must be between 3 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotNull(message = "Duration in years is required")
    @Min(value = 1, message = "Duration must be at least 1 year")
    @Max(value = 5, message = "Duration cannot exceed 5 years")
    private Integer durationYears;

    @NotNull(message = "Total semesters is required")
    @Min(value = 1, message = "Total semesters must be at least 1")
    @Max(value = 10, message = "Total semesters cannot exceed 10")
    private Integer totalSemesters;

    @NotNull(message = "Max students is required")
    @Min(value = 1, message = "Max students must be at least 1")
    @Max(value = 500, message = "Max students cannot exceed 500")
    private Integer maxStudents;

    public CourseRequest() {}

    public CourseRequest(String code, String name, String description, Integer durationYears, Integer totalSemesters, Integer maxStudents) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.durationYears = durationYears;
        this.totalSemesters = totalSemesters;
        this.maxStudents = maxStudents;
    }

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
}
