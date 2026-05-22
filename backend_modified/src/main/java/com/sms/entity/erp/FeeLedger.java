package com.sms.entity.erp;

import com.sms.entity.Student;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "fee_details")
public class FeeLedger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(length = 20)
    private String academicYear;
    private Integer semester;
    private BigDecimal totalFee = BigDecimal.ZERO;
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal dueAmount = BigDecimal.ZERO;
    private LocalDate dueDate;
    private FeeStatus status = FeeStatus.PENDING;

    public enum FeeStatus { PAID, PARTIAL, PENDING, OVERDUE }
}
