package com.sms.config;

import com.sms.entity.User;
import com.sms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedDemoData();
    }

    public void seedDemoData() {
        saveUser("admin", "admin123", "ERP Administrator", "admin@atriaerp.edu", "9000000001", User.Role.ADMIN);

        System.out.println("=== College ERP Startup Complete ===");
        System.out.println("Admin login: admin / admin123");
        System.out.println("No predefined courses are created. Existing academic data is preserved.");
    }

    private User saveUser(String username, String password, String fullName, String email, String phone, User.Role role) {
        if (userRepository.existsByUsername(username)) {
            return userRepository.findByUsername(username).orElseThrow();
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setRole(role);
        user.setActive(true);
        return userRepository.save(user);
    }
}
