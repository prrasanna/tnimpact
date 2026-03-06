"""Voice input/output and command processing utilities."""

import logging
import os
import re
import subprocess
import tempfile
from contextlib import suppress

import pyttsx3
import speech_recognition as sr
from gtts import gTTS

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


async def process_voice_command(command: str, user_role: str, user_name: str | None = None) -> str:
    """Parse a voice command, query/update DB, and speak a response."""
    normalized = command.lower().strip()
    is_tamil = bool(re.search(r"[\u0B80-\u0BFF]", command))
    language = "ta" if is_tamil else "en"

    db = get_database()
    
    try:
        if "what is my next delivery" in normalized and user_role == "delivery":
            next_order = await db.products.find_one(
                {
                    "delivery_person_assigned": user_name or "",
                    "status": {"$in": ["packed", "out_for_delivery"]}
                },
                sort=[("created_at", 1)]
            )

            if not next_order:
                response = "You do not have any pending deliveries."
            else:
                response = (
                    f"Your next delivery is {next_order['order_id']} to "
                    f"{next_order['destination']}."
                )

            speak_text(response, language=language)
            return response

        if "mark order" in normalized and "delivered" in normalized:
            order_id = _extract_order_id(command)
            if not order_id:
                response = "I could not find an order ID in your command."
                speak_text(response, language=language)
                return response

            order = await db.products.find_one({"order_id": order_id})
            if not order:
                response = f"Order {order_id} was not found."
                speak_text(response, language=language)
                return response

            await db.products.update_one(
                {"order_id": order_id},
                {"$set": {"status": "delivered"}}
            )
            response = f"Order {order_id} marked as delivered."
            speak_text(response, language=language)
            return response

        if "show pending orders" in normalized:
            pending_orders = await db.products.find({"status": "created"}).to_list(length=1000)
            if not pending_orders:
                response = "There are no pending orders right now."
            else:
                response = f"There are {len(pending_orders)} pending orders."

            speak_text(response, language=language)
            return response

        if "track order" in normalized:
            order_id = _extract_order_id(command)
            if not order_id:
                response = "I could not find an order ID in your command."
                speak_text(response, language=language)
                return response

            order = await db.products.find_one({"order_id": order_id})
            if not order:
                response = f"Order {order_id} not found."
            else:
                response = (
                    f"Order {order_id} is currently {order['status']} and will go to "
                    f"{order['destination']}."
                )

            speak_text(response, language=language)
            return response

        response = "Sorry, I could not map that command to a workflow."
        speak_text(response, language=language)
        return response
    except Exception as exc:
        logger.error("Voice command processing failed: %s", exc)
        response = "An error occurred while processing your command."
        speak_text(response, language=language)
        return response
