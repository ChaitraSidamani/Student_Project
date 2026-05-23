package com.sms.entity;

import com.sms.entity.erp.Subject;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Replaces the fragile `registeredSubjects` TEXT column on Student.
 * Each row = one student registered for one subject.
 */
@Entity
@Table(name = "student_subject_registrations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "subject_id"}))
public class StudentSubjectRegistration {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    /** Academic year this registration belongs to, e.g. "2025-26" */
    @Column(length = 20)
    private String academicYear;

    private LocalDateTime registeredAt;

    public StudentSubjectRegistration() {}

    public StudentSubjectRegistration(Student student, Subject subject, String academicYear) {
        this.student = student;
        this.subject = subject;
        this.academicYear = academicYear;
        this.registeredAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (registeredAt == null) registeredAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
