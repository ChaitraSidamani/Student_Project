package com.sms.dto.erp;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class ErpDashboardResponse {
    private Map<String, Object> cards;
    private List<Map<String, Object>> departmentWiseStudents;
    private List<Map<String, Object>> attendanceAnalytics;
    private List<Map<String, Object>> semesterResultAnalytics;
    private List<Map<String, Object>> notifications;
    private List<Map<String, Object>> studentDirectory;
    private List<Map<String, Object>> facultyDirectory;
    private List<Map<String, Object>> topPerformingStudents;
    private List<Map<String, Object>> failedStudents;
    private List<Map<String, Object>> facultyWorkload;
    private List<Map<String, Object>> upcomingExams;
    private List<Map<String, Object>> attendanceViews;
    private List<Map<String, Object>> resultViews;
    private List<Map<String, Object>> adminCanAdd;
    private List<Map<String, Object>> erpFeatures;
    private List<String> moduleStructure;
}
