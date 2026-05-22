package com.sms.entity.erp;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "semesters")
public class Semester {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Min(1) @Max(12)
    @Column(nullable = false)
    private Integer number;

    @Column(nullable = false, length = 80)
    private String name;

    private Boolean active = true;
}
