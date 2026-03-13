"""Voice input/output and command  processing utilities."""

import logging
import io
import os
import re
import subprocess
import tempfile
from datetime import datetime
from contextlib import suppress

import pyttsx3
import speech_recognition as sr
from gtts import gTTS

from context_manager import get_context_manager
from database import get_database
from notifications import send_order_email_notification

logger = logging.getLogger(__name__)


def _play_audio_file(path: str) -> None:
    """Play generated audio file using platform-specific command."""
    try:
        if os.name == "nt":
            os.startfile(path)  # type: ignore[attr-defined]
            return

        # Linux and macOS fallback commands.
        for command in (["xdg-open", path], ["afplay", path]):
            with suppress(Exception):
                subprocess.Popen(command)
                return

        logger.warning("No supported audio player command found for %s", path)
    except Exception as exc:
        logger.error("Failed to play audio file: %s", exc)


def speak_text(text: str, language: str = "en") -> None:
    """Speak response text.

    - Tamil (`ta`) uses gTTS.
    - English and all other languages use pyttsx3 offline speech.
    """
    try:
        if language == "ta":
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
                tts = gTTS(text=text, lang="ta")
                tts.save(tmp_file.name)
                _play_audio_file(tmp_file.name)
            return

        # Offline speech synthesis for English.
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
    except Exception as exc:
        logger.error("Text-to-speech failed: %s", exc)


def synthesize_tts_mp3_bytes(text: str, language: str = "en") -> bytes:
    """Generate MP3 audio bytes for frontend playback.

    Uses gTTS so the frontend can play reliable Tamil audio even when browser
    speech synthesis lacks Tamil voices.
    """
    lang = (language or "en").strip().lower()
    if lang not in {"en", "ta"}:
        lang = "en"

    audio_buffer = io.BytesIO()
    tts = gTTS(text=text, lang=lang)
    tts.write_to_fp(audio_buffer)
    return audio_buffer.getvalue()


def listen_command(timeout: int = 5, phrase_time_limit: int = 8) -> str:
    """Capture voice from microphone and convert it to text."""
    recognizer = sr.Recognizer()

    try:
        with sr.Microphone() as source:
            logger.info("Listening for voice command...")
            recognizer.adjust_for_ambient_noise(source, duration=1)
            audio = recognizer.listen(
                source, timeout=timeout, phrase_time_limit=phrase_time_limit
            )

        command = recognizer.recognize_google(audio)
        logger.info("Recognized command: %s", command)
        return command
    except sr.UnknownValueError:
        return "I could not understand the command."
    except sr.RequestError as exc:
        logger.error("Speech recognition service error: %s", exc)
        return "Speech recognition service is unavailable."
    except Exception as exc:
        logger.error("Voice capture failed: %s", exc)
        return "Microphone input failed."


def _extract_order_id(command: str) -> str | None:
    """Extract order ID token from voice command."""
    # Supports both numeric IDs and prefixed IDs like ORD-101.
    match = re.search(r"(ORD-?\d+|\b\d+\b)", command, flags=re.IGNORECASE)
    if not match:
        return None

    raw = match.group(1).upper()
    return raw if raw.startswith("ORD") else f"ORD-{raw}"


def _extract_location(command: str) -> str | None:
    """Extract location/city from voice command."""
    # Pattern: "update location to Chennai" or "location to Mumbai"
    match = re.search(r"(?:location to|headed to|destination to)\s+(\w+)", command, flags=re.IGNORECASE)
    if match:
        return match.group(1).title()
    
    # Pattern: "Chennai" at the end
    words = command.strip().split()
    if len(words) > 0:
        # Return last capitalized word that's likely a city name
        potential_city = words[-1].title()
        if len(potential_city) > 2:
            return potential_city
    
    return None


