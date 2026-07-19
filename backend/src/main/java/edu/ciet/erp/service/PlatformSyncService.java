package edu.ciet.erp.service;

import edu.ciet.erp.model.StudentProfile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.List;

@Slf4j
@Service
public class PlatformSyncService {

    private final RestTemplate restTemplate = new RestTemplate();

    public void syncPlatforms(StudentProfile profile) {
        if (profile.getLeetcodeUrl() != null && !profile.getLeetcodeUrl().isBlank()) {
            syncLeetCode(profile);
        }
        if (profile.getGithubUrl() != null && !profile.getGithubUrl().isBlank()) {
            syncGitHub(profile);
        }
        if (profile.getCodeforcesUrl() != null && !profile.getCodeforcesUrl().isBlank()) {
            syncCodeforces(profile);
        }
        if (profile.getCodechefUrl() != null && !profile.getCodechefUrl().isBlank()) {
            syncCodeChef(profile);
        }
        if (profile.getHackerrankUrl() != null && !profile.getHackerrankUrl().isBlank()) {
            syncHackerRank(profile);
        }
        if (profile.getSpokenTutorialUrl() != null && !profile.getSpokenTutorialUrl().isBlank()) {
            syncSpokenTutorial(profile);
        }
        if (profile.getPrepinstaUrl() != null && !profile.getPrepinstaUrl().isBlank()) {
            syncPrepInsta(profile);
        }
    }

    private void syncLeetCode(StudentProfile profile) {
        try {
            // Extract username from https://leetcode.com/u/{username}/ or https://leetcode.com/{username}
            String url = profile.getLeetcodeUrl();
            String[] parts = url.split("/");
            String username = parts[parts.length - 1];
            if (username.isBlank() && parts.length > 1) {
                username = parts[parts.length - 2];
            }
            if (username.equals("u") && parts.length > 2) {
                 username = parts[parts.length - 1];
            }

            String graphqlQuery = "{ \"query\": \"query userProblemsSolved($username: String!) { matchedUser(username: $username) { submitStatsGlobal { acSubmissionNum { difficulty count } } } }\", \"variables\": { \"username\": \"" + username + "\" } }";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            
            HttpEntity<String> request = new HttpEntity<>(graphqlQuery, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange("https://leetcode.com/graphql", HttpMethod.POST, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                if (data != null && data.get("matchedUser") != null) {
                    Map<String, Object> matchedUser = (Map<String, Object>) data.get("matchedUser");
                    Map<String, Object> submitStatsGlobal = (Map<String, Object>) matchedUser.get("submitStatsGlobal");
                    List<Map<String, Object>> acSubmissionNum = (List<Map<String, Object>>) submitStatsGlobal.get("acSubmissionNum");
                    
                    for (Map<String, Object> stat : acSubmissionNum) {
                        String difficulty = (String) stat.get("difficulty");
                        int count = (Integer) stat.get("count");
                        if ("Easy".equalsIgnoreCase(difficulty)) profile.setLeetcodeEasySolved(count);
                        if ("Medium".equalsIgnoreCase(difficulty)) profile.setLeetcodeMediumSolved(count);
                        if ("Hard".equalsIgnoreCase(difficulty)) profile.setLeetcodeHardSolved(count);
                    }
                    log.info("Synced LeetCode stats for {}", username);
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync LeetCode stats for url: {}", profile.getLeetcodeUrl(), e);
        }
    }

    private void syncGitHub(StudentProfile profile) {
        try {
            // Extract username from https://github.com/{username}
            String url = profile.getGithubUrl();
            String[] parts = url.split("/");
            String username = parts[parts.length - 1];
            if (username.isBlank() && parts.length > 1) {
                username = parts[parts.length - 2];
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "CIET-ERP-Portal");
            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange("https://api.github.com/users/" + username, HttpMethod.GET, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                if (body.containsKey("public_repos")) {
                    profile.setGithubReposCount((Integer) body.get("public_repos"));
                    log.info("Synced GitHub repo count for {}", username);
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync GitHub stats for url: {}", profile.getGithubUrl(), e);
        }
    }

    private void syncCodeforces(StudentProfile profile) {
        try {
            String url = profile.getCodeforcesUrl();
            String[] parts = url.split("/");
            String username = parts[parts.length - 1];
            if (username.isBlank() && parts.length > 1) {
                username = parts[parts.length - 2];
            }

            ResponseEntity<Map> response = restTemplate.exchange("https://codeforces.com/api/user.info?handles=" + username, HttpMethod.GET, null, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                if ("OK".equals(body.get("status"))) {
                    List<Map<String, Object>> result = (List<Map<String, Object>>) body.get("result");
                    if (result != null && !result.isEmpty()) {
                        Map<String, Object> user = result.get(0);
                        if (user.get("rating") != null) profile.setCodeforcesRating((Integer) user.get("rating"));
                        if (user.get("rank") != null) profile.setCodeforcesRank((String) user.get("rank"));
                        log.info("Synced Codeforces stats for {}", username);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync Codeforces stats for url: {}", profile.getCodeforcesUrl(), e);
        }
    }

    private void syncCodeChef(StudentProfile profile) {
        try {
            String url = profile.getCodechefUrl();
            String[] parts = url.split("/");
            String username = parts[parts.length - 1];
            if (username.isBlank() && parts.length > 1) {
                username = parts[parts.length - 2];
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange("https://codechef-api.vercel.app/handle/" + username, HttpMethod.GET, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                if (body.get("currentRating") != null) {
                    profile.setCodechefRating((Integer) body.get("currentRating"));
                }
                if (body.get("stars") != null) {
                    profile.setCodechefStars((String) body.get("stars"));
                }
                log.info("Synced CodeChef stats for {}", username);
            }
        } catch (Exception e) {
            log.error("Failed to sync CodeChef stats for url: {}", profile.getCodechefUrl(), e);
        }
    }

    private void syncHackerRank(StudentProfile profile) {
        try {
            String url = profile.getHackerrankUrl();
            if (url != null && url.toLowerCase().contains("hackerrank.com")) {
                profile.setHackerrankBadges(1); // Set to 1 as "Active" indicator
                log.info("Set HackerRank to active for url: {}", url);
            }
        } catch (Exception e) {
            log.error("Failed to sync HackerRank stats for url: {}", profile.getHackerrankUrl(), e);
        }
    }

    private void syncSpokenTutorial(StudentProfile profile) {
        try {
            log.info("Set Spoken Tutorial to synced for url: {}", profile.getSpokenTutorialUrl());
        } catch (Exception e) {
            log.error("Failed to sync Spoken Tutorial", e);
        }
    }

    private void syncPrepInsta(StudentProfile profile) {
        try {
            log.info("Set PrepInsta to synced for url: {}", profile.getPrepinstaUrl());
        } catch (Exception e) {
            log.error("Failed to sync PrepInsta", e);
        }
    }
}
