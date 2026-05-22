# Professional College ERP Student Management System

## Folder Structure

```text
sms/
  backend_modified/
    src/main/java/com/sms/
      config/                 Security, seed data
      controller/             Auth, dashboard, student, ERP REST controllers
      dto/                    API payloads and dashboard responses
      entity/                 Existing core student entities
      entity/erp/             ERP modules: departments, branches, faculty, subjects, timetable
      repository/             Existing repositories
      repository/erp/         ERP repositories
      security/               JWT filter, user details, token utilities
      service/                Business logic and ERP analytics service
  frontend/
    src/components/           Sidebar, header, layout
    src/pages/                Admin/faculty/student dashboards and ERP workspace
    src/services/api.js       Axios API integration
  database/schema.sql         Complete MySQL DDL
  monitoring/                 Prometheus and Grafana starter assets
  terraform/                  AWS VPC/RDS starter deployment
  Jenkinsfile                 CI build pipeline
```

## Authentication Flow

1. User posts username/password to `POST /api/auth/login`.
2. Backend validates credentials through Spring Security.
3. Backend returns a JWT and role payload.
4. Frontend stores the token in `localStorage` and sends `Authorization: Bearer <token>`.
5. Backend protects APIs with `@PreAuthorize` role rules for `ADMIN`, `FACULTY`, and `STUDENT`.

## Main API Surface

### Core

- `POST /api/auth/login`
- `GET /api/dashboard/stats`
- `GET|POST|PUT|DELETE /api/students`
- `GET|POST|PUT|DELETE /api/courses`
- `POST /api/attendance/bulk`
- `GET /api/attendance/summary/{studentId}`
- `GET|POST|PUT /api/results`
- `GET /api/notifications/my`
- `GET|POST|PUT|DELETE /api/users`

### ERP

- `GET /api/erp/dashboard`
- `GET|POST /api/erp/departments`
- `GET|POST /api/erp/branches`
- `GET|POST /api/erp/semesters`
- `GET|POST /api/erp/subjects`
- `GET|POST /api/erp/faculty`
- `GET|POST /api/erp/assignments`
- `GET|POST /api/erp/timetable`
- `GET|POST /api/erp/attendance-records`
- `GET /api/erp/attendance-report?branchId=&semester=&section=&from=&to=`
- `GET|POST /api/erp/academic-results`
- `GET|POST /api/erp/academic-years`
- `GET /api/erp/fees/student/{studentId}`
- `GET|POST /api/erp/leave-requests`

## UI Screens

- Admin dashboard: analytics cards, charts, recent students, notifications, role panel.
- ERP workspace: real college portal view with admin/faculty/student workflows.
- Analytics page: student status, course capacity, semester distribution.
- Role management: searchable user directory and role summary.
- Existing CRUD screens remain for students, courses, attendance, results, notifications.

## DevOps

- Docker Compose starts MySQL, backend, frontend, Prometheus, and Grafana.
- Actuator exposes `/actuator/health`, `/actuator/metrics`, and `/actuator/prometheus`.
- Jenkinsfile builds backend and frontend artifacts.
- Terraform includes AWS VPC, security group, public subnet, and MySQL RDS starter resources.
