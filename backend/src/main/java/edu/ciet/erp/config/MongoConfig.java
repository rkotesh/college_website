package edu.ciet.erp.config;

import edu.ciet.erp.model.Role;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.List;

/**
 * MongoDB custom converters.
 * SafeRoleReadConverter handles legacy/invalid role strings (e.g. "patient")
 * stored in MongoDB by returning null instead of throwing IllegalArgumentException.
 */
@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(new SafeRoleReadConverter()));
    }

    @ReadingConverter
    static class SafeRoleReadConverter implements Converter<String, Role> {
        @Override
        public Role convert(String source) {
            if (source == null || source.isBlank()) return null;
            try {
                return Role.valueOf(source);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
    }
}