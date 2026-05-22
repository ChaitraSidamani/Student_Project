# 🎓 Student Management System (SMS) - EduTrack

A comprehensive, production-ready Student Management System built with **Spring Boot 3.3** (Backend) and **React 18 + Vite** (Frontend).

## 🌟 Features

### Core Features
- ✅ **User Authentication & Authorization** - JWT-based authentication with role-based access control
- ✅ **Student Management** - Complete CRUD operations for student records
- ✅ **Course Management** - Create, update, and manage courses
- ✅ **Attendance Tracking** - Mark attendance (single & bulk), view attendance reports
- ✅ **Result Management** - Record student results, calculate grades and percentages
- ✅ **Notifications** - Real-time notifications for important events
- ✅ **Dashboard** - Analytics and statistics for administrators
- ✅ **User Profiles** - Manage user profiles for students, faculty, and admin

### User Roles
- **ADMIN** - Full system access, manage users and courses
- **FACULTY** - Mark attendance, record results, view student data
- **STUDENT** - View own profile, results, attendance, and notifications

## 🏗️ Project Structure

```
sms/
├── backend_modified/          # Spring Boot Backend (Java 21)
│   ├── src/main/java/com/sms/
│   │   ├── entity/            # JPA Entities (Student, Course, User, Attendance, Result, Notification)
│   │   ├── dto/               # DTOs (Request/Response objects)
│   │   ├── service/           # Business Logic Services
│   │   ├── controller/        # REST API Controllers
│   │   ├── repository/        # Spring Data JPA Repositories
│   │   ├── config/            # Configuration (Security, Data Init)
│   │   ├── security/          # JWT & Security classes
│   │   └── exception/         # Global Exception Handler
│   ├── src/main/resources/
│   │   └── application.properties  # Configuration
│   ├── pom.xml               # Maven Dependencies
│   ├── Dockerfile
│   └── README.md
└── frontend/                  # React 18 + Vite Frontend
    ├── src/
    │   ├── pages/            # Page Components
    │   ├── components/       # Reusable Components
    │   ├── services/         # API Integration (axios)
    │   ├── context/          # React Context API
    │   ├── hooks/            # Custom Hooks
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── package.json
    ├── vite.config.js
    ├── nginx.conf
    ├── Dockerfile
    └── README.md
```

## 🚀 Quick Start

### Backend Setup (Spring Boot)

```bash
# Navigate to backend directory
cd backend_modified

# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

Backend will be available at: `http://localhost:8082`

**Default Database:** MySQL on `localhost:3306`
- Database: `sms_db` (auto-created)
- Username: `root`
- Password: `root`

### Frontend Setup (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## 🔐 Default Credentials

After application starts, use these credentials:

| Role   | Username   | Password   | Access Level |
|--------|-----------|-----------|-------------|
| Admin  | admin | admin123 | Full system access |
| Faculty| faculty1 | faculty123 | Manage attendance, results |
| Faculty| faculty2 | faculty123 | Manage attendance, results |
| Student| BTECH0001 | student123 | View own profile, results |
| Student| BTECH0002 | student123 | View own profile, results |
| Student| BCA0001 | student123 | View own profile, results |

