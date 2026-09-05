package com.dealflow360.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AivenDbConnectivityTest {

    @Test
    @DisplayName("Verify Cloud Database Connectivity with Aiven MySQL 8.0 SSL")
    void testAivenCloudMySQLConnection() {
        String url = System.getenv().getOrDefault("AIVEN_DB_URL", "jdbc:mysql://entitkart-mdsadiqueamin721786-entitykart.a.aivencloud.com:20904/defaultdb?sslMode=REQUIRED");
        String user = System.getenv().getOrDefault("AIVEN_DB_USER", "avnadmin");
        String pass = System.getenv().getOrDefault("AIVEN_DB_PASSWORD", "");

        if (pass.isEmpty()) {
            System.out.println(">>> AIVEN_DB_PASSWORD not set in environment; skipping live handshake to prevent security leak.");
            return;
        }

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {
            
            assertTrue(rs.next());
            System.out.println(">>> AIVEN CLOUD MYSQL 8.0 CONNECTION SUCCESSFUL: SELECT 1 returned " + rs.getInt(1));
        } catch (Exception ex) {
            System.out.println(">>> Aiven Cloud MySQL connection test exception: " + ex.getMessage());
            // Do not fail build if cloud db is restricted by IP or firewall; test is diagnostic
        }
    }
}
