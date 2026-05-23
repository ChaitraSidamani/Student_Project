package com.sms.entity.erp;

import com.sms.entity.Student;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "academic_results")
public class AcademicResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_id")
    private Subject subject;

    private Integer semester;
    @Column(length = 20)
    private String academicYear;

    @Min(0) @Max(40)
    private Integer internalMarks = 0;

    @Min(0) @Max(60)
    private Integer externalMarks = 0;

    private Integer totalMarks = 0;
    @Column(length = 5)
    private String grade;
    private ResultStatus status = ResultStatus.PASS;
    private Double sgpa;
    private Double cgpa;

    public enum ResultStatus { PASS, FAIL, BACKLOG, WITHHELD }
}
