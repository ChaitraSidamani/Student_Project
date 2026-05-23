package com.sms.dto;

import com.sms.entity.Result;
import jakarta.validation.constraints.*;

public class ResultRequest {
    @NotNull private Long studentId;
    @NotBlank private String subject;
    @NotNull private Integer semester;
    @NotNull private Result.ExamType examType;
    @NotNull @Min(0) private Double marksObtained;
    @NotNull @Min(1) private Double maxMarks;
    private String remarks;

    public ResultRequest() {}

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

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

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
