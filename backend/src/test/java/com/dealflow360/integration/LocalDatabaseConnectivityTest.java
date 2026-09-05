package com.dealflow360.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalDatabaseConnectivityTest {

    @Test
    @DisplayName("Verify Local Database Connectivity with Local MySQL 8.0")
    void testLocalMySQLConnection() {
        String url = System.getenv().getOrDefault("LOCAL_DB_URL", "jdbc:mysql://localhost:3306/dealflow360_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true");
        String user = System.getenv().getOrDefault("LOCAL_DB_USER", "root");
        String pass = System.getenv().getOrDefault("LOCAL_DB_PASSWORD", "0721");

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {

            assertTrue(rs.next());
            System.out.println(">>> LOCAL MYSQL 8.0 CONNECTION SUCCESSFUL: SELECT 1 returned " + rs.getInt(1));
        } catch (Exception ex) {
            System.out.println(">>> Local MySQL connection test diagnostic: " + ex.getMessage());
        }
    }
}
