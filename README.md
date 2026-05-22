# EduTrack — Student Management System
## Spring Boot + React Full Stack Application

---

## Project Structure

```
sms/
├── backend/          # Spring Boot 3.2 REST API
│   ├── pom.xml
│   └── src/main/java/com/sms/
│       ├── entity/           # JPA Entities
│       ├── repository/       # Spring Data Repositories
│       ├── service/          # Business Logic
│       ├── controller/       # REST Controllers
│       ├── dto/              # Data Transfer Objects
│       ├── security/         # JWT Auth
│       └── config/           # Security & Data Init
└── frontend/         # React 18 + Vite
    └── src/
        ├── pages/            # Dashboard, Students, Courses, Attendance, Results
        ├── components/       # Shared Layout / Sidebar
        ├── context/          # AuthContext
        └── services/         # API layer (axios)
```

---

## Modules Implemented

### 1. Admin Module
- Login with JWT authentication
- Role-based access (ADMIN / FACULTY / STUDENT)
- Manage students, faculty, courses
- Full audit trail via timestamps

### 2. Student Management Module
- Add / Edit / Delete / View student profiles
- Fields: Name, Roll Number, Email, Phone, Course, Semester, Gender, DOB, Address
- Status tracking: Active / Inactive / Graduated / Suspended
- Search & filter

### 3. Attendance Management Module
- Mark attendance per course per subject per date
- Bulk mark (entire class at once)
- Statuses: Present / Absent
- Subject-wise attendance percentage reports
- 75% threshold warning

### 4. Result Management Module
- Enter marks for Internal / Midterm / Final / Assignment / Practical
- Auto grade computation (O / A+ / A / B+ / B / C / F)
- Subject-wise performance bar chart
- Semester-wise result grouping
- Overall performance report

---

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Backend    | Spring Boot 3.2, Spring Security, Spring JPA  |
| Database   | H2 (dev) / MySQL (prod)                       |
| Auth       | JWT (jjwt 0.11.5)                             |
| Frontend   | React 18, Vite, React Router v6               |
| Charts     | Recharts                                      |
| HTTP       | Axios                                         |
| Fonts      | DM Sans + Space Mono (Google Fonts)           |

---

## Quick Start

### Backend

```bash
cd backend
./mvnw spring-boot:run
# Runs on http://localhost:8080
# H2 Console: http://localhost:8080/h2-console
```

**For MySQL production:**
Edit `src/main/resources/application.properties`:
```properties
# Comment out H2 lines, uncomment MySQL lines
spring.datasource.url=jdbc:mysql://localhost:3306/sms_db?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## Default Credentials (auto-seeded)

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Admin   | admin     | admin123    |
| Faculty | faculty1  | faculty123  |
| Faculty | faculty2  | faculty123  |

---

## API Endpoints

### Auth
| Method | Endpoint        | Description     |
|--------|-----------------|-----------------|
| POST   | /api/auth/login | Login → JWT     |

### Students
| Method | Endpoint              | Role         |
|--------|-----------------------|--------------|
| GET    | /api/students         | ALL          |
| POST   | /api/students         | ADMIN        |
| PUT    | /api/students/{id}    | ADMIN/FACULTY|
| DELETE | /api/students/{id}    | ADMIN        |

### Courses
| Method | Endpoint           | Role  |
|--------|--------------------|-------|
| GET    | /api/courses       | ALL   |
| POST   | /api/courses       | ADMIN |
| PUT    | /api/courses/{id}  | ADMIN |
| DELETE | /api/courses/{id}  | ADMIN |

### Attendance
| Method | Endpoint                        | Role         |
|--------|---------------------------------|--------------|
| POST   | /api/attendance                 | ADMIN/FACULTY|
| POST   | /api/attendance/bulk            | ADMIN/FACULTY|
| GET    | /api/attendance/student/{id}    | ALL          |
| GET    | /api/attendance/summary/{id}    | ALL          |

### Results
| Method | Endpoint                                 | Role         |
|--------|------------------------------------------|--------------|
| POST   | /api/results                             | ADMIN/FACULTY|
| GET    | /api/results/student/{id}               | ALL          |
| GET    | /api/results/student/{id}/semester/{sem}| ALL          |
| GET    | /api/results/report/{id}                | ALL          |
| PUT    | /api/results/{id}                        | ADMIN/FACULTY|

### Dashboard
| Method | Endpoint            | Description         |
|--------|---------------------|---------------------|
| GET    | /api/dashboard/stats| Summary statistics  |

---

## Architecture Flow

```
React Frontend (port 3000)
    ↓ HTTP + JWT Bearer Token
Spring Boot API (port 8085)
    ↓ JPA / Hibernate
MySQL / H2 Database
```

**Security Flow:**
```
Login → AuthController → AuthenticationManager
     → BCrypt password check → JWT generated
     → All subsequent requests: AuthTokenFilter validates JWT
     → SecurityContext populated → @PreAuthorize enforced
```

---

## Grade Scale

| Grade | Percentage  |
|-------|-------------|
| O     | 90% – 100%  |
| A+    | 80% – 89%   |
| A     | 70% – 79%   |
| B+    | 60% – 69%   |
| B     | 50% – 59%   |
| C     | 40% – 49%   |
| F     | Below 40%   |
