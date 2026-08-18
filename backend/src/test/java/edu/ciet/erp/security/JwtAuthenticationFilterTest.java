package edu.ciet.erp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtAuthenticationFilter Tests")
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Authenticates successfully from Authorization Bearer header")
    void testAuthFromHeader() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtService.extractUsername("valid-token")).thenReturn("user@ciet.edu.in");
        when(jwtService.extractRole("valid-token")).thenReturn("Student");
        when(jwtService.extractType("valid-token")).thenReturn(null);
        when(jwtService.isTokenValid("valid-token", "user@ciet.edu.in")).thenReturn(true);

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("user@ciet.edu.in");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .anyMatch(a -> a.getAuthority().equals("ROLE_Student"));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Authenticates successfully from accessToken cookie")
    void testAuthFromCookie() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("accessToken", "cookie-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtService.extractUsername("cookie-token")).thenReturn("admin@ciet.edu.in");
        when(jwtService.extractRole("cookie-token")).thenReturn("Director");
        when(jwtService.extractType("cookie-token")).thenReturn(null);
        when(jwtService.isTokenValid("cookie-token", "admin@ciet.edu.in")).thenReturn(true);

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("admin@ciet.edu.in");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .anyMatch(a -> a.getAuthority().equals("ROLE_Director"));
    }

    @Test
    @DisplayName("Skips authentication when token type is 'temp_otp'")
    void testSkipsTempOtpToken() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer temp-otp-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtService.extractUsername("temp-otp-token")).thenReturn("user@ciet.edu.in");
        when(jwtService.extractRole("temp-otp-token")).thenReturn("Student");
        when(jwtService.extractType("temp-otp-token")).thenReturn("temp_otp");

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }
}
