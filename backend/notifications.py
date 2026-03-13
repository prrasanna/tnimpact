"""Email and SMS notifications for order lifecycle events."""

import asyncio
import logging
import os
import smtplib
import re
from pathlib import Path
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).with_name(".env"), override=False)

logger = logging.getLogger(__name__)


def _smtp_enabled() -> bool:
    return os.getenv("SMTP_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _twilio_enabled() -> bool:
    return os.getenv("TWILIO_SMS_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _build_subject(event: str, order_id: str) -> str:
    if event == "created":
        return f"Order Assigned: {order_id}"
    if event == "packed":
        return f"Order Packed: {order_id}"
    if event == "out_for_delivery":
        return f"Order Out for Delivery: {order_id}"
    if event == "delivered":
        return f"Order Delivered: {order_id}"
    return f"Order Update: {order_id}"


def _build_body(event: str, order: dict) -> str:
    order_id = order.get("order_id", "Unknown")
    item = order.get("product_name", "Product")
    destination = order.get("destination", "Unknown")
    delivery_person = order.get("delivery_person_assigned", "Delivery Partner")

    if event == "created":
        headline = "A new order has been assigned to you."
    elif event == "packed":
        headline = "Your assigned order has been packed and is ready for delivery handoff."
    elif event == "out_for_delivery":
        headline = "Your assigned order is out for delivery."
    elif event == "delivered":
        headline = "Your assigned order has been marked as delivered."
    else:
        headline = "An order update is available."

    return (
        f"Hello {delivery_person},\n\n"
        f"{headline}\n\n"
        f"Order ID: {order_id}\n"
        f"Product: {item}\n"
        f"Destination: {destination}\n"
        f"Current Status: {order.get('status', event)}\n\n"
        "This is an automated message from the Logistics Assistant system."
    )


def _send_email_sync(to_email: str, subject: str, body: str) -> None:
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USERNAME", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", user)
    from_name = os.getenv("SMTP_FROM_NAME", "Logistics Assistant")
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    use_ssl = os.getenv("SMTP_USE_SSL", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    if not host or not from_email:
        raise RuntimeError("SMTP is enabled but SMTP_HOST/SMTP_FROM_EMAIL is not set")

    message = EmailMessage()
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    if use_ssl:
        with smtplib.SMTP_SSL(host, port, timeout=20) as smtp:
            if user and password:
                smtp.login(user, password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if use_tls:
            smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.send_message(message)


def _normalize_phone_number(phone: str) -> str:
    """Normalize customer phone numbers to E.164-like format for Twilio."""
    raw = (phone or "").strip()
    if not raw:
        return ""

    if raw.startswith("00"):
        raw = "+" + raw[2:]

    if raw.startswith("+"):
        return "+" + re.sub(r"\D", "", raw)

    digits = re.sub(r"\D", "", raw)
    if not digits:
        return ""

    # Default to India if only local 10-digit phone is provided.
    if len(digits) == 10:
        return f"+91{digits}"

    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"

    return f"+{digits}"


def _build_sms_body(event: str, order: dict) -> str:
    order_id = order.get("order_id", "Unknown")
    item = order.get("product_name", "Product")
    destination = order.get("destination", "your location")

    if event == "created":
        return f"Order {order_id} for {item} has been created and assigned for delivery to {destination}."
    if event == "packed":
        return f"Order {order_id} for {item} has been packed and is ready for dispatch."
    if event == "out_for_delivery":
        return f"Order {order_id} is out for delivery to {destination}."
    if event == "delivered":
        return f"Order {order_id} has been delivered. Thank you for choosing us."
    return f"Order {order_id} status updated to {order.get('status', event)}."


def _send_sms_sync(to_phone: str, body: str) -> None:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    service_sid = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "").strip()

    if not account_sid or not auth_token:
        raise RuntimeError("Twilio is enabled but TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN is missing")
    if not from_number and not service_sid:
        raise RuntimeError(
            "Twilio is enabled but TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID is missing"
        )

    try:
        from twilio.rest import Client
    except ImportError as exc:
        raise RuntimeError("twilio package is not installed") from exc

    client = Client(account_sid, auth_token)
    message_kwargs = {
        "body": body,
        "to": to_phone,
    }
    if service_sid:
        message_kwargs["messaging_service_sid"] = service_sid
    else:
        message_kwargs["from_"] = from_number

    client.messages.create(**message_kwargs)


async def send_order_email_notification(event: str, order: dict) -> bool:
    """Send lifecycle email to customer email if SMTP is configured.

    Returns True if email was sent, False if skipped/failed.
    """
    to_email = (order.get("customer_email") or order.get("delivery_person_email") or "").strip()
    order_id = order.get("order_id", "Unknown")

    if not to_email:
        logger.info("Email notification skipped for %s: no customer_email", order_id)
        return False

    if not _smtp_enabled():
        logger.info("Email notification skipped for %s: SMTP_ENABLED is false", order_id)
        return False

    subject = _build_subject(event=event, order_id=order_id)
    body = _build_body(event=event, order=order)

    try:
        await asyncio.to_thread(_send_email_sync, to_email, subject, body)
        logger.info("Email notification sent for %s (%s)", order_id, event)
        return True
    except Exception as exc:
        logger.warning(
            "Email notification failed for %s (%s): %s",
            order_id,
            event,
            exc,
        )
        return False


async def send_order_sms_notification(event: str, order: dict) -> bool:
    """Send lifecycle SMS to customer phone if Twilio is configured."""
    order_id = order.get("order_id", "Unknown")
    customer_phone = _normalize_phone_number(order.get("customer_phone", ""))

    if not customer_phone:
        logger.info("SMS notification skipped for %s: no customer_phone", order_id)
        return False

    if not _twilio_enabled():
        logger.info("SMS notification skipped for %s: TWILIO_SMS_ENABLED is false", order_id)
        return False

    body = _build_sms_body(event=event, order=order)

    try:
        await asyncio.to_thread(_send_sms_sync, customer_phone, body)
        logger.info("SMS notification sent for %s (%s)", order_id, event)
        return True
    except Exception as exc:
        logger.warning(
            "SMS notification failed for %s (%s): %s",
            order_id,
            event,
            exc,
        )
        return False


async def send_order_lifecycle_notifications(event: str, order: dict) -> dict:
    """Send both email and SMS notifications for an order lifecycle event."""
    email_sent, sms_sent = await asyncio.gather(
        send_order_email_notification(event=event, order=order),
        send_order_sms_notification(event=event, order=order),
    )
    return {"email_sent": email_sent, "sms_sent": sms_sent}
