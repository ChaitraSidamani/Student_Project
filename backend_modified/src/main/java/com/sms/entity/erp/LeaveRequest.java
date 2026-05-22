package com.sms.entity.erp;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "leave_requests")
public class LeaveRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    private LocalDate fromDate;
    private LocalDate toDate;
    @Column(length = 300)
    private String reason;
    private LeaveStatus status = LeaveStatus.PENDING;
    @Column(length = 300)
    private String remarks;

    public enum LeaveStatus { PENDING, APPROVED, REJECTED }
}
