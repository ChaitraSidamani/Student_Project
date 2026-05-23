package com.sms.dto;

import java.util.Map;
import com.sms.entity.Notification;

public class NotificationResponse {

    private Long id;
    private String title;
    private String message;
    private String type;
    private String link;
    private Map<String, Object> meta;
    private String emailSubject;
    private String emailBody;
    private boolean read;
    private String createdAt;

    public NotificationResponse() {}

    public NotificationResponse(String title, String message, String link, String type, Map<String, Object> meta,
                                String emailSubject, String emailBody) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.link = link;
        this.meta = meta;
        this.emailSubject = emailSubject;
        this.emailBody = emailBody;
    }

    public static NotificationResponse from(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setTitle(notification.getTitle());
        response.setMessage(notification.getMessage());
        response.setType(notification.getType().toString());
        response.setLink(linkFor(notification));
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString());
        response.setEmailSubject(notification.getTitle());
        response.setEmailBody(notification.getMessage());
        return response;
    }

    private static String linkFor(Notification notification) {
        if (notification.getType() == Notification.NotificationType.RESULT) return "/my-results";
        if (notification.getType() == Notification.NotificationType.ATTENDANCE) return "/my-attendance";
        if (notification.getRelatedEntityType() == Notification.RelatedEntityType.STUDENT) return "/profile";
        return null;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public Map<String, Object> getMeta() { return meta; }
    public void setMeta(Map<String, Object> meta) { this.meta = meta; }

    public String getEmailSubject() { return emailSubject; }
    public void setEmailSubject(String emailSubject) { this.emailSubject = emailSubject; }

    public String getEmailBody() { return emailBody; }
    public void setEmailBody(String emailBody) { this.emailBody = emailBody; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
