CREATE DATABASE IF NOT EXISTS sms_db;
USE smsdb;

CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(150)
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15),
  role ENUM('ADMIN','FACULTY','STUDENT') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE departments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  hod_name VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE branches (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  department_id BIGINT,
  duration_semesters INT DEFAULT 8,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_branches_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE semesters (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  number INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  duration_years INT,
  total_semesters INT,
  credits INT,
  status VARCHAR(30),
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE subjects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  branch_id BIGINT,
  semester_id BIGINT,
  credits INT DEFAULT 4,
  type ENUM('THEORY','LAB','PROJECT','ELECTIVE') DEFAULT 'THEORY',
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_subject_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_subject_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

CREATE TABLE faculty (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(15),
  designation VARCHAR(100),
  department_id BIGINT,
  user_id BIGINT,
  joining_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_faculty_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_faculty_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE students (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  roll_number VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15),
  address VARCHAR(200),
  date_of_birth DATE,
  gender ENUM('MALE','FEMALE','OTHER'),
  course_id BIGINT NOT NULL,
  branch_id BIGINT,
  semester INT NOT NULL,
  section VARCHAR(10),
  academic_year VARCHAR(20),
  user_id BIGINT,
  status ENUM('ACTIVE','INACTIVE','GRADUATED','SUSPENDED') DEFAULT 'ACTIVE',
  blood_group VARCHAR(5),
  guardian_name VARCHAR(100),
  guardian_phone VARCHAR(15),
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_student_course FOREIGN KEY (course_id) REFERENCES courses(id),
  CONSTRAINT fk_student_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_students_roll_number ON students(roll_number);
CREATE INDEX idx_students_course_semester ON students(course_id, semester);
CREATE INDEX idx_students_section_year ON students(section, academic_year);
CREATE INDEX idx_students_status ON students(status);

CREATE TABLE faculty_subject_assignments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  faculty_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  branch_id BIGINT,
  semester INT,
  section VARCHAR(10),
  academic_year VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_assign_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  CONSTRAINT fk_assign_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_assign_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE attendance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  subject VARCHAR(120),
  attendance_date DATE,
  status VARCHAR(30),
  remarks TEXT,
  created_at DATETIME,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE attendance_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  subject_id BIGINT,
  faculty_id BIGINT,
  branch_id BIGINT,
  semester INT,
  section VARCHAR(10),
  attendance_date DATE,
  status ENUM('PRESENT','ABSENT','LATE','EXCUSED') DEFAULT 'PRESENT',
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_att_record_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_att_record_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_att_record_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  CONSTRAINT fk_att_record_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE results (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  subject VARCHAR(120) NOT NULL,
  exam_type VARCHAR(30) NOT NULL,
  marks_obtained DECIMAL(6,2) NOT NULL,
  max_marks DECIMAL(6,2) NOT NULL,
  grade VARCHAR(5),
  semester INT,
  entered_by BIGINT,
  remarks TEXT,
  exam_date DATE,
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_results_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_results_entered_by FOREIGN KEY (entered_by) REFERENCES users(id),
  CONSTRAINT uq_results_student_subject_exam_sem UNIQUE (student_id, subject, exam_type, semester)
);

CREATE TABLE marks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  subject_id BIGINT,
  faculty_id BIGINT,
  semester INT NOT NULL,
  academic_year VARCHAR(20),
  exam_type ENUM('INTERNAL','MIDTERM','FINAL','ASSIGNMENT','PRACTICAL') NOT NULL,
  internal_marks DECIMAL(6,2) DEFAULT 0,
  external_marks DECIMAL(6,2) DEFAULT 0,
  total_marks DECIMAL(6,2) DEFAULT 0,
  max_marks DECIMAL(6,2) DEFAULT 100,
  grade VARCHAR(5),
  result_status ENUM('PASS','FAIL','BACKLOG','WITHHELD') DEFAULT 'PASS',
  published BOOLEAN DEFAULT FALSE,
  created_at DATETIME,
  updated_at DATETIME,
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_marks_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id)
);

CREATE TABLE academic_results (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  subject_id BIGINT,
  semester INT,
  academic_year VARCHAR(20),
  internal_marks INT DEFAULT 0,
  external_marks INT DEFAULT 0,
  total_marks INT DEFAULT 0,
  grade VARCHAR(5),
  status ENUM('PASS','FAIL','BACKLOG','WITHHELD') DEFAULT 'PASS',
  sgpa DOUBLE,
  cgpa DOUBLE,
  CONSTRAINT fk_academic_result_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_academic_result_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE timetable (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  branch_id BIGINT,
  subject_id BIGINT,
  faculty_id BIGINT,
  semester INT,
  section VARCHAR(10),
  day_of_week VARCHAR(20),
  start_time TIME,
  end_time TIME,
  room_number VARCHAR(50),
  academic_year VARCHAR(20),
  CONSTRAINT fk_timetable_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_timetable_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_timetable_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id)
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  message TEXT,
  type VARCHAR(30),
  target_role VARCHAR(30),
  related_entity_type VARCHAR(50),
  related_entity_id BIGINT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME
);

CREATE TABLE academic_years (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE,
  end_date DATE,
  current_year BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE fee_details (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  academic_year VARCHAR(20),
  semester INT,
  total_fee DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  due_amount DECIMAL(12,2) DEFAULT 0,
  due_date DATE,
  status ENUM('PAID','PARTIAL','PENDING','OVERDUE') DEFAULT 'PENDING',
  CONSTRAINT fk_fee_student FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX idx_students_search_name ON students(first_name, last_name);
CREATE INDEX idx_students_roll_lookup ON students(roll_number);
CREATE INDEX idx_students_erp_filters ON students(course_id, semester, section, academic_year, status);
CREATE INDEX idx_attendance_reporting ON attendance(student_id, subject, attendance_date, status);
CREATE INDEX idx_results_reporting ON results(student_id, subject, semester, exam_type);
CREATE INDEX idx_marks_reporting ON marks(student_id, subject_id, semester, academic_year, exam_type, result_status);
CREATE INDEX idx_attendance_records_filters ON attendance_records(branch_id, semester, section, attendance_date, status);
