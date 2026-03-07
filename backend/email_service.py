"""Email service for sending damage reports to authorities."""
import os
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from dotenv import load_dotenv

try:
    from .models import DamageReport  # type: ignore
except ImportError:
    from models import DamageReport  # type: ignore

load_dotenv()
logger = logging.getLogger(__name__)

# SMTP Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "localhost")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "1025"))  # MailHog default 1025
SMTP_USER = os.environ.get("SMTP_USER", "")           # Optional
SMTP_PASS = os.environ.get("SMTP_PASS", "")           # Optional
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@ireland-explorer.app")
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "false").lower() == "true"


class EmailService:
    """Handles email sending for damage reports."""

    def __init__(self):
        # Only require host/port to be considered "enabled"
        self.enabled = bool(SMTP_HOST and SMTP_PORT)
        if not self.enabled:
            logger.warning("Email service not configured. Set SMTP_HOST/SMTP_PORT environment variables.")

    def send_damage_report_email(
        self,
        report: DamageReport,
        signed_photo_url: Optional[str],
        recipient_email: str,
    ) -> bool:
        """
        Send a damage report email to the relevant authority.
        Synchronous (blocks). Prefer send_damage_report_email_async in FastAPI.
        """
        if not self.enabled:
            logger.warning("Email service not enabled, skipping send")
            return False

        if not recipient_email:
            logger.warning("Recipient email missing, skipping send")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[Ireland Explorer] Heritage Damage Report - {report.poi_name or 'Unknown Location'}"
            msg["From"] = SMTP_FROM
            msg["To"] = recipient_email

            text_content = self._build_text_content(report, signed_photo_url)
            html_content = self._build_html_content(report, signed_photo_url)

            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                # TLS is optional (MailHog usually NO TLS)
                if SMTP_USE_TLS:
                    try:
                        server.starttls()
                    except Exception as e:
                        logger.warning(f"starttls failed (continuing without TLS): {e}")

                # Auth is optional
                if SMTP_USER and SMTP_PASS:
                    server.login(SMTP_USER, SMTP_PASS)

                server.send_message(msg)

            logger.info(f"Sent damage report email to {recipient_email} for report {report.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to send damage report email: {e}")
            return False

    async def send_damage_report_email_async(
        self,
        report: DamageReport,
        signed_photo_url: Optional[str],
        recipient_email: str,
    ) -> bool:
        """
        Non-blocking wrapper for FastAPI (runs smtplib in a thread).
        """
        return await asyncio.to_thread(self.send_damage_report_email, report, signed_photo_url, recipient_email)

    def _build_text_content(self, report: DamageReport, photo_url: Optional[str]) -> str:
        location_str = ""
        if getattr(report, "poi_location", None):
            loc = report.poi_location
            location_str = f"\nCoordinates: {loc.lat}, {loc.lng}"
            location_str += f"\nGoogle Maps: https://www.google.com/maps?q={loc.lat},{loc.lng}"

        detected_at = report.created_at.strftime("%Y-%m-%d %H:%M UTC") if getattr(report, "created_at", None) else "Unknown"

        return f"""HERITAGE DAMAGE REPORT
========================

LOCATION DETAILS:
- POI Name: {report.poi_name or 'Unknown'}
- POI ID: {report.poi_id}{location_str}

REPORT DETAILS:
- Report ID: {report.id}
- Trip ID: {getattr(report, "trip_id", "")}
- Stop ID: {getattr(report, "stop_id", "")}
- Detected: {detected_at}

DAMAGE ANALYSIS:
- Damage Type: {report.damage_type.value}
- Severity Score: {report.score:.2f} (0-1 scale)
- Detection Confidence: {report.confidence:.2%}
- Model Version: {report.model_version}

PHOTO ACCESS:
{f'View Photo (expires in 72 hours): {photo_url}' if photo_url else 'Photo URL not available.'}

---
This is an automated message from Ireland Explorer.
"""

    def _build_html_content(self, report: DamageReport, photo_url: Optional[str]) -> str:
        location_html = ""
        if getattr(report, "poi_location", None):
            loc = report.poi_location
            maps_url = f"https://www.google.com/maps?q={loc.lat},{loc.lng}"
            location_html = f"""
            <p><strong>Coordinates:</strong> {loc.lat}, {loc.lng}</p>
            <p><a href="{maps_url}" style="color: #059669;">View on Google Maps</a></p>
            """

        if photo_url:
            photo_html = f"""
            <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                <p><strong>Photo Access:</strong></p>
                <a href="{photo_url}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View Photo</a>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">⚠️ This link expires in 72 hours</p>
            </div>
            """
        else:
            photo_html = "<p><em>Photo URL not available.</em></p>"

        detected_at = report.created_at.strftime("%Y-%m-%d %H:%M UTC") if getattr(report, "created_at", None) else "Unknown"

        severity_color = "#10b981" if report.score < 0.3 else "#f59e0b" if report.score < 0.7 else "#ef4444"

        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">🇮🇪 Heritage Damage Report</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Ireland Explorer Automated Detection</p>
  </div>

  <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin-top: 0;">📍 Location Details</h3>
      <p><strong>POI Name:</strong> {report.poi_name or 'Unknown'}</p>
      <p><strong>POI ID:</strong> <code>{report.poi_id}</code></p>
      {location_html}
    </div>

    <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin-top: 0;">📋 Report Details</h3>
      <p><strong>Report ID:</strong> <code>{report.id}</code></p>
      <p><strong>Trip ID:</strong> <code>{getattr(report, "trip_id", "")}</code></p>
      <p><strong>Stop ID:</strong> <code>{getattr(report, "stop_id", "")}</code></p>
      <p><strong>Detected:</strong> {detected_at}</p>
    </div>

    <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin-top: 0;">🔍 Damage Analysis</h3>
      <p><strong>Damage Type:</strong> {report.damage_type.value.replace('_', ' ').title()}</p>
      <p><strong>Severity Score:</strong> <span style="display:inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; background: {severity_color}; color: white;">{report.score:.2f}</span></p>
      <p><strong>Detection Confidence:</strong> {report.confidence:.1%}</p>
      <p><strong>Model Version:</strong> {report.model_version}</p>
    </div>

    {photo_html}

    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <p>This is an automated message from Ireland Explorer.</p>
    </div>
  </div>
</body>
</html>
"""


# Global instance
email_service = EmailService()
