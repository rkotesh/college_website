package edu.ciet.erp.dto;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String tempToken;
    private String otpCode;
}
