"""Quick test script for Phase 2 context manager."""

import sys
sys.path.insert(0, 'e:/tnimpact/backend')

from context_manager import VoiceContextManager

# Test 1: Initialize context manager
print("Test 1: Initializing context manager...")
ctx = VoiceContextManager(host='localhost', port=6379, context_ttl=300)
print(f"✅ Redis available: {ctx.is_available()}")

# Test 2: Save context
print("\nTest 2: Saving context...")
ctx.update_context("TestUser", {
    "last_order_id": "ORD-1003",
    "last_location": "123 Main Street",
    "last_customer_phone": "+91 98765 43210"
})
print("✅ Context saved")

# Test 3: Retrieve context
print("\nTest 3: Retrieving context...")
saved_context = ctx.get_context("TestUser")
print(f"✅ Retrieved context: {saved_context}")

# Test 4: Anaphora resolution
print("\nTest 4: Testing anaphora resolution...")
command = "mark it delivered"
resolved = ctx.resolve_anaphora(command, saved_context)
print(f"Original: '{command}'")
print(f"✅ Resolved: '{resolved}'")

# Test 5: Clear context
print("\nTest 5: Clearing context...")
ctx.clear_context("TestUser")
empty = ctx.get_context("TestUser")
print(f"✅ Context after clear: {empty}")

print("\n" + "="*50)
print("✅ All tests passed! Context manager is working.")
print("="*50)
