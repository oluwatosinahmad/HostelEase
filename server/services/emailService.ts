import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  provider: 'RESEND_API' | 'RESEND_SMTP' | 'CUSTOM_SMTP' | 'DEVELOPMENT_FALLBACK';
  error?: string;
}

export interface EmailDeliveryConfigStatus {
  isConfigured: boolean;
  activeProvider: 'RESEND_API' | 'RESEND_SMTP' | 'CUSTOM_SMTP' | 'NONE';
  fromEmail: string;
  hasResendApiKey: boolean;
  hasSmtpHost: boolean;
  notes: string[];
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resendClient: Resend | null = null;

  /**
   * Diagnostic check of email service configuration
   */
  public getConfigStatus(): EmailDeliveryConfigStatus {
    const hasResend = Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder'));
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const isResendSmtp = hasSmtp && (process.env.SMTP_HOST?.includes('resend.com') || process.env.SMTP_USER === 'resend');

    let activeProvider: 'RESEND_API' | 'RESEND_SMTP' | 'CUSTOM_SMTP' | 'NONE' = 'NONE';
    if (hasResend) activeProvider = 'RESEND_API';
    else if (isResendSmtp) activeProvider = 'RESEND_SMTP';
    else if (hasSmtp) activeProvider = 'CUSTOM_SMTP';

    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'Hostel Ease <onboarding@resend.dev>';
    const notes: string[] = [];

    if (activeProvider === 'RESEND_API') {
      notes.push('Direct Resend API is active. Real emails will be delivered directly via Resend.');
    } else if (activeProvider === 'RESEND_SMTP') {
      notes.push('Resend SMTP is active (smtp.resend.com). Real emails will be delivered via Resend SMTP.');
    } else if (activeProvider === 'CUSTOM_SMTP') {
      notes.push(`Custom SMTP is active (${process.env.SMTP_HOST}).`);
    } else {
      notes.push('No real email credentials found in .env (missing RESEND_API_KEY or SMTP_HOST).');
      notes.push('To send real emails to inboxes, add RESEND_API_KEY=re_... in .env.');
    }

    return {
      isConfigured: activeProvider !== 'NONE',
      activeProvider,
      fromEmail,
      hasResendApiKey: hasResend,
      hasSmtpHost: hasSmtp,
      notes
    };
  }

  /**
   * Resend API Client Singleton
   */
  private getResendClient(): Resend | null {
    const key = process.env.RESEND_API_KEY;
    if (key && !key.includes('placeholder')) {
      if (!this.resendClient) {
        this.resendClient = new Resend(key);
      }
      return this.resendClient;
    }
    return null;
  }

