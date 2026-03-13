import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, SendHorizontal } from "lucide-react";
import { voiceAPI } from "../utils/api";

// Common command corrections for speech recognition errors
const COMMAND_CORRECTIONS = {
  // Common order ID variations
  "ord": "ORD",
  "order": "ORD",
  "audi": "ORD",
  "audio": "ORD",
  
  // Status variations
  "delivered": "delivered",
  "deliver": "delivered",
  "delivery": "delivered",
  "deliverd": "delivered",
  "delievered": "delivered",
  
  "packed": "packed",
  "pack": "packed",
  "pact": "packed",
  "pat": "packed",
  
  "mark": "mark",
  "mac": "mark",
  "mak": "mark",
  
  // Action words
  "as": "as",
  "has": "as",
  "is": "as",
};

// Normalize command to fix common speech recognition errors
const normalizeCommand = (text) => {
  let normalized = text.toLowerCase().trim();
  
  // Fix "rd" or "r d" to "ORD" (common when "ord" is misheard)
  normalized = normalized.replace(/\b(r\s*d|rd)\s+(\d+)/gi, "ORD-$2");
  
  // Fix common order ID patterns
  normalized = normalized.replace(/\b(ord|order|audi|audio)\s*[-_]?\s*(\d+)/gi, "ORD-$2");
  
  // Fix "marcus" or similar mishears to "mark as"
  normalized = normalized.replace(/\b(marcus|markus|marcos)\b/gi, "mark as");
  
  // Fix status commands - support flexible word order
  // Match patterns like "picked ORD-123" or "ORD-123 picked" and normalize to "mark as picked ORD-123"
  normalized = normalized.replace(/\b(picked|pick)\s+(ORD-\d+)\b/gi, "mark as picked $2");
  normalized = normalized.replace(/\b(ORD-\d+)\s+(picked|pick)\b/gi, "mark as picked $1");
  
  normalized = normalized.replace(/\b(packed|pack)\s+(ORD-\d+)\b/gi, "mark as packed $2");
  normalized = normalized.replace(/\b(ORD-\d+)\s+(packed|pack)\b/gi, "mark as packed $1");
  
  normalized = normalized.replace(/\b(delivered|deliver)\s+(ORD-\d+)\b/gi, "mark as delivered $2");
  normalized = normalized.replace(/\b(ORD-\d+)\s+(delivered|deliver)\b/gi, "mark as delivered $1");
  
  normalized = normalized.replace(/\b(shipped|ship)\s+(ORD-\d+)\b/gi, "mark as shipped $2");
  normalized = normalized.replace(/\b(ORD-\d+)\s+(shipped|ship)\b/gi, "mark as shipped $1");

  // Fix start/begin delivery phrases (maps to shipped/out-for-delivery)
  normalized = normalized.replace(/\b(start|begin)\s+(the\s+)?delivery\s+(for\s+)?(ORD-\d+)\b/gi, "mark as shipped $4");
  normalized = normalized.replace(/\b(ORD-\d+)\s+(start|begin)\s+(the\s+)?delivery\b/gi, "mark as shipped $1");
  normalized = normalized.replace(/\b(send|move)\s+(it\s+)?for\s+delivery\s+(ORD-\d+)\b/gi, "mark as shipped $3");
  normalized = normalized.replace(/\b(ORD-\d+)\s+(send|move)\s+(it\s+)?for\s+delivery\b/gi, "mark as shipped $1");
  normalized = normalized.replace(/\b(start|begin)\s+delivery\b/gi, "mark as shipped");
  normalized = normalized.replace(/\b(start|begin)\s+deliver\b/gi, "mark as shipped");
  
  // Fix "mark as picked" variations (after order ID normalization)
  normalized = normalized.replace(/\b(mark|mac|mak)\s+(as|has|is)\s+(picked|pick)\b/gi, "mark as picked");
  
  // Fix "mark as shipped" variations
  normalized = normalized.replace(/\b(mark|mac|mak)\s+(as|has|is)\s+(shipped|ship|shift|sheep)\b/gi, "mark as shipped");
  
  // Fix "mark as delivered" variations
  normalized = normalized.replace(/\b(mark|mac|mak)\s+(as|has|is)\s+(delivered|deliver|delivery|deliverd)\b/gi, "mark as delivered");
  
  // Fix "mark as packed" variations
  normalized = normalized.replace(/\b(mark|mac|mak)\s+(as|has|is)\s+(packed|pack|pact)\b/gi, "mark as packed");
  
  // Fix "show my orders" variations
  normalized = normalized.replace(/\b(show|so|showed)\s+(my|mai|by)\s+(orders|order|audios)\b/gi, "show my orders");
  
  // Fix "track order" variations
  normalized = normalized.replace(/\b(track|tract|crack)\s+(order|audio|audi)\b/gi, "track order");
  
  // Pad single/double/triple digit order numbers with zeros
  normalized = normalized.replace(/ORD-(\d{1,3})\b/g, (match, num) => {
    return `ORD-${num.padStart(4, '0')}`;
  });
  
  return normalized;
};

