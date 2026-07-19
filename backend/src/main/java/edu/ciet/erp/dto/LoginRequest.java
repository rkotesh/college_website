package edu.ciet.erp.dto;

import edu.ciet.erp.model.Role;
import lombok.Data;

@Data
public class LoginRequest {
    private String identifier;
    private String password;
    private Role role;
}
