import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, SendHorizontal } from "lucide-react";
import { voiceAPI } from "../utils/api";

// Reusable functional voice assistant panel UI.
function VoicePanel({
  title = "Voice Assistant",
  onProcessCommand,
  listeningLabel = "Listening...",
  idleHint = "Click start and speak a command.",
}) {
  const recognitionRef = useRef(null);
  const pendingSpeechRef = useRef("");
  const audioRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState(idleHint);
  const [manualCommand, setManualCommand] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const hasTamilText = (text) => /[\u0B80-\u0BFF]/.test(text || "");

  const toTtsLanguage = (lang) =>
    (lang || "").toLowerCase().startsWith("ta") ? "ta" : "en";

  const pickBestVoice = (lang) => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    if (!voices.length) {
      return null;
    }

    const exact = voices.find(
      (voice) => voice.lang?.toLowerCase() === lang.toLowerCase(),
    );
    if (exact) {
      return exact;
    }

    const base = lang.split("-")[0].toLowerCase();
    const sameLanguage = voices.find((voice) =>
      voice.lang?.toLowerCase().startsWith(base),
    );

    if (sameLanguage) {
      return sameLanguage;
    }

    // Never fallback Tamil to an unrelated voice.
    if (base === "ta") {
      return null;
    }

    return voices[0] || null;
  };

  const splitBilingualText = (text) => {
    const lines = (text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length >= 2) {
      return {
        taLine: lines.find((line) => hasTamilText(line)) || "",
        enLine: lines.find((line) => !hasTamilText(line)) || "",
      };
    }

    if (!hasTamilText(text)) {
      return { taLine: "", enLine: "" };
    }

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      taLine: sentences.filter((line) => hasTamilText(line)).join(" "),
      enLine: sentences.filter((line) => !hasTamilText(line)).join(" "),
    };
  };

  const speakWithBrowserVoice = (text, lang) =>
    new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const selectedVoice = pickBestVoice(lang);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    });

  const speakWithServerTts = async (text, language) => {
    const blob = await voiceAPI.synthesizeSpeech({
      command: text,
      language: toTtsLanguage(language),
    });

    const objectUrl = URL.createObjectURL(blob);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
      if (audioRef.current?.src === objectUrl) {
        audioRef.current = null;
      }
    }
  };

  const speak = async (text) => {
    const { taLine, enLine } = splitBilingualText(text);

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (taLine) {
      const taVoice = pickBestVoice("ta-IN");
      if (taVoice) {
        const tamilSpoken = await speakWithBrowserVoice(taLine, "ta-IN");
        if (!tamilSpoken) {
          await speakWithServerTts(taLine, "ta");
        }
      } else {
        await speakWithServerTts(taLine, "ta");
      }

      if (enLine) {
        const englishSpoken = await speakWithBrowserVoice(enLine, "en-IN");
        if (!englishSpoken) {
          await speakWithServerTts(enLine, "en");
        }
      }
      return;
    }

    const preferredVoice = pickBestVoice(voiceLanguage);
    const requiresTamilFallback =
      toTtsLanguage(voiceLanguage) === "ta" && !preferredVoice;

    if (requiresTamilFallback || !window.speechSynthesis) {
      await speakWithServerTts(text, voiceLanguage);
      return;
    }

    const spoken = await speakWithBrowserVoice(text, voiceLanguage);
    if (!spoken) {
      await speakWithServerTts(text, voiceLanguage);
    }
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
        pendingSpeechRef.current = response;
      } else {
        await speak(response);
      }
    } catch {
      const errorMessage =
        "Command processing failed. Please try again or use manual command input.";
      setResponseText(errorMessage);

      if (source === "voice") {
        pendingSpeechRef.current = errorMessage;
      } else {
        await speak(errorMessage);
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
      speak(unsupportedMessage).catch(() => {
        setResponseText(unsupportedMessage);
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = voiceLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setResponseText(listeningLabel);
    };

    recognition.onresult = (event) => {
      const heardText = event.results?.[0]?.[0]?.transcript || "";
      setTranscript(heardText);
      processCommand(heardText, "voice");
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
          speak(speechText).catch(() => {
            setResponseText("Unable to play voice response. Please retry.");
          });
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

      <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
        Heard:{" "}
        {transcript ||
          (isListening ? listeningLabel : "No command captured yet.")}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={voiceLanguage}
          onChange={(event) => setVoiceLanguage(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        >
          <option value="en-IN">English (India)</option>
          <option value="ta-IN">Tamil</option>
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
    </div>
  );
}

export default VoicePanel;
