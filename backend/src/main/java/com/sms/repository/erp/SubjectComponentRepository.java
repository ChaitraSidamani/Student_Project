package com.sms.repository.erp;

import com.sms.entity.erp.SubjectComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SubjectComponentRepository extends JpaRepository<SubjectComponent, Long> {
    List<SubjectComponent> findBySubjectIdAndActiveTrueOrderBySequenceAscIdAsc(Long subjectId);

    @Modifying
    @Query("UPDATE SubjectComponent c SET c.active = false WHERE c.subject.id = :subjectId")
    void deactivateBySubjectId(@Param("subjectId") Long subjectId);
}