// Reusable functional voice assistant panel UI.
function VoicePanel({
  title = "Voice Assistant",
  onProcessCommand,
  listeningLabel = "Listening...",
  idleHint = "Click start and speak a command.",
}) {
  const recognitionRef = useRef(null);
  const pendingSpeechRef = useRef("");
  const speechQueueRef = useRef(Promise.resolve());
  const activeAudioRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState(idleHint);
  const [manualCommand, setManualCommand] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const enqueueSpeech = (task) => {
    speechQueueRef.current = speechQueueRef.current
      .then(() => task())
      .catch(() => undefined);
    return speechQueueRef.current;
  };

  const playAudioBlob = (blob) =>
    new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        activeAudioRef.current = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        activeAudioRef.current = null;
        reject(new Error("Failed to play audio"));
      };

      audio.play().catch((error) => {
        URL.revokeObjectURL(audioUrl);
        activeAudioRef.current = null;
        reject(error);
      });
    });

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Load voices on component mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };

    // Load voices immediately
    loadVoices();

    // Chrome requires waiting for voiceschanged event
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const pickBestVoice = (lang) => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    if (!voices.length) {
      console.log("No voices available");
      return null;
    }

    // Try exact match first
    const exact = voices.find(
      (voice) => voice.lang?.toLowerCase() === lang.toLowerCase(),
    );
    if (exact) {
      console.log(`Found exact voice for ${lang}:`, exact.name);
      return exact;
    }

    // Try language family match
    const base = lang.split("-")[0].toLowerCase();
    const familyMatch = voices.find((voice) => 
      voice.lang?.toLowerCase().startsWith(base)
    );
    
    if (familyMatch) {
      console.log(`Found family match for ${lang}:`, familyMatch.name);
      return familyMatch;
    }
    
    console.log(`No voice found for ${lang}, using default`);
    return voices[0];
  };

  const speak = async (text) => {
    if (!window.speechSynthesis) {
      return;
    }

    // Ensure voices are loaded
    if (!voicesLoaded) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    }

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const [taLine, enLine] = lines;

    window.speechSynthesis.cancel();

    // If both Tamil and English text exist (bilingual response)
    if (taLine && enLine && lines.length >= 2) {
      try {
        // Reliable Tamil audio from backend gTTS.
        const taBlob = await voiceAPI.synthesizeSpeech({
          command: taLine,
          language: "ta",
        });
        await playAudioBlob(taBlob);
      } catch {
        // Fallback to browser speech synthesis for Tamil.
        const taUtterance = new SpeechSynthesisUtterance(taLine);
        taUtterance.lang = "ta-IN";
        taUtterance.rate = 0.85;
        taUtterance.pitch = 0.9;
        taUtterance.volume = 0.9;
        const taVoice = pickBestVoice("ta-IN");
        if (taVoice) {
          taUtterance.voice = taVoice;
        }
        window.speechSynthesis.speak(taUtterance);
      }

      const enUtterance = new SpeechSynthesisUtterance(enLine);
      enUtterance.lang = "en-IN";
      enUtterance.rate = 0.85;
      enUtterance.pitch = 0.9;
      enUtterance.volume = 0.9;
      const enVoice = pickBestVoice("en-IN");
      if (enVoice) {
        enUtterance.voice = enVoice;
      }
      window.speechSynthesis.speak(enUtterance);
      return;
    }

    // Single language response
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage;
    utterance.rate = 0.85; // Slower, softer speech
    utterance.pitch = 0.9; // Slightly lower pitch for softer tone
    utterance.volume = 0.9; // Slightly lower volume
    const selectedVoice = pickBestVoice(voiceLanguage);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const processCommand = async (command, source = "manual") => {
    if (!command.trim()) {
      return;
    }

    setLastCommand(command.trim());

    try {
      setIsProcessing(true);
      setResponseText("Processing command...");

      const response =
        (await onProcessCommand?.(command)) ||
        "No action mapped for this command.";

      setResponseText(response);

      if (source === "voice") {
        if (recognitionRef.current) {
          pendingSpeechRef.current = response;
        } else {
          void enqueueSpeech(() => speak(response));
        }
      } else {
        void enqueueSpeech(() => speak(response));
      }
    } catch {
      const errorMessage =
        "Command processing failed. Please try again or use manual command input.";
      setResponseText(errorMessage);

      if (source === "voice") {
        if (recognitionRef.current) {
          pendingSpeechRef.current = errorMessage;
        } else {
          void enqueueSpeech(() => speak(errorMessage));
        }
      } else {
        void enqueueSpeech(() => speak(errorMessage));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const startListening = () => {
    if (isListening) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const unsupportedMessage =
        "Speech recognition is not supported in this browser. Use manual command input below.";
      setResponseText(unsupportedMessage);
      void enqueueSpeech(() => speak(unsupportedMessage));
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = voiceLanguage;
    recognition.interimResults = true; // Enable interim results for better accuracy
    recognition.maxAlternatives = 5; // Get multiple alternatives to choose best match
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setResponseText(listeningLabel);
    };

    recognition.onresult = (event) => {
      // Get all alternatives and pick the best one
      const results = event.results[event.results.length - 1];
      const alternatives = [];
      
      for (let i = 0; i < results.length; i++) {
        alternatives.push({
          text: results[i].transcript,
          confidence: results[i].confidence
        });
      }
      
      // Sort by confidence and pick the best
      alternatives.sort((a, b) => b.confidence - a.confidence);
      const bestMatch = alternatives[0]?.text || "";
      
      // Apply normalization to fix common errors
      const normalizedText = normalizeCommand(bestMatch);
      
      setTranscript(normalizedText);
      
      // Only process final results
      if (event.results[event.results.length - 1].isFinal) {
        processCommand(normalizedText, "voice");
      }
    };

    recognition.onerror = (event) => {
      const errorMap = {
        "not-allowed":
          "Microphone access denied. Please allow microphone permission in browser settings.",
        "no-speech": "No speech detected. Please speak clearly and try again.",
        "audio-capture":
          "No microphone detected. Please connect a mic and try again.",
        network: "Network issue during speech recognition. Please retry.",
      };

      setResponseText(
        errorMap[event.error] ||
          "Could not capture voice command. Please try again.",
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      if (pendingSpeechRef.current) {
        const speechText = pendingSpeechRef.current;
        pendingSpeechRef.current = "";
        setTimeout(() => {
          void enqueueSpeech(() => speak(speechText));
        }, 120);
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setResponseText("Microphone could not start. Please try again.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      {title ? (
        <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      ) : null}

      <div className="mb-3 grid gap-3 lg:grid-cols-[1.4fr_auto_1.4fr]">
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-slate-300">
          <p className="text-sm font-medium">Assistant online</p>
          <p className="mt-1 text-xs text-slate-400">
            Speech recognition ready
          </p>
        </div>

        <button
          type="button"
          onClick={toggleListening}
          disabled={isProcessing}
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-white transition ${
            isListening
              ? "bg-red-500 hover:bg-red-600"
              : "bg-emerald-500 hover:bg-emerald-600"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          <Mic size={18} />
        </button>

        <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-slate-300">
          <p className="text-xs font-semibold uppercase text-cyan-300">
            Last command
          </p>
          <p className="mt-1 text-sm text-slate-100">
            {lastCommand ? `“${lastCommand}”` : "No command yet."}
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800 p-3">
        <p className="mb-1 text-xs font-semibold uppercase text-cyan-300">
          Heard (Auto-corrected)
        </p>
        <p className="text-sm text-slate-300">
          {transcript ||
            (isListening ? listeningLabel : "No command captured yet.")}
        </p>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={voiceLanguage}
          onChange={(event) => setVoiceLanguage(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          title="Select language for voice recognition and speech"
        >
          <option value="en-IN">🇮🇳 English (India)</option>
          <option value="ta-IN">🇮🇳 தமிழ் (Tamil)</option>
          <option value="en-US">🇺🇸 English (US)</option>
        </select>

        <input
          value={manualCommand}
          onChange={(event) => setManualCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              processCommand(manualCommand, "manual");
              setManualCommand("");
            }
          }}
          placeholder="Type command manually (e.g., Track order ORD-1001)"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => {
            processCommand(manualCommand, "manual");
            setManualCommand("");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizontal size={14} />
          {isProcessing ? "Running..." : "Run Command"}
        </button>
      </div>

      <div className="min-h-20 rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200">
        <p className="mb-1 inline-flex items-center gap-2 text-cyan-300">
          <AudioLines size={14} /> ASSISTANT RESPONSE
        </p>
        <p>{responseText}</p>
      </div>

      <div className="mt-3 rounded-xl border border-blue-800/30 bg-blue-900/20 p-3 text-xs text-blue-200">
        <p className="mb-1 font-semibold">💡 Voice Tips (Flexible Word Order):</p>
        <ul className="ml-4 list-disc space-y-0.5 text-blue-300/90">
          <li>Say: "ORD 002 mark as picked" OR "mark as picked ORD 002"</li>
          <li>Or: "picked ORD-0001" OR "ORD-0001 picked"</li>
          <li>Or: "mark ORD 003 as shipped" (any order works!)</li>
          <li>Or: "Show my orders" or "Track order ORD-0001"</li>
          <li>🎤 Bilingual Voice: Speaks Tamil first, then English</li>
          <li>Works in both English and Tamil ✨</li>
        </ul>
        {!voicesLoaded && (
          <p className="mt-2 text-xs text-yellow-300">
            ⚠ Voices loading... If Tamil voice doesn't work, check browser settings.
          </p>
        )}
      </div>
    </div>
  );
}

export default VoicePanel;
