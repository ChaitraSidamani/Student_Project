package com.sms.dto;

import java.util.ArrayList;
import java.util.List;

public class StudentAnalyticsResponse {
    private long totalStudents;
    private long activeStudents;
    private double averageAttendance;
    private double passPercentage;
    private long lowAttendanceCount;
    private List<MetricRow> departmentCounts = new ArrayList<>();
    private List<MetricRow> attendanceByDepartment = new ArrayList<>();
    private List<MetricRow> passPercentageByDepartment = new ArrayList<>();
    private List<LowAttendanceAlert> lowAttendanceAlerts = new ArrayList<>();

    public static class MetricRow {
        private String label;
        private double value;

        public MetricRow() {}
        public MetricRow(String label, double value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public double getValue() { return value; }
        public void setValue(double value) { this.value = value; }
    }

    public static class LowAttendanceAlert {
        private Long studentId;
        private String studentName;
        private String rollNumber;
        private String courseCode;
        private double attendancePercentage;

        public LowAttendanceAlert() {}
        public LowAttendanceAlert(Long studentId, String studentName, String rollNumber, String courseCode, double attendancePercentage) {
            this.studentId = studentId;
            this.studentName = studentName;
            this.rollNumber = rollNumber;
            this.courseCode = courseCode;
            this.attendancePercentage = attendancePercentage;
        }

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }
        public String getStudentName() { return studentName; }
        public void setStudentName(String studentName) { this.studentName = studentName; }
        public String getRollNumber() { return rollNumber; }
        public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }
        public String getCourseCode() { return courseCode; }
        public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
        public double getAttendancePercentage() { return attendancePercentage; }
        public void setAttendancePercentage(double attendancePercentage) { this.attendancePercentage = attendancePercentage; }
    }

    public long getTotalStudents() { return totalStudents; }
    public void setTotalStudents(long totalStudents) { this.totalStudents = totalStudents; }
    public long getActiveStudents() { return activeStudents; }
    public void setActiveStudents(long activeStudents) { this.activeStudents = activeStudents; }
    public double getAverageAttendance() { return averageAttendance; }
    public void setAverageAttendance(double averageAttendance) { this.averageAttendance = averageAttendance; }
    public double getPassPercentage() { return passPercentage; }
    public void setPassPercentage(double passPercentage) { this.passPercentage = passPercentage; }
    public long getLowAttendanceCount() { return lowAttendanceCount; }
    public void setLowAttendanceCount(long lowAttendanceCount) { this.lowAttendanceCount = lowAttendanceCount; }
    public List<MetricRow> getDepartmentCounts() { return departmentCounts; }
    public void setDepartmentCounts(List<MetricRow> departmentCounts) { this.departmentCounts = departmentCounts; }
    public List<MetricRow> getAttendanceByDepartment() { return attendanceByDepartment; }
    public void setAttendanceByDepartment(List<MetricRow> attendanceByDepartment) { this.attendanceByDepartment = attendanceByDepartment; }
    public List<MetricRow> getPassPercentageByDepartment() { return passPercentageByDepartment; }
    public void setPassPercentageByDepartment(List<MetricRow> passPercentageByDepartment) { this.passPercentageByDepartment = passPercentageByDepartment; }
    public List<LowAttendanceAlert> getLowAttendanceAlerts() { return lowAttendanceAlerts; }
    public void setLowAttendanceAlerts(List<LowAttendanceAlert> lowAttendanceAlerts) { this.lowAttendanceAlerts = lowAttendanceAlerts; }
}
