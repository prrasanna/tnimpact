/**
 * Audio processing utilities for noise filtering and enhancement
 * Uses WebRTC Audio Processing for warehouse/vehicle environments
 */

export class NoiseFilteredAudioStream {
  constructor() {
    this.audioContext = null;
    this.stream = null;
    this.sourceNode = null;
    this.filterNode = null;
    this.compressorNode = null;
    this.destinationNode = null;
  }

  /**
   * Initialize noise-filtered audio stream
   * Applies echo cancellation, noise suppression, and automatic gain control
   * @returns {Promise<MediaStream>} Processed audio stream
   */
  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();

      // Request microphone with WebRTC constraints for noise filtering
      const constraints = {
        audio: {
          echoCancellation: true, // Remove echo from speakers
          noiseSuppression: true, // Remove background noise
          autoGainControl: true, // Normalize volume levels
          channelCount: 1, // Mono audio
          sampleRate: 16000, // Optimal for speech recognition
        },
        video: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Audio stream initialized with noise filtering");

      return this.stream;
    } catch (error) {
      console.error("Failed to initialize audio stream:", error);
      throw new Error(
        `Microphone access denied or not available: ${error.message}`,
      );
    }
  }

  /**
   * Get audio stream with advanced processing
   * Adds additional filtering for warehouse/vehicle environments
   * @returns {MediaStream} Enhanced audio stream
   */
  getProcessedStream() {
    if (!this.stream || !this.audioContext) {
      throw new Error("Audio stream not initialized. Call initialize() first.");
    }

    try {
      // Create source from microphone stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

      // High-pass filter to remove low-frequency noise (rumble, AC hum)
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = "highpass";
      this.filterNode.frequency.value = 200; // Cut off below 200Hz
      this.filterNode.Q.value = 1;

      // Dynamics compressor to normalize volume and reduce peaks
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.compressorNode.threshold.value = -50; // dB
      this.compressorNode.knee.value = 40; // dB
      this.compressorNode.ratio.value = 12; // Compression ratio
      this.compressorNode.attack.value = 0; // Seconds
      this.compressorNode.release.value = 0.25; // Seconds

      // Create destination for processed stream
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      // Connect nodes: source → filter → compressor → destination
      this.sourceNode.connect(this.filterNode);
      this.filterNode.connect(this.compressorNode);
      this.compressorNode.connect(this.destinationNode);

      console.log("Audio processing pipeline created");
      return this.destinationNode.stream;
    } catch (error) {
      console.error("Failed to create audio processing pipeline:", error);
      // Fallback to unprocessed stream
      return this.stream;
    }
  }

  /**
   * Get basic stream without additional processing
   * Uses only browser's built-in noise suppression
   * @returns {MediaStream} Basic filtered stream
   */
  getBasicStream() {
    return this.stream;
  }

  /**
   * Check if audio processing is supported
   * @returns {boolean} True if Web Audio API is available
   */
  static isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
    }
    if (this.compressorNode) {
      this.compressorNode.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.sourceNode = null;
    this.filterNode = null;
    this.compressorNode = null;
    this.stream = null;
    this.audioContext = null;
    this.destinationNode = null;

    console.log("Audio stream cleaned up");
  }
}

/**
 * Voice Activity Detection (VAD) helper
 * Detects when user is speaking vs silence
 */
export class VoiceActivityDetector {
  constructor(threshold = 0.01) {
    this.threshold = threshold;
    this.analyzer = null;
    this.dataArray = null;
  }

  /**
   * Initialize VAD with audio stream
   * @param {MediaStream} stream - Audio stream to monitor
   * @param {AudioContext} audioContext - Audio context
   */
  initialize(stream, audioContext) {
    const source = audioContext.createMediaStreamSource(stream);
    this.analyzer = audioContext.createAnalyser();
    this.analyzer.fftSize = 512;

    source.connect(this.analyzer);

    const bufferLength = this.analyzer.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  /**
   * Check if voice activity is detected
   * @returns {boolean} True if voice detected
   */
  isVoiceDetected() {
    if (!this.analyzer || !this.dataArray) {
      return false;
    }

    this.analyzer.getByteTimeDomainData(this.dataArray);

    // Calculate RMS (Root Mean Square) for volume level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    return rms > this.threshold;
  }
}

export default NoiseFilteredAudioStream;
