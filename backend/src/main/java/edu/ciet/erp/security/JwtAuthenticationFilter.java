package edu.ciet.erp.security;

import lombok.extern.slf4j.Slf4j;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {


    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        String headerJwt = null;
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            headerJwt = authHeader.substring(7);
        }

        String cookieJwt = null;
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    cookieJwt = cookie.getValue();
                    break;
                }
            }
        }

        boolean authenticated = false;
        if (headerJwt != null) {
            authenticated = tryAuthenticate(headerJwt, request);
        }
        if (!authenticated && cookieJwt != null) {
            authenticated = tryAuthenticate(cookieJwt, request);
        }

        filterChain.doFilter(request, response);
    }

    private boolean tryAuthenticate(String jwt, HttpServletRequest request) {
        try {
            String userEmail = jwtService.extractUsername(jwt);
            String role = jwtService.extractRole(jwt);
            String type = jwtService.extractType(jwt);

            if ("temp_otp".equals(type)) {
                log.info("Temporary OTP token detected, skipping authentication");
                return false;
            }

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (jwtService.isTokenValid(jwt, userEmail)) {
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userEmail,
                            null,
                            Collections.singletonList(authority)
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("Successfully authenticated user {} with role {}", userEmail, role);
                    return true;
                }
            }
        } catch (Exception e) {
            log.debug("Token validation failed: {}", e.getMessage());
        }
        return false;
    }
}