def _intent_from_text(normalized_command: str) -> str:
    """Map free-form command text to supported backend intents.
    
    Phase 2: Enhanced patterns for context-aware commands.
    Now supports flexible word order.
    """
    # Track order queries
    if "track order" in normalized_command or "track it" in normalized_command:
        return "track_order"
    
    if ("show order" in normalized_command or "show it" in normalized_command) and "orders" not in normalized_command:
        return "track_order"
    
    # Status queries
    if (("what" in normalized_command or "show" in normalized_command) and "status" in normalized_command
            and "orders" not in normalized_command):
        return "track_order"
    
    # Pending orders list — check BEFORE mark block to avoid "pending" triggering mark_pending
    if any(phrase in normalized_command for phrase in [
        "show pending",
        "list pending",
        "pending orders",
        "pending deliveries",
        "pending delivery",
        "pending list",
        "show orders",
        "list orders",
        "all pending",
        "how many pending",
        "my pending",
    ]):
        return "show_pending_orders"

    # My orders / assigned orders list
    if any(phrase in normalized_command for phrase in [
        "my orders",
        "show my orders",
        "my deliveries",
        "show my deliveries",
        "assigned orders",
        "assigned products",
        "my tasks",
    ]):
        return "show_pending_orders"

    # Location queries (Phase 2) — check before mark block
    if ("what" in normalized_command or "where" in normalized_command) and ("location" in normalized_command or "headed" in normalized_command):
        return "query_location"

    # Update location (Phase 2) — check before mark block
    if "update" in normalized_command and "location" in normalized_command:
        return "update_location"

    # Mark status changes (Phase 2: support multiple statuses)
    # Check for action/status keywords regardless of word order.
    has_mark_keyword = any(
        word in normalized_command
        for word in ["mark", "set", "update", "start", "begin", "move", "send"]
    )
    has_shipping_phrase = any(
        phrase in normalized_command
        for phrase in [
            "start delivery",
            "begin delivery",
            "start the delivery",
            "begin the delivery",
            "send for delivery",
            "out for delivery",
            "start shipment",
            "dispatch",
            "start trip",
        ]
    )

    # Force shipping intent first for phrases like "start deliver".
    if has_shipping_phrase or re.search(r"\b(start|begin|send|move)\s+(the\s+)?deliver(y|)\b", normalized_command):
        return "mark_shipped"

    if has_mark_keyword or any(
        status in normalized_command
        for status in ["picked", "packed", "delivered", "shipped", "dispatch", "delivery"]
    ):
        if "picked" in normalized_command or "pick" in normalized_command:
            return "mark_picked"
        elif "packed" in normalized_command or "pack" in normalized_command:
            return "mark_packed"
        elif (
            "shipped" in normalized_command
            or "out for delivery" in normalized_command
            or "start delivery" in normalized_command
            or "begin delivery" in normalized_command
            or "send for delivery" in normalized_command
            or "dispatch" in normalized_command
        ):
            return "mark_shipped"
        elif (
            "delivered" in normalized_command
            or re.search(r"\bmark\s+(as\s+)?deliver(ed)?\b", normalized_command)
        ):
            return "mark_delivered"
        elif "transit" in normalized_command or "in transit" in normalized_command:
            return "mark_in_transit"
        elif "pending" in normalized_command:
            return "mark_pending"

    return "unknown"


async def _save_voice_log(
    user_name: str,
    role: str,
    command_text: str,
    response: str,
) -> None:
    """Persist voice command audit logs."""
    db = get_database()
    await db.voice_logs.insert_one(
        {
            "user_name": user_name,
            "role": role,
            "command_text": command_text,
            "response": response,
            "timestamp": datetime.utcnow(),
        }
    )


