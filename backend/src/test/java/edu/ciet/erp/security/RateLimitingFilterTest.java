package edu.ciet.erp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("RateLimitingFilter Tests")
class RateLimitingFilterTest {

    private RateLimitingFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter();
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("Allows requests under threshold (150 requests)")
    void testAllowsNormalTraffic() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.50");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Blocks requests exceeding 150 per minute with HTTP 429")
    void testBlocksExcessiveTraffic() throws IOException, ServletException {
        String clientIp = "10.0.0.99";

        // Execute 150 normal requests
        for (int i = 0; i < 150; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);
            assertThat(response.getStatus()).isEqualTo(200);
        }

        // 151st request should be throttled
        MockHttpServletRequest request151 = new MockHttpServletRequest();
        request151.setRemoteAddr(clientIp);
        MockHttpServletResponse response151 = new MockHttpServletResponse();
        filter.doFilter(request151, response151, filterChain);

        assertThat(response151.getStatus()).isEqualTo(429);
        assertThat(response151.getContentAsString()).contains("Too many requests");
    }

    @Test
    @DisplayName("Uses X-Forwarded-For header if present")
    void testUsesXForwardedFor() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.195, 70.41.3.18");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(request, response);
    }
}
