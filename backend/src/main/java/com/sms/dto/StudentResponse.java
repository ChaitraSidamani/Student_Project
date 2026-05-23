package com.sms.dto;

import com.sms.entity.Student;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class StudentResponse {
    private Long id;
    private String rollNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private LocalDate dateOfBirth;
    private String gender;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer semester;
    private String section;
    private String academicYear;
    private String photoUrl;
    private boolean subjectRegistrationAllowed;
    private boolean registrationOpen;
    private String registeredSubjects;
    private String status;
    private String bloodGroup;
    private String guardianName;
    private String guardianPhone;
    private Long userId;
    private String username;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public StudentResponse() {}

    public static StudentResponse from(Student s) {
        StudentResponse r = new StudentResponse();
        r.setId(s.getId());
        r.setRollNumber(s.getRollNumber());
        r.setFirstName(s.getFirstName());
        r.setLastName(s.getLastName());
        r.setFullName(s.getFullName());
        r.setEmail(s.getEmail());
        r.setPhone(s.getPhone());
        r.setAddress(s.getAddress());
        r.setDateOfBirth(s.getDateOfBirth());
        r.setGender(s.getGender() != null ? s.getGender().name() : null);
        if (s.getCourse() != null) {
            r.setCourseId(s.getCourse().getId());
            r.setCourseCode(s.getCourse().getCode());
            r.setCourseName(s.getCourse().getName());
        }
        r.setSemester(s.getSemester());
        r.setSection(s.getSection());
        r.setAcademicYear(s.getAcademicYear());
        r.setPhotoUrl(s.getPhotoUrl());
        r.setSubjectRegistrationAllowed(s.isSubjectRegistrationAllowed());
        r.setRegisteredSubjects(s.getRegisteredSubjects());
        r.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
        r.setBloodGroup(s.getBloodGroup());
        r.setGuardianName(s.getGuardianName());
        r.setGuardianPhone(s.getGuardianPhone());
        if (s.getUser() != null) {
            r.setUserId(s.getUser().getId());
            r.setUsername(s.getUser().getUsername());
        }
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }
    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public boolean isSubjectRegistrationAllowed() { return subjectRegistrationAllowed; }
    public void setSubjectRegistrationAllowed(boolean subjectRegistrationAllowed) { this.subjectRegistrationAllowed = subjectRegistrationAllowed; }
    public boolean isRegistrationOpen() { return registrationOpen; }
    public void setRegistrationOpen(boolean registrationOpen) { this.registrationOpen = registrationOpen; }
    public String getRegisteredSubjects() { return registeredSubjects; }
    public void setRegisteredSubjects(String registeredSubjects) { this.registeredSubjects = registeredSubjects; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }
    public String getGuardianName() { return guardianName; }
    public void setGuardianName(String guardianName) { this.guardianName = guardianName; }
    public String getGuardianPhone() { return guardianPhone; }
    public void setGuardianPhone(String guardianPhone) { this.guardianPhone = guardianPhone; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
