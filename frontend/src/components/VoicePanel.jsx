import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

// Reusable functional voice assistant panel UI.
function VoicePanel({
  title = "Voice Assistant",
  onProcessCommand,
  listeningLabel = "Listening...",
  idleHint = "Click start and speak a command.",
}) {
  const recognitionRef = useRef(null);
  const pendingSpeechRef = useRef("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState(idleHint);
  const [manualCommand, setManualCommand] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
    return (
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(base)) ||
      voices[0]
    );
  };

  const speak = (text) => {
    if (!window.speechSynthesis) {
      return;
    }

    const [taLine, enLine] = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    window.speechSynthesis.cancel();

    if (taLine && enLine) {
      const taUtterance = new SpeechSynthesisUtterance(taLine);
      taUtterance.lang = "ta-IN";
      const taVoice = pickBestVoice("ta-IN");
      if (taVoice) {
        taUtterance.voice = taVoice;
      }

      const enUtterance = new SpeechSynthesisUtterance(enLine);
      enUtterance.lang = "en-IN";
      const enVoice = pickBestVoice("en-IN");
      if (enVoice) {
        enUtterance.voice = enVoice;
      }

      taUtterance.onend = () => {
        window.speechSynthesis.speak(enUtterance);
      };

      window.speechSynthesis.speak(taUtterance);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage;
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
        speak(response);
      }
    } catch {
      const errorMessage =
        "Command processing failed. Please try again or use manual command input.";
      setResponseText(errorMessage);

      if (source === "voice") {
        pendingSpeechRef.current = errorMessage;
      } else {
        speak(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const unsupportedMessage =
        "Speech recognition is not supported in this browser. Use manual command input below.";
      setResponseText(unsupportedMessage);
      speak(unsupportedMessage);
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

      if (pendingSpeechRef.current) {
        const speechText = pendingSpeechRef.current;
        pendingSpeechRef.current = "";
        setTimeout(() => {
          speak(speechText);
        }, 120);
      }
    };

    recognition.start();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h3>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={voiceLanguage}
          onChange={(event) => setVoiceLanguage(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="en-IN">English (India)</option>
          <option value="ta-IN">Tamil</option>
        </select>

        <button
          type="button"
          onClick={startListening}
          disabled={isListening || isProcessing}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {isListening ? <Mic size={16} /> : <MicOff size={16} />}
          {isListening ? listeningLabel : "Start Listening"}
        </button>

        <button
          type="button"
          onClick={stopListening}
          disabled={!isListening}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
        >
          Stop
        </button>

        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Volume2 size={16} />
          Auto voice response enabled
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Heard: {transcript || "No command captured yet."}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
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
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => {
            processCommand(manualCommand, "manual");
            setManualCommand("");
          }}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isProcessing ? "Running..." : "Run Command"}
        </button>
      </div>

      <div className="min-h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Response: {responseText}
      </div>
    </div>
  );
}

export default VoicePanel;