async def process_voice_command(
    command: str,
    user_role: str,
    user_name: str | None = None,
    current_location: str = "",
) -> dict:
    """Parse a voice command, execute DB actions, and return structured response.
    
    Phase 2 Enhancement: Now includes context-aware command resolution.
    """
    actor_name = user_name or "Unknown"
    
    # Phase 2: Get context manager and retrieve user context
    ctx_manager = get_context_manager()
    user_context = ctx_manager.get_context(actor_name)
    
    # Phase 2: Resolve anaphoric references (it, that, the customer, etc.)
    resolved_command = ctx_manager.resolve_anaphora(command, user_context)
    
    normalized = resolved_command.lower().strip()
    intent = _intent_from_text(normalized)

    db = get_database()
    order_id = _extract_order_id(resolved_command)
    action_performed = False
    context_updated = False
    
    try:
        if intent == "track_order":
            if not order_id:
                response = "உங்க கமாண்டில் ஆர்டர் ஐடி கிடைக்கவில்லை.\nI could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"ஆர்டர் {order_id} கிடைக்கவில்லை.\nOrder {order_id} was not found."
                else:
                    response = (
                        f"ஆர்டர் {order_id} தற்போது {order['status']} ஸ்டேட்டஸில் இருக்கிறது மற்றும் {order['destination']} க்கு செல்கிறது.\n"
                        f"Order {order_id} is currently {order['status']} and is headed to {order['destination']}."
                    )
                    # Phase 2: Save order context
                    ctx_manager.update_context(actor_name, {
                        "last_order_id": order_id,
                        "last_location": order.get("destination"),
                        "last_customer_phone": order.get("customer_phone") or order.get("delivery_person_phone"),
                    })
                    context_updated = True

        elif intent == "mark_picked":
            if user_role not in {"warehouse", "admin"}:
                response = "வெர்ஹவுஸ் அல்லது அட்மின் யூசர்ஸ் மட்டுமே ஆர்டரை பிக்கட் என மார்க் செய்ய முடியும்.\nOnly warehouse or admin users can mark orders as picked."
            elif not order_id:
                response = "உங்க கமாண்டில் ஆர்டர் ஐடி கிடைக்கவில்லை.\nI could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"ஆர்டர் {order_id} கிடைக்கவில்லை.\nOrder {order_id} was not found."
                elif order["status"] != "created":
                    response = f"ஆர்டர் {order_id} ஐ {order['status']} ஸ்டேட்டஸிலிருந்து பிக்கட் என மார்க் செய்ய முடியாது.\nOrder {order_id} cannot be marked as picked from status {order['status']}."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {
                            "$set": {
                                "status": "picked",
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"ஆர்டர் {order_id} பிக்கட் என மார்க் செய்யப்பட்டது.\nOrder {order_id} marked as picked."
                        if action_performed
                        else f"ஆர்டர் {order_id} க்கு எந்த அப்டேட்டும் செய்யப்படவில்லை.\nNo update applied for order {order_id}."
                    )
                    # Update context
                    if action_performed:
                        ctx_manager.update_context(actor_name, {
                            "last_order_id": order_id,
                            "last_status": "picked",
                        })
                        context_updated = True

        elif intent == "mark_packed":
            if user_role not in {"warehouse", "admin"}:
                response = "வெர்ஹவுஸ் அல்லது அட்மின் யூசர்ஸ் மட்டுமே ஆர்டரை பேக்டு என மார்க் செய்ய முடியும்.\nOnly warehouse or admin users can mark orders as packed."
            elif not order_id:
                response = "உங்க கமாண்டில் ஆர்டர் ஐடி கிடைக்கவில்லை.\nI could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"ஆர்டர் {order_id} கிடைக்கவில்லை.\nOrder {order_id} was not found."
                elif order["status"] not in {"created", "picked"}:
                    response = f"ஆர்டர் {order_id} ஐ {order['status']} ஸ்டேட்டஸிலிருந்து பேக்டு என மார்க் செய்ய முடியாது.\nOrder {order_id} cannot be packed from status {order['status']}."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {
                            "$set": {
                                "status": "packed",
                                "packed_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"ஆர்டர் {order_id} பேக்டு என மார்க் செய்யப்பட்டது.\nOrder {order_id} marked as packed."
                        if action_performed
                        else f"ஆர்டர் {order_id} க்கு எந்த அப்டேட்டும் செய்யப்படவில்லை.\nNo update applied for order {order_id}."
                    )
                    if action_performed:
                        updated_order = await db.products.find_one({"order_id": order_id})
                        if updated_order:
                            await send_order_email_notification(
                                event="packed",
                                order=updated_order,
                            )
                    # Update context
                    if action_performed:
                        ctx_manager.update_context(actor_name, {
                            "last_order_id": order_id,
                            "last_status": "packed",
                        })
                        context_updated = True

        elif intent == "mark_delivered":
            if user_role not in {"delivery", "admin"}:
                response = "டெலிவரி அல்லது அட்மின் யூசர்ஸ் மட்டுமே ஆர்டரை டெலிவர்டு என மார்க் செய்ய முடியும்.\nOnly delivery or admin users can mark orders as delivered."
            elif not order_id:
                response = "உங்க கமாண்டில் ஆர்டர் ஐடி கிடைக்கவில்லை.\nI could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"ஆர்டர் {order_id} கிடைக்கவில்லை.\nOrder {order_id} was not found."
                elif order["status"] not in {"packed", "out_for_delivery"}:
                    response = f"ஆர்டர் {order_id} ஐ {order['status']} ஸ்டேட்டஸிலிருந்து டெலிவர்டு என மார்க் செய்ய முடியாது.\nOrder {order_id} cannot be delivered from status {order['status']}."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {
                            "$set": {
                                "status": "delivered",
                                "delivered_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"ஆர்டர் {order_id} டெலிவர்டு என மார்க் செய்யப்பட்டது.\nOrder {order_id} marked as delivered."
                        if action_performed
                        else f"ஆர்டர் {order_id} க்கு எந்த அப்டேட்டும் செய்யப்படவில்லை.\nNo update applied for order {order_id}."
                    )
                    if action_performed:
                        updated_order = await db.products.find_one({"order_id": order_id})
                        if updated_order:
                            await send_order_email_notification(
                                event="delivered",
                                order=updated_order,
                            )
                    # Update context
                    if action_performed:
                        ctx_manager.update_context(actor_name, {
                            "last_order_id": order_id,
                            "last_status": "delivered",
                        })
                        context_updated = True

        elif intent == "mark_shipped":
            if user_role not in {"delivery", "admin", "dispatcher"}:
                response = "டெலிவரி, டிஸ்பேச்சர் அல்லது அட்மின் யூசர்ஸ் மட்டுமே ஆர்டரை ஷிப்புடு என மார்க் செய்ய முடியும்.\nOnly delivery, dispatcher, or admin users can mark orders as shipped."
            elif not order_id:
                response = "உங்க கமாண்டில் ஆர்டர் ஐடி கிடைக்கவில்லை.\nI could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"ஆர்டர் {order_id} கிடைக்கவில்லை.\nOrder {order_id} was not found."
                elif order["status"] not in {"packed", "picked"}:
                    response = f"ஆர்டர் {order_id} ஐ {order['status']} ஸ்டேட்டஸிலிருந்து ஷிப்புடு என மார்க் செய்ய முடியாது.\nOrder {order_id} cannot be marked as shipped from status {order['status']}."
                else:
                    destination = order.get("destination", "Unknown location")
                    update_fields = {
                        "status": "out_for_delivery",
                        "updated_at": datetime.utcnow(),
                    }
                    if current_location:
                        update_fields["delivery_start_location"] = current_location
                    update_fields["delivery_started_at"] = datetime.utcnow()

                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {"$set": update_fields},
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"ஆர்டர் {order_id} ஷிப்புடு என மார்க் செய்யப்பட்டு டெலிவரிக்கு அனுப்பப்பட்டது. கஸ்டமர் லொக்கேஷன்: {destination}.\n"
                        f"Order {order_id} marked as shipped and out for delivery. Customer location: {destination}."
                        if action_performed
                        else f"ஆர்டர் {order_id} க்கு எந்த அப்டேட்டும் செய்யப்படவில்லை.\nNo update applied for order {order_id}."
                    )
                    # Update context
                    if action_performed:
                        ctx_manager.update_context(actor_name, {
                            "last_order_id": order_id,
                            "last_status": "out_for_delivery",
                            "last_location": destination,
                        })
                        context_updated = True

        elif intent == "show_pending_orders":
            if user_role == "warehouse":
                filters = {
                    "status": {"$in": ["created", "picked"]},
                    "warehouse_assigned": actor_name,
                }
            elif user_role == "delivery":
                filters = {
                    "delivery_person_assigned": actor_name,
                    "status": {"$in": ["packed", "out_for_delivery"]},
                }
            elif user_role == "dispatcher":
                filters = {"status": {"$in": ["created", "picked", "packed"]}}
            else:  # admin sees everything non-delivered
                filters = {"status": {"$nin": ["delivered", "cancelled", "returned"]}}

            pending_orders = await db.products.find(filters).to_list(length=1000)
            if not pending_orders:
                response = (
                    "நிலுவையில் உள்ள ஆர்டர்கள் எதுவும் இல்லை இப்போது.\n"
                    "There are no pending orders right now."
                )
            else:
                order_ids = ", ".join(o["order_id"] for o in pending_orders[:10])
                more = f" (+{len(pending_orders) - 10} more)" if len(pending_orders) > 10 else ""
                response = (
                    f"{len(pending_orders)} நிலுவையில் உள்ள ஆர்டர்கள்: {order_ids}{more}.\n"
                    f"You have {len(pending_orders)} pending order(s): {order_ids}{more}."
                )
        
        # Phase 2: New intent handlers for context-aware commands
        elif intent == "mark_in_transit":
            if user_role not in {"delivery", "admin"}:
                response = "Only delivery or admin users can mark orders as in transit."
            elif not order_id:
                response = "I could not find an order ID in your command. Please say 'track order <number>' first."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"Order {order_id} was not found."
                elif order["status"] not in {"pending", "packed"}:
                    response = f"Order {order_id} cannot be marked in transit from status {order['status']}."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {
                            "$set": {
                                "status": "in_transit",
                                "in_transit_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"Order {order_id} has been marked as in transit."
                        if action_performed
                        else f"No update applied for order {order_id}."
                    )
                    # Update context
                    if action_performed:
                        ctx_manager.update_context(actor_name, {
                            "last_order_id": order_id,
                            "last_status": "in_transit",
                        })
                        context_updated = True
        
        elif intent == "mark_pending":
            if user_role not in {"warehouse", "admin"}:
                response = "Only warehouse or admin users can mark orders as pending."
            elif not order_id:
                response = "I could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"Order {order_id} was not found."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {"$set": {"status": "pending", "updated_at": datetime.utcnow()}},
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"Order {order_id} has been marked as pending."
                        if action_performed
                        else f"No update applied for order {order_id}."
                    )
        
        elif intent == "query_location":
            if not order_id:
                response = "I could not find an order ID. Please track an order first."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"Order {order_id} was not found."
                else:
                    location = order.get("destination", "unknown location")
                    response = f"Order {order_id} is headed to {location}."
        
        elif intent == "update_location":
            if user_role not in {"delivery", "admin"}:
                response = "Only delivery or admin users can update order locations."
            elif not order_id:
                response = "I could not find an order ID in your command."
            else:
                location = _extract_location(resolved_command)
                if not location:
                    response = "I could not identify a location in your command. Try saying 'update location to Chennai'."
                else:
                    order = await db.products.find_one({"order_id": order_id})
                    if not order:
                        response = f"Order {order_id} was not found."
                    else:
                        update_result = await db.products.update_one(
                            {"order_id": order_id},
                            {"$set": {"destination": location, "updated_at": datetime.utcnow()}},
                        )
                        action_performed = bool(update_result.modified_count)
                        response = (
                            f"Order {order_id} location updated to {location}."
                            if action_performed
                            else f"No update applied for order {order_id}."
                        )
                        # Update context
                        if action_performed:
                            ctx_manager.update_context(actor_name, {
                                "last_order_id": order_id,
                                "last_location": location,
                            })
                            context_updated = True

        else:
            response = (
                "அந்த கமாண்டை புரிந்துகொள்ள முடியவில்லை. "
                "'show pending orders', 'track order ORD-1001', 'mark ORD-1001 as packed' போன்று சொல்லுங்க.\n"
                "I did not understand that command. "
                "Try saying: 'show pending orders', 'track order ORD-1001', or 'mark ORD-1001 as packed'."
            )

        await _save_voice_log(
            user_name=actor_name,
            role=user_role,
            command_text=command,
            response=response,
        )

        return {
            "response": response,
            "intent": intent,
            "action_performed": action_performed,
            "order_id": order_id,
            "context_updated": context_updated,
        }
    except Exception as exc:
        logger.error("Voice command processing failed: %s", exc)
        response = "An error occurred while processing your command."
        with suppress(Exception):
            await _save_voice_log(
                user_name=actor_name,
                role=user_role,
                command_text=command,
                response=response,
            )
        return {
            "response": response,
            "intent": intent,
            "action_performed": False,
            "order_id": order_id,
            "context_updated": False,
        }
