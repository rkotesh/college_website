package edu.ciet.erp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class ErpApplication {
    static {
        try {
            // Check in parent directory (when running from backend/)
            Path envPath = Paths.get("../.env");
            if (!Files.exists(envPath)) {
                // Check in current directory
                envPath = Paths.get(".env");
            }
            if (Files.exists(envPath)) {
                Files.lines(envPath)
                        .map(String::trim)
                        .filter(line -> !line.isEmpty() && !line.startsWith("#") && line.contains("="))
                        .forEach(line -> {
                            int eqIdx = line.indexOf('=');
                            String key = line.substring(0, eqIdx).trim();
                            String val = line.substring(eqIdx + 1).trim();
                            
                            // Remove wrapping quotes if present
                            if (val.startsWith("\"") && val.endsWith("\"")) {
                                val = val.substring(1, val.length() - 1);
                            } else if (val.startsWith("'") && val.endsWith("'")) {
                                val = val.substring(1, val.length() - 1);
                            }
                            
                            System.setProperty(key, val);
                        });
                System.out.println("[ENV] Loaded environment variables from: " + envPath.toAbsolutePath());
            } else {
                System.out.println("[ENV] No .env file found. Using default environment properties.");
            }
        } catch (Exception e) {
            System.err.println("[ENV] Failed to load .env file: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(ErpApplication.class, args);
    }
}
