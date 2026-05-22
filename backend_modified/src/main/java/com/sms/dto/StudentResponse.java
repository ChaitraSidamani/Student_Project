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
    private Student.Gender gender;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Integer semester;
    private String section;
    private String academicYear;
    private String photoUrl;
    private boolean subjectRegistrationAllowed;
    private String registeredSubjects;
    private Student.Status status;
    private LocalDateTime createdAt;

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
        r.setGender(s.getGender());
        r.setSemester(s.getSemester());
        r.setStatus(s.getStatus());
        r.setCreatedAt(s.getCreatedAt());
        if (s.getCourse() != null) {
            r.setCourseId(s.getCourse().getId());
            r.setCourseName(s.getCourse().getName());
            r.setCourseCode(s.getCourse().getCode());
        }
        r.setSection(s.getSection());
        r.setAcademicYear(s.getAcademicYear());
        r.setPhotoUrl(s.getPhotoUrl());
        r.setSubjectRegistrationAllowed(s.isSubjectRegistrationAllowed());
        r.setRegisteredSubjects(s.getRegisteredSubjects());
        return r;
    }

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

    public Student.Gender getGender() { return gender; }
    public void setGender(Student.Gender gender) { this.gender = gender; }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

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

    public String getRegisteredSubjects() { return registeredSubjects; }
    public void setRegisteredSubjects(String registeredSubjects) { this.registeredSubjects = registeredSubjects; }

    public Student.Status getStatus() { return status; }
    public void setStatus(Student.Status status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
