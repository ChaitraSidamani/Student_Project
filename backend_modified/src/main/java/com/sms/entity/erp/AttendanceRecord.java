package com.sms.entity.erp;

import com.sms.entity.Student;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "faculty_id")
    private Faculty markedBy;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "branch_id")
    private Branch branch;

    private Integer semester;
    @Column(length = 10)
    private String section;
    private LocalDate attendanceDate;
    private AttendanceStatus status = AttendanceStatus.PRESENT;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum AttendanceStatus { PRESENT, ABSENT, LATE, EXCUSED }

    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}