  /**
   * Nodemailer Transporter Singleton (for Resend SMTP or custom SMTP)
   */
  private async getSmtpTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
      return this.transporter;
    }

    return null;
  }

  /**
   * Send 6-digit Email Verification OTP to new Student or Agent
   */
  async sendVerificationOTP(email: string, otp: string, fullName: string): Promise<SendEmailResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || 'Student / Agent';

    const subject = `${otp} is your Hostel Ease verification code`;
    const text = `Hello ${cleanName},\n\nYour Hostel Ease verification code is: ${otp}\n\nThis code expires in 10 minutes.\nDo not share this code with anyone.\n\nHostel Ease • LAUTECH, Ogbomoso`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Hostel Ease Account</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
          .container { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 36px 28px; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(16, 185, 129, 0.3); }
          h1 { font-size: 22px; font-weight: 900; margin: 20px 0 8px 0; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 8px 0; }
          .otp-box { background: #0f172a; border: 2px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #10b981; margin: 0; }
          .otp-note { font-size: 12px; color: #64748b; margin-top: 8px; }
          .footer { border-top: 1px solid #334155; margin-top: 32px; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="text-align: center; margin-bottom: 16px;">
            <span class="badge">Hostel Ease • LAUTECH Ogbomoso</span>
          </div>
          <h1>Verify Your Email Address</h1>
          <p>Hello <strong>${cleanName}</strong>,</p>
          <p>Thank you for signing up on Hostel Ease — the official accommodation platform for LAUTECH students and verified agents in Ogbomoso.</p>
          <p>Please enter the 6-digit verification code below to confirm your email and activate your account:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-note">Code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</div>
          </div>

          <p style="font-size: 12px; color: #64748b;">If you did not initiate this registration, please disregard this email.</p>
          
          <div class="footer">
            Hostel Ease Platform • Under G, Stadium, Adenike, General, & Ogbomoso Campus Areas<br/>
            © ${new Date().getFullYear()} Hostel Ease. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Try sending via Resend API
    const resend = this.getResendClient();
    if (resend) {
      try {
        const from = process.env.RESEND_FROM_EMAIL || 'Hostel Ease <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
          from,
          to: [cleanEmail],
          subject,
          text,
          html
        });

        if (error) {
          console.error(`❌ [Resend API Error] Failed sending OTP to ${cleanEmail}:`, error);
          throw new Error(`Resend API Error: ${error.message}`);
        }

        console.log(`📬 [Resend] Verification OTP successfully sent to ${cleanEmail} (ID: ${data?.id})`);
        return {
          success: true,
          messageId: data?.id,
          provider: 'RESEND_API'
        };
      } catch (err: any) {
        console.error(`❌ [EmailService] Resend API failed:`, err.message);
        // Fall through to SMTP if configured
      }
    }

    // 2. Try sending via SMTP (e.g. Resend SMTP or custom SMTP)
    const transporter = await this.getSmtpTransporter();
    if (transporter) {
      try {
        const from = process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL || '"Hostel Ease" <no-reply@hostelease.ng>';
        const info = await transporter.sendMail({
          from,
          to: cleanEmail,
          subject,
          text,
          html
        });

        console.log(`📬 [SMTP] Verification OTP successfully sent to ${cleanEmail} (ID: ${info.messageId})`);
        return {
          success: true,
          messageId: info.messageId,
          provider: process.env.SMTP_HOST?.includes('resend.com') ? 'RESEND_SMTP' : 'CUSTOM_SMTP'
        };
      } catch (err: any) {
        console.error(`❌ [EmailService] SMTP delivery failed:`, err.message);
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }

    // 3. Fallback when credentials are not yet entered in .env
    console.warn(`⚠️ [EmailService] Real email delivery is waiting for RESEND_API_KEY in .env.`);
    console.log(`\n======================================================`);
    console.log(`📬 [LOCAL VERIFICATION CODE] for ${cleanEmail}: ${otp}`);
    console.log(`💡 To deliver to actual inboxes, set RESEND_API_KEY in your .env file.`);
    console.log(`======================================================\n`);

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      provider: 'DEVELOPMENT_FALLBACK'
    };
  }

  /**
   * Send Password Reset Link to registered user
   */
  async sendPasswordResetEmail(email: string, resetToken: string, fullName: string, resetCode?: string): Promise<SendEmailResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || 'User';
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${appUrl}/#reset-password?email=${encodeURIComponent(cleanEmail)}&token=${resetToken}${resetCode ? `&code=${resetCode}` : ''}`;

    const subject = `Reset Your Hostel Ease Password`;
    const text = `Hello ${cleanName},\n\nWe received a request to reset the password for your Hostel Ease account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, your account is safe and you can ignore this email.\n\nHostel Ease • LAUTECH, Ogbomoso`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Hostel Ease Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
          .container { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 36px 28px; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(16, 185, 129, 0.3); }
          h1 { font-size: 22px; font-weight: 900; margin: 20px 0 8px 0; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 8px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background: #10b981; color: #042f2e; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 14px; text-align: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
          .link-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 14px; margin-top: 20px; word-break: break-all; font-size: 11px; color: #94a3b8; }
          .footer { border-top: 1px solid #334155; margin-top: 32px; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="text-align: center; margin-bottom: 16px;">
            <span class="badge">Password Recovery</span>
          </div>
          <h1>Reset Your Password</h1>
          <p>Hello <strong>${cleanName}</strong>,</p>
          <p>We received a request to reset the password for your Hostel Ease account (<strong>${cleanEmail}</strong>).</p>
          <p>Click the secure button below to set a new password. No verification code is required:</p>
          
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset Password Securely</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">This reset link will expire in <strong>1 hour</strong>. If you did not request this, your account is safe and no changes have been made.</p>

          <div class="link-box">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #38bdf8;">${resetUrl}</a>
          </div>
          
          <div class="footer">
            Hostel Ease Security Team • LAUTECH, Ogbomoso<br/>
            © ${new Date().getFullYear()} Hostel Ease. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Try sending via Resend API
    const resend = this.getResendClient();
    if (resend) {
      try {
        const from = process.env.RESEND_FROM_EMAIL || 'Hostel Ease <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
          from,
          to: [cleanEmail],
          subject,
          text,
          html
        });

        if (error) {
          console.error(`❌ [Resend API Error] Failed sending password reset to ${cleanEmail}:`, error);
          throw new Error(`Resend API Error: ${error.message}`);
        }

        console.log(`🔑 [Resend] Password reset email successfully sent to ${cleanEmail} (ID: ${data?.id})`);
        return {
          success: true,
          messageId: data?.id,
          provider: 'RESEND_API'
        };
      } catch (err: any) {
        console.error(`❌ [EmailService] Resend API failed:`, err.message);
      }
    }

    // 2. Try sending via SMTP (e.g. Resend SMTP)
    const transporter = await this.getSmtpTransporter();
    if (transporter) {
      try {
        const from = process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL || '"Hostel Ease" <no-reply@hostelease.ng>';
        const info = await transporter.sendMail({
          from,
          to: cleanEmail,
          subject,
          text,
          html
        });

        console.log(`🔑 [SMTP] Password reset email sent to ${cleanEmail} (ID: ${info.messageId})`);
        return {
          success: true,
          messageId: info.messageId,
          provider: process.env.SMTP_HOST?.includes('resend.com') ? 'RESEND_SMTP' : 'CUSTOM_SMTP'
        };
      } catch (err: any) {
        console.error(`❌ [EmailService] SMTP delivery failed:`, err.message);
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }

    // 3. Fallback when credentials are not yet entered in .env
    console.warn(`⚠️ [EmailService] Real email delivery is waiting for RESEND_API_KEY in .env.`);
    console.log(`\n======================================================`);
    console.log(`🔑 [LOCAL PASSWORD RESET CODE] for ${cleanEmail}: ${resetCode}`);
    console.log(`🔗 Reset URL: ${resetUrl}`);
    console.log(`💡 To deliver to actual inboxes, set RESEND_API_KEY in your .env file.`);
    console.log(`======================================================\n`);

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      provider: 'DEVELOPMENT_FALLBACK'
    };
  }
}

export const emailService = new EmailService();
export default emailService;
