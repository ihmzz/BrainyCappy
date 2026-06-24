import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Volume2, 
  RefreshCw, 
  Trash2, 
  GraduationCap, 
  User,
  Download,
  Play,
  Send,
  Share2
} from "lucide-react";
import { GeneratedSpeech } from "./types";
import AudioPlayer from "./components/AudioPlayer";

export default function App() {
  const [text, setText] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<"doctor" | "student">("doctor");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useWebSpeech, setUseWebSpeech] = useState<boolean>(false);
  const [history, setHistory] = useState<GeneratedSpeech[]>([]);
  const [activePlayback, setActivePlayback] = useState<{ url: string; text: string; voice: string; publicUrl?: string } | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tts_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load local storage history", e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: GeneratedSpeech[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("tts_history", JSON.stringify(newHistory));
    } catch (e: any) {
      if (e.name === "QuotaExceededError" || e.code === 22) {
        console.warn("Storage quota exceeded, pruning old items...");
        let superPruned = [...newHistory].slice(0, 3);
        try {
          localStorage.setItem("tts_history", JSON.stringify(superPruned));
          setHistory(superPruned);
        } catch (finalError) {
          localStorage.removeItem("tts_history");
          setHistory([]);
        }
      }
    }
  };

  const handleClearText = () => {
    setText("");
    setApiError(null);
  };

  const removeHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter((item) => item.id !== id);
    saveHistory(filtered);
    if (activePlayback && history.find(h => h.id === id)?.audioUrl === activePlayback.url) {
      setActivePlayback(null);
    }
  };

  const clearAllHistory = () => {
    if (confirm("هل أنت متأكد من مسح جميع مقاطع الصوت المخزنة؟")) {
      saveHistory([]);
      setActivePlayback(null);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setApiError("الرجاء كتابة نص أولاً لتحويله إلى كلام مسموع.");
      return;
    }

    setIsGenerating(true);
    setApiError(null);

    // Get mapped voice config for Dr. Brainy or Cappy
    const voiceConfig = selectedVoice === "doctor" ? {
      apiVoice: "Puck",
      label: "الدكتور Brainy",
      stylePrompt: "A scholarly middle-aged English professor named Dr. Brainy speaking with a highly distinct British Received Pronunciation accent. Extremely intellectual, authoritative, articulates perfectly like lecturing students in a British university classroom, clear academic British English tone, warm and educational"
    } : {
      apiVoice: "Zephyr",
      label: "الطالب Cappy",
      stylePrompt: "A teenage school student named Cappy speaking in English. Energetic, youthful, informal, natural high school teenager, friendly tone"
    };

    if (useWebSpeech) {
      setTimeout(() => {
        const simulatedSpeech: GeneratedSpeech = {
          id: `webspeech_${Date.now()}`,
          text: text.trim(),
          voice: voiceConfig.apiVoice,
          style: `${voiceConfig.label} (محلي)`,
          audioUrl: "webspeech",
          timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" }),
        };

        const updatedHistory = [simulatedSpeech, ...history].slice(0, 15);
        saveHistory(updatedHistory);
        setActivePlayback({
          url: "webspeech",
          text: text.trim(),
          voice: voiceConfig.label,
        });
        setIsGenerating(false);
      }, 600);
      return;
    }

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: voiceConfig.apiVoice,
          style: voiceConfig.stylePrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || "فشلت عملية توليد ملف الصوت.");
      }

      const newSpeech: GeneratedSpeech = {
        id: Date.now().toString(),
        text: text.trim(),
        voice: voiceConfig.apiVoice,
        style: voiceConfig.label,
        audioUrl: data.audioUrl,
        publicUrl: data.publicUrl,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" }),
      };

      const updatedHistory = [newSpeech, ...history].slice(0, 15);
      saveHistory(updatedHistory);
      setActivePlayback({
        url: data.audioUrl,
        text: text.trim(),
        voice: voiceConfig.label,
        publicUrl: data.publicUrl,
      });
    } catch (err: any) {
      const errMsg = err.message || "عذراً، حدث خطأ غير متوقع أثناء توليد الصوت.";
      const isQuota = errMsg.includes("الحصة") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.toLowerCase().includes("exceeded");
      
      if (isQuota) {
        console.log("TTS Notice: Quota limit reached. Initiated local client-side voice reader fallback.");
      } else {
        console.log("TTS Info: An unexpected generation issue occurred.");
      }
      
      // Auto fallback message
      if (isQuota) {
        // Auto toggle to web speech to help user experience
        setUseWebSpeech(true);
        
        // INSTANT AUTOMATIC FALLBACK PLAYBACK:
        const simulatedSpeech: GeneratedSpeech = {
          id: `webspeech_${Date.now()}`,
          text: text.trim(),
          voice: voiceConfig.apiVoice,
          style: `${voiceConfig.label} (محلي)`,
          audioUrl: "webspeech",
          timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" }),
        };

        const updatedHistory = [simulatedSpeech, ...history].slice(0, 15);
        saveHistory(updatedHistory);
        setActivePlayback({
          url: "webspeech",
          text: text.trim(),
          voice: voiceConfig.label,
        });

        setApiError("⚠️ تم تفعيل نظام النطق الصوتي المدمج بالمتصفح تلقائياً لتجاوز حد الحصة السحابية! يعمل هذا النظام الذكي فورا وبلا حدود لمواصلة الاستماع مجاناً.");
      } else {
        setApiError(errMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe download trigger for historic clips (forces new-tab downloads to bypass iframe blocks)
  const downloadUrl = (url: string, label: string, publicUrl?: string) => {
    try {
      const targetUrl = publicUrl || (url.startsWith("http") || url.startsWith("data:") ? url : window.location.origin + url);
      
      if (targetUrl.startsWith("data:")) {
        const parts = targetUrl.split(",");
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
        link.download = `voice-${label || "audio"}-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } else {
        // Opening direct attachment URL in new tab is robust and bypasses sandboxing
        window.open(targetUrl, "_blank");
      }
    } catch (e) {
      console.error("Error downloading file:", e);
      const fallbackUrl = url.startsWith("http") ? url : window.location.origin + url;
      window.open(fallbackUrl, "_blank");
    }
  };

  const shareToTelegram = (url: string, textStr: string, voiceName: string, publicUrl?: string) => {
    const downloadLink = publicUrl || (url.startsWith("http") ? url : window.location.origin + url);
    const textDesc = `استمع إلى مقطع صوتي بصوت (${voiceName}): "${textStr.slice(0, 50)}..."`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(downloadLink)}&text=${encodeURIComponent(textDesc)}`;
    window.open(shareUrl, "_blank");
  };

  const shareToWhatsApp = (url: string, textStr: string, voiceName: string, publicUrl?: string) => {
    const downloadLink = publicUrl || (url.startsWith("http") ? url : window.location.origin + url);
    const textDesc = `استمع إلى مقطع صوتي بصوت (${voiceName}):\n"${textStr.slice(0, 60)}..."\n\nرابط المقطع الصوتي:\n${downloadLink}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textDesc)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between" dir="rtl" id="app-root-container">
      
      {/* Header element */}
      <header className="bg-white border-b border-slate-100 py-5" id="app-header">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">محوّل الصوت الذكي المبسّط</h1>
              <p className="text-xs text-slate-400">حوّل نصوصك فوراً إلى صوت د .Brainy أو طالب مراهق Cappy</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Single-column layout for strict minimalist look */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6" id="app-main-content">
        
        {/* Step 1: Text Arena with Borderless Layout (بلا حدود) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3" id="text-input-card">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>اكتب العبارات باللغة العربية أو الإنجليزية أدناه:</span>
            {text && (
              <button onClick={handleClearText} className="hover:text-red-500 transition">
                تفريغ الحقل
              </button>
            )}
          </div>
          
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (apiError) setApiError(null);
            }}
            placeholder="اكتب هنا النص المراد نُطقه بصوت الدكتور Brainy أو الطالب Cappy..."
            className="w-full h-44 p-4 bg-slate-50/50 hover:bg-slate-100/30 rounded-xl resize-none text-slate-800 placeholder-slate-400 text-lg leading-relaxed focus:outline-none transition-all duration-200 border-0 ring-0 filter-none"
            id="text-speech-textarea"
          />

          <div className="text-[11px] text-slate-400 text-left">
            <span>{text.length} حرف</span>
          </div>
        </div>

        {/* Step 2: Big Elegant Voice Selector Buttons */}
        <div className="space-y-2">
          <span className="text-xs text-slate-400 font-medium px-1 block mb-2">اختر المتحدّث لنوع النبرة المطلوبة:</span>
          <div className="grid grid-cols-2 gap-4" id="simplified-voice-selector">
            
            {/* Dr. Brainy */}
            <button
              onClick={() => setSelectedVoice("doctor")}
              className={`p-4 rounded-2xl border text-right transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group ${
                selectedVoice === "doctor"
                  ? "border-amber-500 bg-amber-50/30 text-amber-950 font-semibold ring-2 ring-amber-100"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${selectedVoice === "doctor" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold block">🎓 الدكتور Brainy</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                أكاديمي جامعي، يتحدث بذكاء ونبرة علمية شرحيّة محفزة.
              </p>
            </button>

            {/* Student Cappy */}
            <button
              onClick={() => setSelectedVoice("student")}
              className={`p-4 rounded-2xl border text-right transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group ${
                selectedVoice === "student"
                  ? "border-amber-500 bg-amber-50/30 text-amber-950 font-semibold ring-2 ring-amber-100"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${selectedVoice === "student" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <User className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold block">🎒 الطالب Cappy</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                مراهق حيوي، يتحدث بأسلوب شبابي وطبيعي معاصر.
              </p>
            </button>

          </div>
        </div>

        {/* Step 2.5: Speech Engine Settings Toggle */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right">
          <div>
            <span className="text-xs font-bold text-slate-800 block">🔊 مصدر ومحرك نطق العبارات:</span>
            <p className="text-[11px] text-slate-500 mt-1">
              {useWebSpeech 
                ? "يتم الآن استخدام قارئ المتصفح المدمج المباشر (سريع، مجاني، بدون حدود للحصة اليومية)." 
                : "يتم الآن استخدام الذكاء الاصطناعي السحابي التوليدي (أصوات طبيعية فائقة الدقة)."}
            </p>
          </div>
          <button
            onClick={() => {
              setUseWebSpeech(!useWebSpeech);
              setApiError(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              useWebSpeech
                ? "bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                : "bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-600"
            }`}
          >
            {useWebSpeech ? "التبديل للنظام السحابي ☁️" : "تفعيل القارئ المحلي (بلا حدود) 🚀"}
          </button>
        </div>

        {/* Action button & Alerts */}
        <div className="space-y-3">
          {apiError && (
            <div className="bg-rose-50 border border-rose-200/50 text-rose-800 rounded-xl p-4 text-xs font-medium leading-relaxed">
              {apiError}
            </div>
          )}

          <button
            onClick={handleGenerateSpeech}
            disabled={isGenerating || !text.trim()}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              isGenerating
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : !text.trim()
                ? "bg-amber-100 text-amber-400/80 cursor-not-allowed"
                : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm active:scale-[0.995]"
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>جاري تحويل النص إلى نبرات صوتية...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>توليد النطق الفوري الأصيل ✨</span>
              </>
            )}
          </button>
        </div>

        {/* Current Audio Player */}
        {activePlayback && (
          <div className="pt-2">
            <span className="text-xs text-slate-400 mb-2 block font-medium">المقطع الصوتي النشط الحالي:</span>
            <AudioPlayer
              audioUrl={activePlayback.url}
              title={activePlayback.text}
              voiceName={activePlayback.voice}
              publicUrl={activePlayback.publicUrl}
            />
          </div>
        )}

        {/* Saved clips / history (مكان احفظ منه المقطع الصوتي واشغله منه) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              📁 المقاطع والمحفوظات السابقة ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="text-xs text-slate-400 hover:text-red-500 transition px-2 py-1 rounded hover:bg-red-50"
              >
                تفريغ السجل
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              لا توجد مقاطع محفوظة حالياً. سيتم حفظ أي صوت تقوم بتوليده هنا تلقائياً لسهولة التشغيل والتنزيل.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {history.map((item) => {
                const isPlayingActive = activePlayback?.url === item.audioUrl;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 text-right group transition-all ${
                      isPlayingActive ? "bg-amber-50/30 border-amber-300" : "bg-slate-50/50 border-slate-150 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold text-slate-900">{item.style}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({item.timestamp})</span>
                      </div>
                      <p className="text-slate-600 truncate max-w-xs">{item.text}</p>
                    </div>

                    {/* Quick controls: play & download & share */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setActivePlayback({
                            url: item.audioUrl,
                            text: item.text,
                            voice: item.style,
                            publicUrl: item.publicUrl,
                          });
                        }}
                        className={`p-1.5 rounded-lg border transition ${
                          isPlayingActive 
                            ? "bg-amber-500 border-amber-600 text-white" 
                            : "bg-white border-slate-200 hover:border-amber-400 text-slate-600 hover:text-amber-600"
                        }`}
                        title="تشغيل المقطع"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={() => downloadUrl(item.audioUrl, item.style, item.publicUrl)}
                        className="p-1.5 rounded-lg border bg-white border-slate-200 hover:border-amber-400 text-slate-600 hover:text-amber-600 transition"
                        title="تحميل المقطع"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => shareToTelegram(item.audioUrl, item.text, item.style, item.publicUrl)}
                        className="p-1.5 rounded-lg border bg-sky-50 border-sky-100 hover:bg-sky-400 hover:text-sky-900 transition text-sky-700"
                        title="مشاركة عبر تلغرام"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => shareToWhatsApp(item.audioUrl, item.text, item.style, item.publicUrl)}
                        className="p-1.5 rounded-lg border bg-emerald-50 border-emerald-100 hover:bg-emerald-400 hover:text-emerald-900 transition text-emerald-700"
                        title="مشاركة عبر واتساب"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => removeHistoryItem(item.id, e)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent transition"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Simplified Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-400">
        أصوات دقيقة مولدة بنظام الذكاء الاصطناعي الأحدث.
      </footer>

    </div>
  );
}

