package edu.ciet.erp.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {
    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 5;
    
    private final Map<String, Attempt> attemptsMap = new ConcurrentHashMap<>();

    private static class Attempt {
        int count;
        LocalDateTime lockoutExpiry;

        Attempt(int count, LocalDateTime lockoutExpiry) {
            this.count = count;
            this.lockoutExpiry = lockoutExpiry;
        }
    }

    public boolean isBlocked(String ip) {
        Attempt attempt = attemptsMap.get(ip);
        if (attempt == null) {
            return false;
        }
        if (attempt.lockoutExpiry != null) {
            if (LocalDateTime.now().isBefore(attempt.lockoutExpiry)) {
                return true;
            } else {
                // Lockout expired, reset attempts
                attemptsMap.remove(ip);
                return false;
            }
        }
        return false;
    }

    public void loginFailed(String ip) {
        Attempt attempt = attemptsMap.get(ip);
        if (attempt == null) {
            attemptsMap.put(ip, new Attempt(1, null));
        } else {
            attempt.count++;
            if (attempt.count >= MAX_ATTEMPTS) {
                attempt.lockoutExpiry = LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES);
            }
        }
    }

    public void loginSucceeded(String ip) {
        attemptsMap.remove(ip);
    }
}
