import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 587))
        self.smtp_user = os.environ.get('SMTP_USER')
        self.smtp_password = os.environ.get('SMTP_PASSWORD')
        self.enabled = self.smtp_user and self.smtp_password

    def send_otp(self, to_email, otp):
        """
        Sends an OTP to the specified email address.
        If SMTP credentials are not set, prints the OTP to console (dev mode).
        """
        if not self.enabled:
            print(f"e[33m[DEV MODE] Email Service Disabled. OTP for {to_email}: {otp}e[0m")
            return True

        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            msg['Subject'] = "Your GyanBridge Verification Code"

            body = f"""
            <html>
                <body>
                    <h2>Verification Code</h2>
                    <p>Your OTP is: <strong>{otp}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                </body>
            </html>
            """
            msg.attach(MIMEText(body, 'html'))

            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"e[31m[ERROR] Failed to send email: {e}e[0m")
            return False

email_service = EmailService()
