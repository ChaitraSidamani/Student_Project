package com.sms.dto;

import com.sms.entity.Result;
import java.time.LocalDateTime;

public class ResultResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String rollNumber;
    private String courseName;
    private String courseCode;
    private String academicYear;
    private String section;
    private String subject;
    private Integer semester;
    private Result.ExamType examType;
    private Double marksObtained;
    private Double maxMarks;
    private Double percentage;
    private String grade;
    private String enteredByName;
    private String remarks;
    private LocalDateTime createdAt;

    public ResultResponse() {}

    public static ResultResponse from(Result res) {
        ResultResponse r = new ResultResponse();
        r.setId(res.getId());
        r.setSubject(res.getSubject());
        r.setSemester(res.getSemester());
        r.setExamType(res.getExamType());
        r.setMarksObtained(res.getMarksObtained());
        r.setMaxMarks(res.getMaxMarks());
        r.setPercentage(res.getPercentage());
        r.setGrade(res.getGrade());
        r.setRemarks(res.getRemarks());
        r.setCreatedAt(res.getCreatedAt());
        if (res.getStudent() != null) {
            r.setStudentId(res.getStudent().getId());
            r.setStudentName(res.getStudent().getFullName());
            r.setRollNumber(res.getStudent().getRollNumber());
            r.setAcademicYear(res.getStudent().getAcademicYear());
            r.setSection(res.getStudent().getSection());
            if (res.getStudent().getCourse() != null) {
                r.setCourseName(res.getStudent().getCourse().getName());
                r.setCourseCode(res.getStudent().getCourse().getCode());
            }
        }
        if (res.getEnteredBy() != null) {
            r.setEnteredByName(res.getEnteredBy().getFullName());
        }
        return r;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public Result.ExamType getExamType() { return examType; }
    public void setExamType(Result.ExamType examType) { this.examType = examType; }

    public Double getMarksObtained() { return marksObtained; }
    public void setMarksObtained(Double marksObtained) { this.marksObtained = marksObtained; }

    public Double getMaxMarks() { return maxMarks; }
    public void setMaxMarks(Double maxMarks) { this.maxMarks = maxMarks; }

    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getEnteredByName() { return enteredByName; }
    public void setEnteredByName(String enteredByName) { this.enteredByName = enteredByName; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
