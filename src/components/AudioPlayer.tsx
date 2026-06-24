import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw, Send, Share2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  accentColor?: string;
  voiceName?: string;
  publicUrl?: string;
}

export default function AudioPlayer({ audioUrl, title, voiceName, publicUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playIntervalRef = useRef<any>(null);

  // Web Audio API refs for robust sandbox-bypassing fallback playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const isWebAudioModeRef = useRef<boolean>(false);

  // Restart playback or switch audio element when URL changes
  useEffect(() => {
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Stop active Web Audio fallback source if any
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    pausedAtRef.current = 0;
    isWebAudioModeRef.current = false;
    audioBufferRef.current = null;

    if (audioUrl !== "webspeech" && audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioUrl !== "webspeech") {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
      }
      if (audioSourceRef.current && isWebAudioModeRef.current) {
        audioSourceRef.current.playbackRate.value = playbackRate;
      }
    }
  }, [playbackRate, audioUrl]);

  useEffect(() => {
    if (audioUrl !== "webspeech") {
      if (audioRef.current) {
        audioRef.current.muted = isMuted;
        audioRef.current.volume = isMuted ? 0 : volume;
      }
      if (gainNodeRef.current && isWebAudioModeRef.current) {
        gainNodeRef.current.gain.value = isMuted ? 0 : volume;
      }
    }
  }, [isMuted, volume, audioUrl]);

  const playWebAudioFallback = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext is not supported");
      }

      let ctx = audioContextRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContextClass();
        audioContextRef.current = ctx;
      }

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // If we already have decoded audio buffer, just replay it
      let audioBuffer = audioBufferRef.current;
      if (!audioBuffer) {
        const absoluteUrl = audioUrl.startsWith("http") || audioUrl.startsWith("data:")
          ? audioUrl
          : window.location.origin + audioUrl;

        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
      }

      // Create buffer source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;

      // Create gain node
      const gainNode = ctx.createGain();
      gainNode.gain.value = isMuted ? 0 : volume;
      gainNodeRef.current = gainNode;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      setDuration(audioBuffer.duration);

      const startOffset = pausedAtRef.current || 0;
      source.start(0, startOffset);
      
      startTimeRef.current = ctx.currentTime - startOffset;
      audioSourceRef.current = source;
      isWebAudioModeRef.current = true;
      setIsPlaying(true);

      source.onended = () => {
        if (isWebAudioModeRef.current && ctx) {
          const playedTime = ctx.currentTime - startTimeRef.current;
          if (playedTime >= audioBuffer!.duration - 0.25) {
            setIsPlaying(false);
            setCurrentTime(0);
            pausedAtRef.current = 0;
            isWebAudioModeRef.current = false;
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
          }
        }
      };

      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      playIntervalRef.current = setInterval(() => {
        if (isWebAudioModeRef.current && ctx && audioBuffer) {
          const current = ctx.currentTime - startTimeRef.current;
          if (current >= audioBuffer.duration) {
            setCurrentTime(audioBuffer.duration);
            clearInterval(playIntervalRef.current);
          } else {
            setCurrentTime(current);
          }
        }
      }, 100);

    } catch (err) {
      console.error("Web Audio API fallback playback failed completely:", err);
    }
  };

  const togglePlay = () => {
    if (audioUrl === "webspeech") {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(title);
        const voices = window.speechSynthesis.getVoices();
        
        // Match chosen voice style
        const isDoctor = voiceName?.includes("Brainy") || voiceName?.includes("doctor") || voiceName?.includes("Puck");
        if (isDoctor) {
          // English accent
          utterance.lang = "en-GB";
          const gbVoice = voices.find(v => v.lang.startsWith("en-GB")) || voices.find(v => v.lang.startsWith("en-US")) || voices.find(v => v.lang.startsWith("en"));
          if (gbVoice) {
            utterance.voice = gbVoice;
          }
          utterance.rate = playbackRate * 0.9;
        } else {
          // Casual Student (Arabic if Arabic characters exist, otherwise casual English)
          const isArabic = /[\u0600-\u06FF]/.test(title);
          if (isArabic) {
            utterance.lang = "ar";
            const arVoice = voices.find(v => v.lang.startsWith("ar"));
            if (arVoice) utterance.voice = arVoice;
          } else {
            utterance.lang = "en-US";
            const enVoice = voices.find(v => v.lang.startsWith("en-US")) || voices.find(v => v.lang.startsWith("en"));
            if (enVoice) utterance.voice = enVoice;
          }
          utterance.rate = playbackRate * 1.15;
        }

        const estimatedDuration = Math.max(3, title.length * 0.08);
        setDuration(estimatedDuration);
        setCurrentTime(0);

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        };

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);

        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        playIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            setCurrentTime((prev) => {
              if (prev >= estimatedDuration) {
                return estimatedDuration;
              }
              return prev + 0.1;
            });
          }
        }, 100);
      }
      return;
    }

    if (isWebAudioModeRef.current) {
      if (isPlaying) {
        // Pause Web Audio fallback
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.stop();
          } catch (e) {}
          audioSourceRef.current = null;
        }
        if (audioContextRef.current) {
          pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
        }
        setIsPlaying(false);
        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      } else {
        // Resume Web Audio fallback
        playWebAudioFallback();
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Standard HTMLAudioElement play failed. Trying Web Audio API fallback...", err);
          isWebAudioModeRef.current = true;
          playWebAudioFallback();
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioUrl !== "webspeech" && !isWebAudioModeRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioUrl !== "webspeech") {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioUrl === "webspeech") return; // cannot seek web speech easily
    const newTime = parseFloat(e.target.value);
    if (isWebAudioModeRef.current) {
      pausedAtRef.current = newTime;
      setCurrentTime(newTime);
      if (isPlaying) {
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.stop();
          } catch (e) {}
          audioSourceRef.current = null;
        }
        playWebAudioFallback();
      }
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleRestart = () => {
    if (audioUrl === "webspeech") {
      setIsPlaying(false);
      window.speechSynthesis.cancel();
      togglePlay();
      return;
    }
    if (isWebAudioModeRef.current) {
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
        audioSourceRef.current = null;
      }
      pausedAtRef.current = 0;
      setCurrentTime(0);
      playWebAudioFallback();
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Standard restart failed. Trying Web Audio API fallback...", err);
          isWebAudioModeRef.current = true;
          pausedAtRef.current = 0;
          playWebAudioFallback();
        });
    }
  };

  // Safe file downloader for audio WAV binary
  const triggerDownload = () => {
    try {
      const absoluteUrl = audioUrl.startsWith("http") || audioUrl.startsWith("data:")
        ? audioUrl
        : window.location.origin + audioUrl;

      if (absoluteUrl.startsWith("data:")) {
        const parts = absoluteUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "audio/wav";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `voice-${voiceName || "gemini"}-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } else {
        // Direct download in a new tab is robust and bypasses any download blocking inside sandboxed iframe!
        window.open(absoluteUrl, "_blank");
      }
    } catch (e) {
      console.error("Error triggering download:", e);
      const fallbackUrl = audioUrl.startsWith("http") ? audioUrl : window.location.origin + audioUrl;
      window.open(fallbackUrl, "_blank");
    }
  };

  const shareTelegram = () => {
    const downloadLink = publicUrl || (audioUrl.startsWith("http") ? audioUrl : window.location.origin + audioUrl);
    const textDesc = `استمع إلى مقطع صوتي بصوت (${voiceName || "gemini"}): "${title.slice(0, 50)}..."`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(downloadLink)}&text=${encodeURIComponent(textDesc)}`;
    window.open(shareUrl, "_blank");
  };

  const shareWhatsApp = () => {
    const downloadLink = publicUrl || (audioUrl.startsWith("http") ? audioUrl : window.location.origin + audioUrl);
    const textDesc = `استمع إلى مقطع صوتي بصوت (${voiceName || "gemini"}):\n"${title.slice(0, 60)}..."\n\nرابط المقطع الصوتي:\n${downloadLink}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textDesc)}`;
    window.open(shareUrl, "_blank");
  };

  // Create an array of fake waves for the beautiful visualization
  const waveBarsCount = 28;

  return (
    <div className="bg-white border border-yellow-200/60 rounded-2xl p-6 shadow-sm relative overflow-hidden" id="custom-audio-player-wrapper">
      {/* Hidden legacy native player to handle streams smoothly */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Embedded Waveform Graphic */}
      <div className="mb-4 flex flex-col items-center">
        <p className="text-xs font-mono text-amber-700/80 uppercase tracking-widest mb-1 font-semibold">
          {voiceName ? `نبرة الصوت: ${voiceName}` : "مكّبر الصوت الرقمي"}
        </p>
        <span className="text-gray-800 text-sm font-medium text-center truncate max-w-full px-4 mb-4">
          « {title.length > 80 ? title.substring(0, 80) + "..." : title} »
        </span>

        {/* Dynamic visual waves dancing back and forth */}
        <div className="h-12 flex items-center justify-center gap-[3px] w-full px-2" id="speech-waveform-bars">
          {Array.from({ length: waveBarsCount }).map((_, idx) => {
            // Give individual bars customized baseline heights so it forms a nice wave when stationary
            const staticHeight = 8 + (Math.sin(idx * 0.4) + 1) * 8;
            return (
              <div
                key={idx}
                className="w-[3px] rounded-full transition-all duration-300 bg-amber-500/70"
                style={{
                  height: isPlaying
                    ? `${Math.max(6, Math.floor(Math.random() * 40) + 4)}px`
                    : `${staticHeight}px`,
                  transitionDelay: `${idx * 15}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Control timeline bar */}
      <div className="space-y-1 mb-5" id="timeline-controls-container">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={currentTime}
          onChange={handleSeekChange}
          className="w-full h-[6px] rounded-lg appearance-none cursor-pointer bg-neutral-100 accent-amber-500 focus:outline-none"
        />
        <div className="flex justify-between items-center text-xs text-neutral-500 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main button panel */}
      <div className="flex flex-wrap items-center justify-between gap-4" id="audio-player-button-panel">
        
        {/* Playback speed toggle */}
        <div className="flex flex-wrap items-center gap-1 bg-amber-50/70 border border-amber-100 px-3 py-1.5 rounded-2xl sm:rounded-full text-xs font-medium text-amber-800">
          <span className="text-[10px] text-amber-600/80">سرعة القراءة:</span>
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`px-1.5 py-0.5 rounded text-[11px] transition ${
                playbackRate === rate
                  ? "bg-amber-600 text-white font-semibold"
                  : "hover:bg-amber-100 text-amber-900"
              }`}
            >
              x{rate}
            </button>
          ))}
        </div>

        {/* Primary playback control hub */}
        <div className="flex items-center gap-3">
          {/* Restart */}
          <button
            onClick={handleRestart}
            title="إعادة التشغيل من البداية"
            className="p-2.5 rounded-full border border-neutral-100 hover:bg-neutral-50 transition text-neutral-500"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Core play pulse button */}
          <button
            onClick={togglePlay}
            className="p-4 rounded-full bg-amber-500 text-white shadow-md hover:bg-amber-600 transition active:scale-95 duration-200"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
          </button>

          {/* Download file button */}
          <button
            onClick={triggerDownload}
            title="تحميل الملف الصوتي بصيغة WAV"
            className="p-2.5 rounded-full border border-amber-100 bg-amber-50/50 hover:bg-amber-100 transition text-amber-700 font-medium"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Share on Telegram */}
          <button
            onClick={shareTelegram}
            title="مشاركة عبر تلغرام"
            className="p-2.5 rounded-full border border-sky-100 bg-sky-50 hover:bg-sky-100 transition text-sky-700 flex items-center justify-center font-medium"
          >
            <Send className="w-4 h-4" />
          </button>

          {/* Share on WhatsApp */}
          <button
            onClick={shareWhatsApp}
            title="مشاركة عبر واتساب"
            className="p-2.5 rounded-full border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition text-emerald-700 flex items-center justify-center font-medium"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Volume management block */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-neutral-500 hover:text-neutral-700 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-16 h-1 rounded bg-neutral-100 appearance-none accent-neutral-500"
          />
        </div>
      </div>
    </div>
  );
}
