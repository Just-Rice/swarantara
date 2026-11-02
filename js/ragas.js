/*
 * SWARANTARA: raga and mood settings.
 *
 * This is the ONE file to edit when you want to change which raga plays
 * for which mood, rename things, or point to a new recording.
 *
 * - `file` is the recording inside the /audio folder. If the file is
 *   missing, the site plays a soft placeholder drone instead.
 * - `drone.second` is the tanpura's second string for the placeholder:
 *   "pa" for most ragas, "ma" for ragas without Pa (like Malkauns).
 *
 * The mood → raga pairings follow traditional associations (rasa and the
 * time-of-day theory). Please check them with your teacher or experts.
 */
window.SWARANTARA = {
  ragas: {
    yaman: {
      name: "Yaman",
      time: "Evening · 6–9 pm",
      mood: "Peaceful, devotional, settling",
      description:
        "One of the first ragas students learn. Its gentle, flowing phrases are traditionally linked with peace and calm at the end of the day.",
      file: "audio/yaman.mp3",
      drone: { second: "pa" },
    },
    "ahir-bhairav": {
      name: "Ahir Bhairav",
      time: "Early morning · 6–9 am",
      mood: "Calm, reflective, reassuring",
      description:
        "A soft morning raga with a tender, soothing feel, often used to begin the day quietly.",
      file: "audio/ahir-bhairav.mp3",
      drone: { second: "pa" },
    },
    bhairavi: {
      name: "Bhairavi",
      time: "Morning, or to close a concert",
      mood: "Compassionate, consoling",
      description:
        "Traditionally sung at the end of a performance. It is associated with karuna (compassion) and gently holds sadness instead of fighting it.",
      file: "audio/bhairavi.mp3",
      drone: { second: "pa" },
    },
    bageshree: {
      name: "Bageshree",
      time: "Late night · 9 pm–12 am",
      mood: "Tender, soothing, softening",
      description:
        "A slow night raga with a warm, gentle character that helps settle restlessness.",
      file: "audio/bageshree.mp3",
      drone: { second: "ma" },
    },
    malkauns: {
      name: "Malkauns",
      time: "Late night · 12–3 am",
      mood: "Deep, meditative, still",
      description:
        "A five-note raga with a deep, serious mood. It is traditionally sung late at night and is often used for meditation.",
      file: "audio/malkauns.mp3",
      drone: { second: "ma" },
    },
    darbari: {
      name: "Darbari Kanada",
      time: "Late night · 12–3 am",
      mood: "Grave, slow, grounding",
      description:
        "A majestic, very slow night raga once performed in royal courts. Its low, heavy phrases feel grounding.",
      file: "audio/darbari.mp3",
      drone: { second: "pa" },
    },
    bhupali: {
      name: "Bhupali",
      time: "Evening · 6–9 pm",
      mood: "Clear, serene, uplifting",
      description:
        "A simple five-note raga with a bright, open feel. Its clarity can help an unsettled mind focus.",
      file: "audio/bhupali.mp3",
      drone: { second: "pa" },
    },
    desh: {
      name: "Desh",
      time: "Night · and the monsoon season",
      mood: "Joyful, romantic, light",
      description:
        "A cheerful, light raga linked with the monsoon. A good match when you already feel good.",
      file: "audio/desh.mp3",
      drone: { second: "pa" },
    },
  },

  // The mood cards on the Raga Relief page, in order.
  moods: [
    { id: "stressed", label: "Stressed", emoji: "😣", raga: "yaman" },
    { id: "anxious", label: "Anxious", emoji: "😰", raga: "ahir-bhairav" },
    { id: "sad", label: "Sad", emoji: "😢", raga: "bhairavi" },
    { id: "angry", label: "Angry or restless", emoji: "😠", raga: "bageshree" },
    { id: "tired", label: "Tired, can't sleep", emoji: "😴", raga: "malkauns" },
    { id: "unfocused", label: "Unfocused", emoji: "🌀", raga: "bhupali" },
    { id: "happy", label: "Happy", emoji: "😊", raga: "desh" },
  ],

  // Ragas offered in Sleep Mode (the first one is the default).
  sleepRagas: ["malkauns", "darbari", "bageshree"],
};
