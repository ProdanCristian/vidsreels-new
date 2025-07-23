import { sendEmail, testSMTPConnection, getSMTPDiagnostics } from '@/lib/smtp';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, includeAvatar, avatarUrl } = await request.json();

    // Generate HTML with avatar if requested
    let emailHtml = html || '<p>Hello! This is a test email from Vidsreels using Google SMTP. It works!</p>';
    
    if (includeAvatar && avatarUrl) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img 
              src="${avatarUrl}" 
              alt="Avatar" 
              style="
                width: 80px; 
                height: 80px; 
                border-radius: 50%; 
                border: 3px solid #e2e8f0;
                object-fit: cover;
                display: block;
                margin: 0 auto 15px auto;
              " 
            />
            <h2 style="color: #1f2937; margin: 0;">Welcome to Vidsreels!</h2>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Powered by Google SMTP 📧</p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            ${emailHtml}
          </div>
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
            <p>Best regards,<br>The Vidsreels Team</p>
            <p style="font-size: 12px; margin-top: 10px;">
              Sent via Google Workspace SMTP
            </p>
          </div>
        </div>
      `;
    }

    const result = await sendEmail({
      to: to || ['cristianprodan1996@outlook.com'],
      subject: subject || 'Test Email from Vidsreels (Google SMTP)',
      html: emailHtml,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email sent successfully via Google SMTP',
        data: {
          messageId: result.messageId,
          response: result.response,
        },
        diagnostics: getSMTPDiagnostics()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send email via Google SMTP',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Test SMTP connection first
    const connectionTest = await testSMTPConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMTP connection failed',
          details: connectionTest.error
        },
        { status: 500 }
      );
    }

    // Send test email with avatar
    const htmlWithAvatar = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img 
            src="https://github.com/shadcn.png" 
            alt="Avatar" 
            style="
              width: 80px; 
              height: 80px; 
              border-radius: 50%; 
              border: 3px solid #e2e8f0;
              object-fit: cover;
              display: block;
              margin: 0 auto 15px auto;
            " 
          />
          <h2 style="color: #1f2937; margin: 0;">Hello from Google SMTP! 👋</h2>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Powered by Google Workspace</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #34d399;">
          <p style="margin: 0; color: #374151;">
            🎉 Success! Your Google SMTP configuration is working perfectly.
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            This email was sent using your Google Workspace SMTP settings.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>Best regards,<br>The Vidsreels Team</p>
          <p style="font-size: 12px; margin-top: 10px;">
            📧 Delivered via smtp.gmail.com
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: ['cristianprodan1996@outlook.com'],
      subject: 'Google SMTP Test - Success! 🎉',
      html: htmlWithAvatar,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Test email sent successfully via Google SMTP',
        data: {
          messageId: result.messageId,
          response: result.response,
          smtpConnection: connectionTest.message
        },
        diagnostics: getSMTPDiagnostics()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending test email via SMTP:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test email via Google SMTP',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 