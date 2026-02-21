import nodemailer from 'nodemailer';
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendReport = async (email, reportData) => {
  try {
    const mailOptions = {
      from: `"Skyward Agent" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🚨 Skyward: Incident Resolved & Analysis Report',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a1628; color: #d4dce8; padding: 24px; border-radius: 12px; border: 1px solid #1e2d3d;">
          <h1 style="color: #00f5a0; margin-top: 0; font-family: 'Courier New', monospace;">Skyward🤖</h1>
          <p style="color: #ffb800; font-size: 14px;">An incident was detected and handled by your autonomous agent.</p>
          
          <div style="background: #030608; padding: 16px; border-radius: 8px; border-left: 4px solid #a78bfa; margin: 24px 0; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${reportData}</div>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #1e2d3d; font-size: 11px; color: #5a7a94;">
            <p>This is an automated report from your Skyward Mission Control.</p>
            <p>If you need to adjust your Auto-Fix settings, please visit your dashboard.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Incident report sent successfully to ${email}`);
    return info;
    
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send report:`, error.message);
  }
};

export default sendReport;