*15 sample students are auto-created with course assignments*

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login              Login with credentials
```

### Students
```
GET    /api/students                Get all students
GET    /api/students/{id}           Get student by ID
GET    /api/students/profile        Get current user's profile
POST   /api/students                Create new student (ADMIN)
PUT    /api/students/{id}           Update student (ADMIN/FACULTY)
DELETE /api/students/{id}           Delete student (ADMIN)
```

### Courses
```
GET    /api/courses                 Get all courses
GET    /api/courses/{id}            Get course by ID
GET    /api/courses/code/{code}     Get course by code
GET    /api/courses/active/list     Get active courses only
POST   /api/courses                 Create course (ADMIN)
PUT    /api/courses/{id}            Update course (ADMIN)
DELETE /api/courses/{id}            Delete course (ADMIN)
POST   /api/courses/{id}/activate   Activate course (ADMIN)
POST   /api/courses/{id}/deactivate Deactivate course (ADMIN)
```

### Attendance
```
POST   /api/attendance/mark         Mark single attendance
POST   /api/attendance/bulk         Bulk mark attendance
GET    /api/attendance/student/{id} Get student attendance records
GET    /api/attendance/summary/{id} Get attendance summary
```

### Results
```
POST   /api/results                 Record new result
GET    /api/results/student/{id}    Get all student results
GET    /api/results/student/{id}/semester/{sem}  Get semester results
GET    /api/results/report/{id}     Get result report
GET    /api/results/my              Get current student's results
```

### Notifications
```
GET    /api/notifications           Get all notifications
GET    /api/notifications/unread    Get unread notifications
GET    /api/notifications/unread-count  Get unread count
POST   /api/notifications/{id}/read Mark notification as read
POST   /api/notifications/mark-all-read Mark all as read
DELETE /api/notifications/{id}      Delete notification
DELETE /api/notifications/delete-read   Delete all read notifications
```

### Users (Admin only)
```
GET    /api/users                   Get all users
POST   /api/users                   Create new user (ADMIN)
PUT    /api/users/{id}              Update user (ADMIN)
DELETE /api/users/{id}              Delete user (ADMIN)
```

### Dashboard
```
GET    /api/dashboard/stats         Get dashboard statistics
```

## 🗄️ Database Schema

### Tables Overview

**users** - User authentication & authorization
```
id, username (unique), password (encrypted), fullName, email (unique), phone, 
role (ADMIN/FACULTY/STUDENT), active, createdAt, updatedAt
```

**students** - Student information
```
id, rollNumber (unique), firstName, lastName, email (unique), phone, address, 
dateOfBirth, gender, course_id (FK), semester, bloodGroup, guardianName, 
guardianPhone, user_id (FK), status, createdAt, updatedAt
```

**courses** - Academic courses
```
id, code (unique), name, description, durationYears, totalSemesters, 
maxStudents, status, createdAt
```

**attendance** - Class attendance records
```
id, student_id (FK), markedBy_id (FK), subject, date, status (PRESENT/ABSENT), createdAt
```

**results** - Student academic results
```
id, student_id (FK), marks, percentage, grade, examType, semester, 
recordedBy_id (FK), createdAt
```

**notifications** - User notifications
```
id, user_id (FK), title, message, type, read, relatedId, 
relatedEntityType, createdAt, readAt
```

## 🔧 Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Java | 21 LTS | Programming Language |
| Spring Boot | 3.3.0 | Web Framework |
| Spring Data JPA | 3.3.0 | ORM & Database Access |
| Spring Security | 3.3.0 | Authentication & Authorization |
| JWT (jjwt) | 0.12.5 | Token-based Authentication |
| MySQL | 8.0+ | Database |
| Maven | 3.6+ | Build Tool |
| Lombok | Latest | Reduce Boilerplate |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2.0 | UI Framework |
| Vite | 5.0.8 | Build Tool |
| React Router | 6.21.0 | Client-side Routing |
| Axios | 1.6.2 | HTTP Client |
| Recharts | 2.10.3 | Charts & Graphs |
| Lucide React | 0.303.0 | Icon Library |
| React Hot Toast | 2.4.1 | Notifications |
| date-fns | 3.0.6 | Date Utilities |

## 🔒 Security Features

- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Role-Based Access Control** - RBAC with three roles (ADMIN, FACULTY, STUDENT)
- ✅ **Password Encryption** - BCrypt password hashing
- ✅ **CORS Configuration** - Controlled cross-origin requests
- ✅ **Input Validation** - Server-side validation on all endpoints
- ✅ **SQL Injection Protection** - Parameterized queries via JPA
- ✅ **Stateless Authentication** - No server-side sessions needed
- ✅ **Global Exception Handling** - Consistent error responses

## 📊 Features in Detail

### Attendance Management
- Mark attendance for individual students
- Bulk mark attendance for entire classes
- Attendance summary with statistics
- Attendance percentage tracking
- Daily attendance records

### Result Management
- Record marks for multiple exam types
- Automatic grade calculation (A, B, C, D, F)
- Percentage calculation
- Semester-wise results
- Result reports with analysis
- GPA tracking

### Student Profile
- View/edit personal information
- Course and semester details
- Contact information
- Academic status

### Dashboard (Admin)
- Total students, courses, users count
- Attendance statistics
- Result statistics
- Recent activities

## 🚢 Deployment

### Docker Support

**Build Backend Image:**
```bash
cd backend_modified
docker build -f Dockerfile -t sms-backend:1.0 .
docker run -p 8082:8082 sms-backend:1.0
```

**Build Frontend Image:**
```bash
cd frontend
docker build -f Dockerfile -t sms-frontend:1.0 .
docker run -p 80:80 sms-frontend:1.0
```

**Docker Compose (Full Stack):**
```bash
docker-compose up
```

## 🧪 Testing

### Test Scenarios

**1. Login Test**
- Use admin/admin123
- Use faculty1/faculty123
- Use BTECH0001/student123

**2. Student Management**
- Create new student
- Update student details
- View student profile
- Delete student

**3. Attendance**
- Mark attendance
- View attendance records
- Check attendance percentage

**4. Results**
- Add result
- View results by semester
- Generate report

## 📝 Configuration

### Backend (application.properties)
```properties
server.port=8082
spring.datasource.url=jdbc:mysql://localhost:3306/sms_db
spring.datasource.username=root
spring.datasource.password=root
spring.jpa.hibernate.ddl-auto=create
app.jwt.secret=YOUR_SECRET_KEY_HERE
app.jwt.expiration=86400000
```

### Frontend (.env - optional)
```
VITE_API_URL=http://localhost:8082
```

## 🐛 Error Handling

### HTTP Status Codes
- **200 OK** - Successful request
- **201 Created** - Resource created
- **400 Bad Request** - Invalid input
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

### Response Format
```json
{
  "success": true/false,
  "message": "Description",
  "data": {}
}
```

## 🎯 Future Enhancements

- [ ] Email notifications integration
- [ ] SMS notifications
- [ ] Advanced reporting and analytics
- [ ] Mobile app
- [ ] Multi-tenancy support
- [ ] Payment integration for fees
- [ ] Document management system
- [ ] Parent portal
- [ ] Live class integration
- [ ] Assessment module

## 📞 Support & Documentation

- Backend README: `backend_modified/README.md`
- Frontend README: `frontend/README.md`
- API Documentation: Available at `http://localhost:8082/swagger-ui.html` (if Swagger is added)

## 📄 License

This project is an educational initiative developed for learning purposes.

## 👨‍💻 Development Team

Developed as a comprehensive demonstration of full-stack web development using modern technologies.

---

**Project Status:** ✅ Production Ready  
**Last Updated:** May 2026  
**Version:** 1.0.0  
**Java Version:** 21  
**Spring Boot Version:** 3.3.0  
**React Version:** 18.2.0
