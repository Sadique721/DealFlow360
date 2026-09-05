package com.dealflow360.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * EmailService — Dispatches real-time transactional emails for DealFlow360.
 *
 * Capabilities:
 *  - Welcome & Staff Provisioning email with temporary password & login URL
 *  - Password Reset notification
 *  - Async execution so API endpoints respond instantaneously
 *  - Full HTML layout with plain-text fallback
 *  - Graceful fallback & error logging if SMTP server is unreachable
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${spring.mail.username:mdsadiqueamin721786@gmail.com}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends a welcome email containing initial temporary credentials and login link
     * to a newly provisioned staff member.
     */
    @Async
    public void sendWelcomeEmail(String toEmail, String name, String tempPassword, String role, String team) {
        if (!mailEnabled) {
            log.info("[EmailService] (DISABLED) Real mail sending disabled. To: {} <{}> | Role: {} | TempPw: {}",
                    name, toEmail, role, tempPassword);
            return;
        }

        try {
            log.info("[EmailService] Dispatching welcome email to {} <{}> (Role: {})...", name, toEmail, role);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("DealFlow360 Operations <" + fromEmail + ">");
            helper.setTo(toEmail);
            helper.setSubject("Welcome to DealFlow360 — Your Staff Account Credentials");

            String roleDisplay = formatRole(role);
            String teamDisplay = (team != null && !team.isBlank()) ? team : "Global Operations";
            String loginUrl = "http://localhost:4200/login";

            String htmlBody = buildWelcomeHtml(name, toEmail, tempPassword, roleDisplay, teamDisplay, loginUrl);
            String textBody = buildWelcomePlainText(name, toEmail, tempPassword, roleDisplay, teamDisplay, loginUrl);

            helper.setText(textBody, htmlBody);

            mailSender.send(message);
            log.info("[EmailService] ✓ Welcome email successfully delivered to {} via Gmail SMTP!", toEmail);

        } catch (MessagingException ex) {
            log.error("[EmailService] ✕ Failed to send welcome email to {}: {}", toEmail, ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("[EmailService] ✕ Unexpected error dispatching email to {}: {}", toEmail, ex.getMessage(), ex);
        }
    }

    /**
     * Sends password reset email with temporary password.
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String name, String newPassword) {
        if (!mailEnabled) {
            log.info("[EmailService] (DISABLED) Password reset mail to {} not sent. NewPw: {}", toEmail, newPassword);
            return;
        }

        try {
            log.info("[EmailService] Dispatching password reset email to {} <{}>...", name, toEmail);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("DealFlow360 Security <" + fromEmail + ">");
            helper.setTo(toEmail);
            helper.setSubject("DealFlow360 — Your Temporary Password Has Been Reset");

            String loginUrl = "http://localhost:4200/login";
            String htmlBody = buildPasswordResetHtml(name, toEmail, newPassword, loginUrl);
            String textBody = String.format(
                "Hello %s,\n\nYour DealFlow360 account password has been reset by an administrator.\n\n" +
                "Username / Email: %s\nTemporary Password: %s\nLogin Portal: %s\n\n" +
                "Please change your password immediately after logging in.\n\n— DealFlow360 Security Team",
                name, toEmail, newPassword, loginUrl
            );

            helper.setText(textBody, htmlBody);
            mailSender.send(message);
            log.info("[EmailService] ✓ Password reset email sent to {}!", toEmail);

        } catch (Exception ex) {
            log.error("[EmailService] ✕ Failed to send password reset email to {}: {}", toEmail, ex.getMessage(), ex);
        }
    }

    // ─── Template Builders ─────────────────────────────────────────────────────

    private String buildWelcomeHtml(String name, String email, String password, String role, String team, String loginUrl) {
        return "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<style>" +
            "  body { margin: 0; padding: 0; background-color: #0c1222; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }" +
            "  .container { max-width: 600px; margin: 30px auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }" +
            "  .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 242, 254, 0.2); }" +
            "  .brand { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }" +
            "  .brand-highlight { color: #00f2fe; }" +
            "  .tagline { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; }" +
            "  .content { padding: 32px 28px; }" +
            "  h2 { font-size: 20px; color: #ffffff; margin-top: 0; margin-bottom: 12px; }" +
            "  p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 18px 0; }" +
            "  .cred-box { background: #0b1120; border: 1px solid #1e293b; border-left: 4px solid #00f2fe; border-radius: 8px; padding: 20px; margin: 24px 0; }" +
            "  .cred-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }" +
            "  .cred-row:last-child { margin-bottom: 0; }" +
            "  .cred-label { color: #94a3b8; font-weight: 600; }" +
            "  .cred-value { color: #ffffff; font-weight: 700; font-family: monospace; }" +
            "  .pw-badge { background: rgba(0, 242, 254, 0.15); color: #00f2fe; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-family: monospace; letter-spacing: 1px; }" +
            "  .btn-container { text-align: center; margin: 30px 0; }" +
            "  .btn-login { display: inline-block; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #0f172a !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3); }" +
            "  .security-notice { font-size: 12px; color: #fbbf24; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 6px; padding: 12px; margin-top: 24px; }" +
            "  .footer { background: #080c16; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "  <div class='container'>" +
            "    <div class='header'>" +
            "      <div class='brand'>⚡ DealFlow<span class='brand-highlight'>360</span></div>" +
            "      <div class='tagline'>Enterprise CPQ & Revenue Operations Platform</div>" +
            "    </div>" +
            "    <div class='content'>" +
            "      <h2>Welcome to the Team, " + escapeHtml(name) + "! 👋</h2>" +
            "      <p>An administrator has provisioned your internal staff account for the <strong>DealFlow360</strong> workspace. Your role-based access has been configured as follows:</p>" +
            "      <div class='cred-box'>" +
            "        <div class='cred-row'><span class='cred-label'>Login Email:</span> <span class='cred-value'>" + escapeHtml(email) + "</span></div>" +
            "        <div class='cred-row'><span class='cred-label'>Assigned Role:</span> <span class='cred-value'>" + escapeHtml(role) + "</span></div>" +
            "        <div class='cred-row'><span class='cred-label'>Team / Dept:</span> <span class='cred-value'>" + escapeHtml(team) + "</span></div>" +
            "        <div class='cred-row'><span class='cred-label'>Temporary Password:</span> <span class='pw-badge'>" + escapeHtml(password) + "</span></div>" +
            "      </div>" +
            "      <div class='btn-container'>" +
            "        <a href='" + loginUrl + "' class='btn-login' target='_blank'>Login to DealFlow360 Workspace &rarr;</a>" +
            "      </div>" +
            "      <div class='security-notice'>" +
            "        <strong>⚠️ Security Recommendation:</strong> This is an auto-generated temporary password. Please change your password upon your first successful login under your user profile settings." +
            "      </div>" +
            "    </div>" +
            "    <div class='footer'>" +
            "      &copy; 2026 DealFlow360 Enterprise Governance. Confidential automated transmission." +
            "    </div>" +
            "  </div>" +
            "</body>" +
            "</html>";
    }

    private String buildWelcomePlainText(String name, String email, String password, String role, String team, String loginUrl) {
        return String.format(
            "Welcome to DealFlow360, %s!\n\n" +
            "An administrator has provisioned your internal staff account on DealFlow360.\n\n" +
            "────────────────────────────────────────\n" +
            "ACCOUNT CREDENTIALS\n" +
            "────────────────────────────────────────\n" +
            "Login Email:        %s\n" +
            "Temporary Password: %s\n" +
            "Assigned Role:      %s\n" +
            "Team / Department:  %s\n" +
            "Workspace URL:      %s\n" +
            "────────────────────────────────────────\n\n" +
            "Please update your password immediately upon your first login.\n\n" +
            "— DealFlow360 Operations Team",
            name, email, password, role, team, loginUrl
        );
    }

    private String buildPasswordResetHtml(String name, String email, String password, String loginUrl) {
        return "<!DOCTYPE html>" +
            "<html>" +
            "<head><meta charset='UTF-8'></head>" +
            "<body style='background:#0c1222; font-family:sans-serif; color:#e2e8f0; padding:20px;'>" +
            "  <div style='max-width:550px; margin:0 auto; background:#131b2e; border:1px solid #1e293b; border-radius:10px; padding:24px;'>" +
            "    <h2 style='color:#00f2fe; margin-top:0;'>Password Reset Notice</h2>" +
            "    <p>Hello " + escapeHtml(name) + ",</p>" +
            "    <p>An administrator has reset your password for DealFlow360:</p>" +
            "    <div style='background:#0b1120; padding:15px; border-radius:6px; font-family:monospace; margin:16px 0;'>" +
            "      <div><strong>Email:</strong> " + escapeHtml(email) + "</div>" +
            "      <div style='margin-top:8px;'><strong>New Temporary Password:</strong> <span style='color:#00f2fe; font-size:16px;'>" + escapeHtml(password) + "</span></div>" +
            "    </div>" +
            "    <p><a href='" + loginUrl + "' style='color:#00f2fe;'>Click here to sign in</a> and change your password.</p>" +
            "    <p style='font-size:12px; color:#64748b; margin-top:24px;'>DealFlow360 Automated Security Governance</p>" +
            "  </div>" +
            "</body>" +
            "</html>";
    }

    private String formatRole(String role) {
        if (role == null) return "Staff Member";
        switch (role) {
            case "ADMIN": return "System Administrator";
            case "SALES_REP": return "Sales Representative";
            case "SALES_MANAGER": return "Sales Operations Manager";
            case "FINANCE": return "Finance & Commercial Operations";
            case "CUSTOMER": return "Enterprise Customer / Buyer";
            default: return role.replace('_', ' ');
        }
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
