import { VoiceOption, PresetPhrase } from "../types";

export const GEMINI_VOICES: VoiceOption[] = [
  {
    id: "Kore",
    name: "Kore",
    arabicName: "كور",
    description: "صوت رجولي عميق، رصين وذو نبرة هادئة ومريحة.",
    gender: "male",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    arabicName: "زيفير",
    description: "صوت حيوي، مفعم بالنشاط وذو جودة تفاعلية ودودة.",
    gender: "female",
  },
  {
    id: "Puck",
    name: "Puck",
    arabicName: "بوك",
    description: "صوت متزن، مخارج واضحة ومخارجه تناسب الشروحات الأكاديمية.",
    gender: "male",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    arabicName: "فينرير",
    description: "صوت رجولي وقور رنان، ذو نبرة خشنة فخمة تناسب العلماء والمشايخ والحكماء والخطابات المهيبة.",
    gender: "male",
  },
  {
    id: "Charon",
    name: "Charon",
    arabicName: "شارون",
    description: "صوت احترافي مصقول، ناضج ويناسب التلاوات والأخبار والقصص.",
    gender: "female",
  },
];

export const AUDIO_STYLE_PRESETS = [
  { id: "natural", name: "طبيعي ومباشر", prompt: "Natural standard speech with good flow" },
  { id: "scholar_deep", name: "عالم حكيم (عميق وخشن)", prompt: "Deep, husky, authoritative scholar tone, speaking slowly with profound ancient wisdom and rough texture" },
  { id: "professor_en", name: "الدكتور Brainy (محاضرة 🎓)", prompt: "A scholarly middle-aged English professor named Dr. Brainy speaking. Intellectual, authoritative, articulates perfectly like lecturing students in a university classroom, clear academic tone, warm and educational" },
  { id: "teen_student_en", name: "الطالب Cappy (مراهق 🎒)", prompt: "A teenage school student named Cappy speaking in English. Energetic, youthful, informal, natural high school teenager, friendly tone" },
  { id: "slow_clear", name: "بطيء ومخارج واضحة جداً", prompt: "Slowly, distinct pronunciation, perfect classical Arabic details" },
  { id: "cheerful", name: "نبرة مبهجة وحماسية", prompt: "Bright and cheerful, filled with positive dynamic energy" },
  { id: "poem", name: "تلاوة هادئة ورصينة", prompt: "Clam, dignified, poetic cadence and gentle pauses" },
  { id: "news", name: "موجز إخباري جاد", prompt: "In a professional, clear and objective news anchor tone" },
  { id: "whispering", name: "بصوت خافت وودود", prompt: "Gentle whispered tone, intimate and soothingly quiet" },
];

export const PRESET_PHRASES: PresetPhrase[] = [
  {
    id: "professor_demo",
    title: "محاضرة د. Brainy (English)",
    text: "Welcome back, class. Today we will dive deep into the foundations of neural networks and how modern computer systems model cognitive processes. Please take clear notes and prepare your questions.",
    category: "news",
    emoji: "🎓",
  },
  {
    id: "teen_demo",
    title: "حديث طالب Cappy (English)",
    text: "Yo, what's up! Honestly, I was reading this science article about astrophysics and black holes, and my mind was literally blown! It's so cool how the universe works, you know?",
    category: "calm",
    emoji: "🎒",
  },
  {
    id: "science_scholar",
    title: "اقتباس علمي حكيم",
    text: "إن البحث العلمي ليس مجرد رصد للظواهر الحيوية القائمة، بل هو كفاح مستمر من أجل سبر أغوار الكون واستكشاف الحقائق الكبرى التي تحكم الوجود الإنساني بعقل متدبر ونظرة ثاقبة.",
    category: "news",
    emoji: "🔬",
  },
  {
    id: "greeting",
    title: "ترحيب دافئ",
    text: "أهلاً وسهلاً بكم في واحة الصوت الذكي وعلم الفصاحة، هنا يتحول النص المكتوب إلى نبرات كلام مسموع ينبض بالحياة والإحساس الفني.",
    category: "greeting",
    emoji: "👋",
  },
  {
    id: "poetry",
    title: "شعر فصيح",
    text: "وَلَمّا تَلاقينا جَرى الدَمعُ بَينَنا... تَكَلَّمَ عَينا المَرءِ وَالقَلبُ كاتِمُ. فَقُلتُ لَها قَد مَلَّ صَبري وَتَعَبَ الشَوقُ... فَأَجابَت رَوانَ القلبِ أَنّي لَكَ عاصِمُ.",
    category: "poetry",
    emoji: "✍️",
  },
  {
    id: "news",
    title: "موجز إخباري",
    text: "سيداتي وسادتي، نقدم لكم الآن هذا الموجز الإخباري المباشر من استوديو البث، حيث نتابع معكم طواعيةً آخر التطورات الإبداعية والمبادرات التنموية الجديدة.",
    category: "news",
    emoji: "🎙️",
  },
  {
    id: "calm",
    title: "تأمل هادئ",
    text: "خذ نفساً عميقاً... اترك أفكارك المتسارعة جانباً... ودع هذا الصوت يغرق وجدانك بالسلام والطمأنينة والهدوء والسكينة الداخلية.",
    category: "calm",
    emoji: "🧘",
  },
  {
    id: "thanks",
    title: "شكر وتقدير",
    text: "بكل صدق ومحبة، نعرب لكم دائمًا عن بالغ امتناننا لثقتكم المستمرة بنا، ونتطلع دومًا لخدمتكم بأفضل الحلول والارتقاء نحو آفاق جديدة.",
    category: "thanks",
    emoji: "💖",
  },
];
