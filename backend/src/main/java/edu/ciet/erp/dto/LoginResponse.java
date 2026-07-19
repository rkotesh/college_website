package edu.ciet.erp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String status; // e.g. "OTP_SENT", "SUCCESS"
    private String tempToken; // sent if OTP_SENT
    private String accessToken; // sent if SUCCESS
    private String refreshToken; // sent if SUCCESS
    private String role;
    private String email;
    private String fullName;
}
