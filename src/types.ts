export interface VoiceOption {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  gender: "male" | "female";
}

export interface PresetPhrase {
  id: string;
  title: string;
  text: string;
  category: "greeting" | "poetry" | "news" | "calm" | "thanks";
  emoji: string;
}

export interface GeneratedSpeech {
  id: string;
  text: string;
  voice: string;
  style: string;
  audioUrl: string;
  publicUrl?: string;
  timestamp: string;
}
