import nodemailer from 'nodemailer';
import { AppError } from '../middleware/error.middleware';

export class EmailUtil {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  static async sendEmail({
    to,
    subject,
    html,
    from = process.env.EMAIL_FROM || 'noreply@example.com',
  }: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      return info;
    } catch (error) {
      throw new AppError('Failed to send email', 500);
    }
  }

  static async sendPasswordReset(email: string, resetToken: string) {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetURL}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
    });
  }
}