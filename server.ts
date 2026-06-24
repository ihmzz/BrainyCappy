import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize the Gemini client using server-only environment variable.
// Sets the User-Agent header to 'aistudio-build' in httpOptions for telemetry as required.
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Middleware
app.use(express.json({ limit: "10mb" }));

// WAV Header generator for 24000 Hz, 16-bit, Mono PCM audio
function encodeWAV(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write("RIFF", 0);
  // File length minus RIFF identifier and size fields
  header.writeUInt32LE(chunkSize, 4);
  // RIFF type
  header.write("WAVE", 8);
  // Format chunk identifier
  header.write("fmt ", 12);
  // Format chunk length
  header.writeUInt32LE(16, 16);
  // Sample format (1 = raw PCM)
  header.writeUInt16LE(1, 20);
  // Channel count (1 = mono)
  header.writeUInt16LE(numChannels, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate
  header.writeUInt32LE(byteRate, 28);
  // Block align
  header.writeUInt16LE(blockAlign, 32);
  // Bits per sample (16)
  header.writeUInt16LE(bitsPerSample, 34);
  // Data chunk identifier
  header.write("data", 36);
  // Data chunk length
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Keep track of generated audio buffers in memory (limitted to 100 to avoid memory growth)
interface AudioCacheItem {
  buffer: Buffer;
  fileName: string;
}
const audioCache = new Map<string, AudioCacheItem>();

const addAudioToCache = (id: string, item: AudioCacheItem) => {
  if (audioCache.size >= 100) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey !== undefined) {
      audioCache.delete(firstKey);
    }
  }
  audioCache.set(id, item);
};

// API endpoint to serve standard WAV audio
app.get("/api/audio/:id", (req, res) => {
  const cleanId = req.params.id.replace(/\.wav$/, "");
  const item = audioCache.get(cleanId);
  if (!item) {
    return res.status(404).send("الملف الصوتي غير موجود أو انتهت صلاحيته.");
  }
  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Content-Disposition", `attachment; filename="${item.fileName}"`);
  res.send(item.buffer);
});

// API endpoint to convert text to speech using gemini-3.1-flash-tts-preview
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice, style } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "الرجاء إدخال النص لتحويله إلى صوت." });
    }

    const voiceName = voice || "Kore"; // Fallback to 'Kore' if custom voice not specified
    const ai = getGeminiClient();

    // Construct prompt. Prepend mood/style if selected by user
    let prompt = text;
    if (style && style.trim().length > 0) {
      prompt = `Say in style "${style.trim()}": ${text}`;
    }

    console.log(`Generating speech with voice ${voiceName} and prompt: ${prompt}`);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.[0];
    const base64Pcm = audioPart?.inlineData?.data;

    if (!base64Pcm) {
      console.error("No audio content returned from Gemini API response:", JSON.stringify(response));
      return res.status(500).json({
        error: "فشل إنشاء الصوت. تأكد من أن النص والمفاتيح مهيأة بشكل صحيح.",
        details: "No audio stream returned in modern API modalities output."
      });
    }

    // Convert raw PCM to a clean standard WAV container
    const pcmBuffer = Buffer.from(base64Pcm, "base64");
    const wavBuffer = encodeWAV(pcmBuffer, 24000);

    const audioId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanFileName = `voice-${voiceName}-${Date.now()}.wav`;

    // Cache the standard WAV buffer on the server
    addAudioToCache(audioId, {
      buffer: wavBuffer,
      fileName: cleanFileName
    });

    const audioUrl = `/api/audio/${audioId}.wav`;
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const publicUrl = `${protocol}://${host}/api/audio/${audioId}.wav`;

    res.json({
      success: true,
      audioUrl: audioUrl,
      publicUrl: publicUrl,
      voice: voiceName,
      style: style || "طبيعي"
    });
  } catch (err: any) {
    const errString = String(err.message || err);
    const isQuota = errString.includes("429") || errString.toLowerCase().includes("quota") || errString.includes("RESOURCE_EXHAUSTED") || errString.toLowerCase().includes("exceeded");
    
    if (isQuota) {
      console.log("TTS Notice: Quota limit reached. Serving fallback info response.");
      return res.status(200).json({
        success: false,
        quotaExceeded: true,
        error: "لقد تجاوزت حد الحصة اليومية المجانية المخصصة لنموذج تحويل النصوص إلى كلام (الحد الأقصى 10 عمليات توليد يومية على البيئة التجريبية). يرجى إعادة المحاولة بعد دقائق أو في وقت لاحق.",
        details: "Quota exceeded limit"
      });
    }

    console.log("TTS Info: Unexpected situation handled in TTS endpoint.");
    res.status(200).json({
      success: false,
      error: "حدث خطأ أثناء إجراء عملية تحويل النص إلى صوت.",
      details: "Check server logs"
    });
  }
});

// Configure Vite or Static Assets handling
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupVite();
