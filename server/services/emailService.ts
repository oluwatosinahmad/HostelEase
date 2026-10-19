import nodemailer from 'nodemailer';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private testAccountInitialized = false;

  private async getTransporter(): Promise<nodemailer.Transporter> {
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

    // In development/test without explicit SMTP, use Ethereal Email test account for real message delivery testing
    try {
      console.log('📧 [EmailService] Initializing Ethereal test mailer for development...');
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      this.testAccountInitialized = true;
      console.log(`✅ [EmailService] Ethereal mailer ready. User: ${testAccount.user}`);
      return this.transporter;
    } catch (testErr) {
      console.warn('⚠️ [EmailService] Failed to create Ethereal test account:', testErr);
      // Fallback transporter that logs
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows'
      });
      return this.transporter;
    }
  }

  /**
   * Send 6-digit Email Verification OTP to new Student or Agent
   */
  async sendVerificationOTP(email: string, otp: string, fullName: string): Promise<SendEmailResult> {
    try {
      const transporter = await this.getTransporter();
      const from = process.env.SMTP_FROM || '"Hostel Ease" <no-reply@hostelease.ng>';

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
            <p>Hello <strong>${fullName || 'Student/Agent'}</strong>,</p>
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

      const info = await transporter.sendMail({
        from,
        to: email,
        subject: `${otp} is your Hostel Ease verification code`,
        text: `Hello ${fullName},\n\nYour Hostel Ease verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nHostel Ease • LAUTECH, Ogbomoso`,
        html
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n======================================================`);
        console.log(`📬 [EMAIL SENT] Verification code for ${email}: ${otp}`);
        console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
        console.log(`======================================================\n`);
      } else {
        console.log(`📬 [EMAIL SENT] Verification code sent to ${email} (MessageID: ${info.messageId})`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl
      };
    } catch (err: any) {
      console.error(`❌ [EmailService] Failed to send verification OTP to ${email}:`, err);
      throw new Error(`Email delivery failed: ${err.message || 'Unable to connect to email provider'}`);
    }
  }

  /**
   * Send Password Reset Code & Link to registered user
   */
  async sendPasswordResetEmail(email: string, resetCode: string, resetToken: string, fullName: string): Promise<SendEmailResult> {
    try {
      const transporter = await this.getTransporter();
      const from = process.env.SMTP_FROM || '"Hostel Ease" <no-reply@hostelease.ng>';
      const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const resetUrl = `${appUrl}/?action=reset-password&email=${encodeURIComponent(email)}&code=${resetCode}&token=${resetToken}`;

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
            .badge { display: inline-block; background: rgba(244, 63, 94, 0.15); color: #fb7185; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(244, 63, 94, 0.3); }
            h1 { font-size: 22px; font-weight: 900; margin: 20px 0 8px 0; color: #ffffff; }
            p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 8px 0; }
            .otp-box { background: #0f172a; border: 2px dashed #f43f5e; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
            .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #fb7185; margin: 0; }
            .otp-note { font-size: 12px; color: #64748b; margin-top: 8px; }
            .btn { display: inline-block; background: #10b981; color: #042f2e; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 12px; margin: 16px 0; text-align: center; }
            .footer { border-top: 1px solid #334155; margin-top: 32px; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="text-align: center; margin-bottom: 16px;">
              <span class="badge">Password Recovery</span>
            </div>
            <h1>Reset Your Password</h1>
            <p>Hello <strong>${fullName || 'User'}</strong>,</p>
            <p>We received a request to reset the password for your Hostel Ease account (<strong>${email}</strong>).</p>
            <p>Enter the 6-digit recovery code below on the password reset screen:</p>
            
            <div class="otp-box">
              <div class="otp-code">${resetCode}</div>
              <div class="otp-note">Code expires in <strong>15 minutes</strong>. If you did not request this, your account is safe and no changes have been made.</div>
            </div>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password Directly</a>
            </div>

            <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Or copy and paste this link into your browser:<br/><span style="word-break: break-all; color: #94a3b8;">${resetUrl}</span></p>
            
            <div class="footer">
              Hostel Ease Security Team • LAUTECH, Ogbomoso<br/>
              © ${new Date().getFullYear()} Hostel Ease. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from,
        to: email,
        subject: `${resetCode} is your Hostel Ease password reset code`,
        text: `Hello ${fullName},\n\nYour password reset code is: ${resetCode}\n\nReset link: ${resetUrl}\n\nThis code expires in 15 minutes.\n\nHostel Ease • LAUTECH, Ogbomoso`,
        html
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n======================================================`);
        console.log(`🔑 [PASSWORD RESET EMAIL] Sent to ${email}. Code: ${resetCode}`);
        console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
        console.log(`======================================================\n`);
      } else {
        console.log(`🔑 [PASSWORD RESET EMAIL] Sent to ${email} (MessageID: ${info.messageId})`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl
      };
    } catch (err: any) {
      console.error(`❌ [EmailService] Failed to send password reset to ${email}:`, err);
      throw new Error(`Email delivery failed: ${err.message || 'Unable to connect to email provider'}`);
    }
  }
}

export const emailService = new EmailService();
export default emailService;
