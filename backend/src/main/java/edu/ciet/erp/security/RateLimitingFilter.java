package edu.ciet.erp.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter implements Filter {

    private final ConcurrentHashMap<String, RequestCounter> ipRequestMap = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 150;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest && response instanceof HttpServletResponse) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String ip = getClientIp(httpRequest);
            long currentTime = System.currentTimeMillis();

            RequestCounter counter = ipRequestMap.compute(ip, (key, val) -> {
                if (val == null || (currentTime - val.windowStart) > 60000) {
                    return new RequestCounter(currentTime, 1);
                } else {
                    val.count.incrementAndGet();
                    return val;
                }
            });

            if (counter.count.get() > MAX_REQUESTS_PER_MINUTE) {
                httpResponse.setStatus(429);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"error\":\"Too many requests. Please wait a minute.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    private static class RequestCounter {
        final long windowStart;
        final AtomicInteger count;

        RequestCounter(long windowStart, int initialCount) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(initialCount);
        }
    }
}
