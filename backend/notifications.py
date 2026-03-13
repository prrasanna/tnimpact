"""Email notifications for order lifecycle events."""

import asyncio
import logging
import os
import smtplib
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

async def send_order_lifecycle_notifications(event: str, order: dict) -> dict:
	"""Send lifecycle email notification for an order event."""
	email_sent = await send_order_email_notification(event=event, order=order)
	return {"email_sent": email_sent, "sms_sent": False}
