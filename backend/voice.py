"""Voice input/output and command  processing utilities."""

import logging
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
    """
    # Track order queries
    if "track order" in normalized_command or "track it" in normalized_command:
        return "track_order"
    
    if "show order" in normalized_command or "show it" in normalized_command:
        return "track_order"
    
    # Status queries
    if ("what" in normalized_command or "show" in normalized_command) and "status" in normalized_command:
        return "track_order"
    
    # Mark status changes (Phase 2: support multiple statuses)
    if "mark" in normalized_command:
        if "packed" in normalized_command:
            return "mark_packed"
        elif "delivered" in normalized_command:
            return "mark_delivered"
        elif "transit" in normalized_command or "in transit" in normalized_command:
            return "mark_in_transit"
        elif "pending" in normalized_command:
            return "mark_pending"
    
    # Location queries (Phase 2)
    if ("what" in normalized_command or "where" in normalized_command) and ("location" in normalized_command or "headed" in normalized_command):
        return "query_location"
    
    # Update location (Phase 2)
    if "update" in normalized_command and "location" in normalized_command:
        return "update_location"
    
    # Pending orders list
    if "pending" in normalized_command and ("order" in normalized_command or "list" in normalized_command):
        return "show_pending_orders"

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
                response = "I could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"Order {order_id} was not found."
                else:
                    response = (
                        f"Order {order_id} is currently {order['status']} and is headed to "
                        f"{order['destination']}."
                    )
                    # Phase 2: Save order context
                    ctx_manager.update_context(actor_name, {
                        "last_order_id": order_id,
                        "last_location": order.get("destination"),
                        "last_customer_phone": order.get("delivery_person_phone"),
                    })
                    context_updated = True

        elif intent == "mark_packed":
            if user_role not in {"warehouse", "admin"}:
                response = "Only warehouse or admin users can mark orders as packed."
            elif not order_id:
                response = "I could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"Order {order_id} was not found."
                elif order["status"] != "created":
                    response = f"Order {order_id} cannot be packed from status {order['status']}."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {
                            "$set": {
                                "status": "packed",
                                "packed_at": datetime.utcnow(),
                            }
                        },
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"Order {order_id} marked as packed."
                        if action_performed
                        else f"No update applied for order {order_id}."
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
                response = "Only delivery or admin users can mark orders as delivered."
            elif not order_id:
                response = "I could not find an order ID in your command."
            else:
                order = await db.products.find_one({"order_id": order_id})
                if not order:
                    response = f"Order {order_id} was not found."
                elif order["status"] not in {"packed", "out_for_delivery"}:
                    response = f"Order {order_id} cannot be delivered from status {order['status']}."
                else:
                    update_result = await db.products.update_one(
                        {"order_id": order_id},
                        {
                            "$set": {
                                "status": "delivered",
                                "delivered_at": datetime.utcnow(),
                            }
                        },
                    )
                    action_performed = bool(update_result.modified_count)
                    response = (
                        f"Order {order_id} marked as delivered."
                        if action_performed
                        else f"No update applied for order {order_id}."
                    )
                    # Update context
                    if action_performed:
                        ctx_manager.update_context(actor_name, {
                            "last_order_id": order_id,
                            "last_status": "delivered",
                        })
                        context_updated = True

        elif intent == "show_pending_orders":
            filters = {"status": "created"}
            if user_role == "warehouse":
                filters["warehouse_assigned"] = actor_name
            elif user_role == "delivery":
                filters["delivery_person_assigned"] = actor_name
                filters["status"] = {"$in": ["packed", "out_for_delivery"]}

            pending_orders = await db.products.find(filters).to_list(length=1000)
            if not pending_orders:
                response = "There are no pending orders right now."
            else:
                response = f"There are {len(pending_orders)} pending orders."
        
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
                        {"$set": {"status": "pending"}},
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
                            {"$set": {"destination": location}},
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
            response = "Sorry, I could not map that command to a supported workflow."

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
