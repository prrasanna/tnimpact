"""Voice conversation context management using Redis."""

import json
import logging
from datetime import timedelta
from typing import Any, Dict, Optional

import redis
from redis.exceptions import ConnectionError, RedisError

logger = logging.getLogger(__name__)


class VoiceContextManager:
    """Manages conversation context for voice commands with Redis backend."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        context_ttl: int = 300,  # 5 minutes default
    ):
        """Initialize Redis client for context storage.

        Args:
            host: Redis server host
            port: Redis server port
            db: Redis database number
            context_ttl: Time-to-live for context in seconds
        """
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {host}:{port}")
        except ConnectionError:
            logger.error(f"Failed to connect to Redis at {host}:{port}")
            self.redis_client = None
        except Exception as exc:
            logger.error(f"Redis initialization error: {exc}")
            self.redis_client = None

        self.context_ttl = context_ttl
        self.fallback_storage: Dict[str, Dict[str, Any]] = {}  # In-memory fallback

    def is_available(self) -> bool:
        """Check if Redis is available."""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except RedisError:
            return False

    def _get_key(self, user_id: str) -> str:
        """Generate Redis key for user context."""
        return f"voice_context:{user_id}"

    def get_context(self, user_id: str) -> Dict[str, Any]:
        """Retrieve conversation context for a user.

        Args:
            user_id: Unique user identifier

        Returns:
            Dictionary containing conversation context
        """
        if self.is_available():
            try:
                context_json = self.redis_client.get(self._get_key(user_id))
                if context_json:
                    return json.loads(context_json)
                return {}
            except (RedisError, json.JSONDecodeError) as exc:
                logger.error(f"Error retrieving context for {user_id}: {exc}")
                return self.fallback_storage.get(user_id, {})
        else:
            # Use in-memory fallback
            return self.fallback_storage.get(user_id, {})

    def update_context(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update context and reset TTL.

        Args:
            user_id: Unique user identifier
            updates: Dictionary of context updates to merge

        Returns:
            True if successful, False otherwise
        """
        current = self.get_context(user_id)
        current.update(updates)

        if self.is_available():
            try:
                self.redis_client.setex(
                    self._get_key(user_id),
                    timedelta(seconds=self.context_ttl),
                    json.dumps(current),
                )
                logger.debug(f"Updated context for {user_id}: {updates}")
                return True
            except RedisError as exc:
                logger.error(f"Error updating context for {user_id}: {exc}")
                # Fallback to in-memory
                self.fallback_storage[user_id] = current
                return False
        else:
            # Use in-memory fallback
            self.fallback_storage[user_id] = current
            logger.debug(f"Updated in-memory context for {user_id}: {updates}")
            return True

    def clear_context(self, user_id: str) -> bool:
        """Clear all context for a user.

        Args:
            user_id: Unique user identifier

        Returns:
            True if successful, False otherwise
        """
        if self.is_available():
            try:
                self.redis_client.delete(self._get_key(user_id))
                logger.info(f"Cleared context for {user_id}")
                return True
            except RedisError as exc:
                logger.error(f"Error clearing context for {user_id}: {exc}")
                # Also clear fallback
                self.fallback_storage.pop(user_id, None)
                return False
        else:
            # Clear in-memory fallback
            self.fallback_storage.pop(user_id, None)
            logger.info(f"Cleared in-memory context for {user_id}")
            return True

    def resolve_anaphora(self, command: str, context: Dict[str, Any]) -> str:
        """Replace pronouns with actual entities from context.

        Args:
            command: User voice command
            context: Current conversation context

        Returns:
            Command with pronouns resolved
        """
        command_lower = command.lower()

        # Define pronoun mappings
        replacements = {
            "it": context.get("last_order_id", ""),
            "that": context.get("last_order_id", ""),
            "that order": context.get("last_order_id", ""),
            "this order": context.get("last_order_id", ""),
            "the customer": context.get("last_customer_phone", ""),
            "customer": context.get("last_customer_phone", ""),
            "next stop": context.get("next_delivery_location", ""),
            "there": context.get("last_location", ""),
        }

        resolved = command
        for pronoun, entity in replacements.items():
            if entity and pronoun in command_lower:
                # Case-insensitive replacement
                import re

                pattern = re.compile(re.escape(pronoun), re.IGNORECASE)
                resolved = pattern.sub(entity, resolved, count=1)

        if resolved != command:
            logger.info(f"Resolved anaphora: '{command}' -> '{resolved}'")

        return resolved

    def extract_entities(self, command: str, intent: str) -> Dict[str, Any]:
        """Extract entities from command to store in context.

        Args:
            command: User voice command
            intent: Detected intent

        Returns:
            Dictionary of extracted entities
        """
        entities = {}

        # Extract order ID
        import re

        order_match = re.search(r"(ORD-?\d+|\b\d{3,}\b)", command, re.IGNORECASE)
        if order_match:
            order_id = order_match.group(1).upper()
            if not order_id.startswith("ORD"):
                order_id = f"ORD-{order_id}"
            entities["last_order_id"] = order_id

        # Extract phone numbers
        phone_match = re.search(r"\+?\d{10,13}", command)
        if phone_match:
            entities["last_customer_phone"] = phone_match.group(0)

        # Store intent
        entities["last_intent"] = intent

        return entities

    def get_context_summary(self, user_id: str) -> str:
        """Get human-readable context summary.

        Args:
            user_id: Unique user identifier

        Returns:
            Formatted context summary
        """
        context = self.get_context(user_id)
        if not context:
            return f"No active context for user {user_id}"

        summary = f"Context for {user_id}:\n"
        for key, value in context.items():
            summary += f"  - {key}: {value}\n"

        return summary.strip()


# Singleton instance
_context_manager: Optional[VoiceContextManager] = None


def get_context_manager() -> VoiceContextManager:
    """Get or create the singleton context manager instance."""
    global _context_manager
    if _context_manager is None:
        import os

        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        context_ttl = int(os.getenv("VOICE_CONTEXT_TTL", "300"))

        _context_manager = VoiceContextManager(
            host=redis_host, port=redis_port, context_ttl=context_ttl
        )

    return _context_manager
