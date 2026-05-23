package com.sms.dto;

import java.util.List;

public class StudentFilterOptionsResponse {
    private List<String> sections;
    private List<String> academicYears;
    private List<SubjectOption> subjects;

    public StudentFilterOptionsResponse() {}

    public StudentFilterOptionsResponse(List<String> sections, List<String> academicYears) {
        this.sections = sections;
        this.academicYears = academicYears;
    }

    public StudentFilterOptionsResponse(List<String> sections, List<String> academicYears, List<SubjectOption> subjects) {
        this.sections = sections;
        this.academicYears = academicYears;
        this.subjects = subjects;
    }

    public List<String> getSections() { return sections; }
    public void setSections(List<String> sections) { this.sections = sections; }
    public List<String> getAcademicYears() { return academicYears; }
    public void setAcademicYears(List<String> academicYears) { this.academicYears = academicYears; }
    public List<SubjectOption> getSubjects() { return subjects; }
    public void setSubjects(List<SubjectOption> subjects) { this.subjects = subjects; }

    public static class SubjectOption {
        private Long id;
        private String code;
        private String name;
        private String branchCode;
        private Integer semester;

        public SubjectOption() {}

        public SubjectOption(Long id, String code, String name, String branchCode, Integer semester) {
            this.id = id;
            this.code = code;
            this.name = name;
            this.branchCode = branchCode;
            this.semester = semester;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getBranchCode() { return branchCode; }
        public void setBranchCode(String branchCode) { this.branchCode = branchCode; }
        public Integer getSemester() { return semester; }
        public void setSemester(Integer semester) { this.semester = semester; }
    }
}
