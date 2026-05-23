package com.sms.service;

import com.sms.dto.NotificationResponse;
import com.sms.entity.Attendance;
import com.sms.entity.Notification;
import com.sms.entity.Result;
import com.sms.entity.Student;
import com.sms.entity.User;
import com.sms.repository.AttendanceRepository;
import com.sms.repository.NotificationRepository;
import com.sms.repository.ResultRepository;
import com.sms.repository.StudentRepository;
import com.sms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private ResultRepository resultRepository;

    public List<NotificationResponse> getMyNotifications() {
        User currentUser = getCurrentUser();
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(currentUser);
        if (notifications.isEmpty() && currentUser.getRole() == User.Role.STUDENT) {
            createStudentNotificationsIfMissing(currentUser);
            notifications = notificationRepository.findByUserOrderByCreatedAtDesc(currentUser);
        }
        return notifications.stream()
            .map(n -> NotificationResponse.from(n))
            .collect(Collectors.toList());
    }

    public List<NotificationResponse> getUnreadNotifications() {
        User currentUser = getCurrentUser();
        return notificationRepository.findByUserAndReadOrderByCreatedAtDesc(currentUser, false).stream()
            .map(n -> NotificationResponse.from(n))
            .collect(Collectors.toList());
    }

    public long getUnreadCount() {
        User currentUser = getCurrentUser();
        return notificationRepository.countUnreadNotifications(currentUser);
    }

    public void markAsRead(@NonNull Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    public void markAllAsRead() {
        User currentUser = getCurrentUser();
        List<Notification> unreadNotifications = notificationRepository.findByUserAndReadOrderByCreatedAtDesc(currentUser, false);
        LocalDateTime now = LocalDateTime.now();
        unreadNotifications.forEach(notif -> {
            notif.setRead(true);
            notif.setReadAt(now);
        });
        notificationRepository.saveAll(unreadNotifications);
    }

    public void deleteNotification(@NonNull Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    public void deleteAllRead() {
        User currentUser = getCurrentUser();
        notificationRepository.deleteByUserAndRead(currentUser, true);
    }

    public Notification createNotification(@NonNull User user, @NonNull String title, 
                                          @NonNull String message, @NonNull Notification.NotificationType type) {
        Notification notification = new Notification(user, title, message, type);
        return notificationRepository.save(notification);
    }

    public Notification createNotification(@NonNull User user, @NonNull String title, 
                                          @NonNull String message, @NonNull Notification.NotificationType type,
                                          Long relatedId, Notification.RelatedEntityType relatedEntityType) {
        Notification notification = new Notification(user, title, message, type);
        notification.setRelatedId(relatedId);
        notification.setRelatedEntityType(relatedEntityType);
        return notificationRepository.save(notification);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Current user not found"));
    }

    private void createStudentNotificationsIfMissing(User studentUser) {
        Student student = studentRepository.findByUserId(studentUser.getId())
                .or(() -> studentRepository.findByRollNumber(studentUser.getUsername()))
                .orElse(null);
        if (student == null) {
            return;
        }

        createNotification(
                studentUser,
                "Welcome to your student portal",
                "Your profile, attendance, results and academic alerts are available here.",
                Notification.NotificationType.SYSTEM_MESSAGE,
                student.getId(),
                Notification.RelatedEntityType.STUDENT
        );

        List<Result> results = resultRepository.findByStudentId(student.getId());
        if (!results.isEmpty()) {
            createNotification(
                    studentUser,
                    "Results published",
                    "You have " + results.size() + " result record" + (results.size() == 1 ? "" : "s") + " available in My Results.",
                    Notification.NotificationType.RESULT,
                    student.getId(),
                    Notification.RelatedEntityType.RESULT
            );
        }

        List<Attendance> attendance = attendanceRepository.findByStudentId(student.getId());
        if (!attendance.isEmpty()) {
            long present = attendance.stream().filter(record -> record.getStatus() == Attendance.AttendanceStatus.PRESENT).count();
            double percentage = Math.round((present * 1000.0) / attendance.size()) / 10.0;
            createNotification(
                    studentUser,
                    percentage < 75 ? "Attendance warning" : "Attendance updated",
                    "Your current attendance is " + percentage + "% based on " + attendance.size() + " marked class" + (attendance.size() == 1 ? "" : "es") + ".",
                    Notification.NotificationType.ATTENDANCE,
                    student.getId(),
                    Notification.RelatedEntityType.ATTENDANCE
            );
        }
    }
}
