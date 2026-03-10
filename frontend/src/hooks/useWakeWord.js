import { useEffect, useRef, useState } from "react";
import { usePorcupine } from "@picovoice/porcupine-react";

/**
 * Custom hook for wake word detection using Porcupine
 * Enables hands-free voice activation with "Hey Logistics" wake word
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onWakeWordDetected - Callback when wake word is detected
 * @param {boolean} options.enabled - Whether wake word detection is enabled
 * @returns {Object} Wake word state and controls
 */
export const useWakeWord = ({ onWakeWordDetected, enabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  // Get Porcupine access key from environment variables
  const accessKey = import.meta.env.VITE_PORCUPINE_ACCESS_KEY;
  const sensitivity = parseFloat(
    import.meta.env.VITE_WAKE_WORD_SENSITIVITY || "0.5",
  );

  // Check if wake word detection is configured
  useEffect(() => {
    if (enabled && !accessKey) {
      setError(
        "Porcupine access key not configured. Please add VITE_PORCUPINE_ACCESS_KEY to your .env file.",
      );
      setIsSupported(false);
    }
  }, [enabled, accessKey]);

  // Porcupine hook configuration
  const {
    keywordDetection,
    isLoaded,
    isListening: porcupineListening,
    error: porcupineError,
    init,
    start,
    stop,
    release,
  } = usePorcupine();

  // Initialize Porcupine when enabled
  useEffect(() => {
    if (!enabled || !accessKey || !isSupported) {
      return;
    }

    const initPorcupine = async () => {
      try {
        await init(accessKey, {
          // Use built-in "Hey Google" keyword temporarily
          // In production, replace with custom "Hey Logistics" keyword file
          // Get custom keywords from: https://console.picovoice.ai/
          builtin: "Hey Google", // Temporary - replace with custom keyword
          sensitivity: sensitivity,
        });

        await start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error("Failed to initialize Porcupine:", err);
        setError(err.message || "Failed to initialize wake word detection");
        setIsSupported(false);
      }
    };

    initPorcupine();

    return () => {
      if (isLoaded) {
        stop();
        release();
        setIsListening(false);
      }
    };
  }, [
    enabled,
    accessKey,
    isSupported,
    init,
    start,
    stop,
    release,
    sensitivity,
    isLoaded,
  ]);

  // Handle wake word detection
  useEffect(() => {
    if (keywordDetection !== null) {
      console.log("Wake word detected!");
      onWakeWordDetected?.();
    }
  }, [keywordDetection, onWakeWordDetected]);

  // Handle Porcupine errors
  useEffect(() => {
    if (porcupineError) {
      console.error("Porcupine error:", porcupineError);
      setError(porcupineError.toString());
    }
  }, [porcupineError]);

  // Sync listening state
  useEffect(() => {
    setIsListening(porcupineListening && enabled);
  }, [porcupineListening, enabled]);

  return {
    isListening,
    isSupported,
    error,
    isLoaded,
  };
};

export default useWakeWord;
