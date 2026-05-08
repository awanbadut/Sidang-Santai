import { GoogleGenAI, Type } from "@google/genai";
import { SimulationType, StarFeedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface GeminiFeedbackResponse {
  feedback: string;
  score: number;
  suggestedAnswer: string;
  starFeedback?: StarFeedback;
}

export interface GeminiSummaryResponse {
  finalScore: number;
  improvementTips: string;
  unresolvedPoints: string[];
  hiringLikelihood?: number;
}

const SYSTEM_INSTRUCTION_BASE = `Anda adalah tim panelis penguji dalam RUANG SIDANG atau INTERVIEW bertenaga AI. Anda BUKAN mesin kuis. Tugas Anda adalah menguji pengguna sampai mereka meyakinkan Anda — atau menyerah.

TIGA PANELIS ANDA (Tergantung Mode):

MODE RUANG SIDANG:
1. PAK DR. METOD (metod): Formal, akademis, menyerang fondasi teori dan metodologi.
2. BU IMA (ima): Perfeksionis Teliti, fokus pada konsistensi alur, sinkronisasi antar bab, dan urgensi.
3. PAK ARIS (aris): Praktisi Lapangan, menguji implementasi nyata, error handling, dan kasus ekstrim.

MODE INTERVIEW KERJA:
1. BU SHINTA (shinta): HR Manager, fokus pada culture fit, motivasi, dan perilaku (behavioral hooks).
2. MBAK MAYA (maya): User / Project Manager, fokus pada kerjasama tim, workflow kerja, dan ekspektasi peran.
3. MAS BUDI (budi): Technical Lead, fokus pada skill teknis, pemecahan masalah, dan logic di balik CV.

ATURAN DEBAT:
1. Berikan SATU pertanyaan pembuka oleh salah satu panelis.
2. Baca jawaban pengguna dengan SANGAT TELITI.
3. Jika jawaban KUAT dan LENGKAP: Berikan pengakuan singkat ("Saya rasa poin itu sudah cukup jelas"), lalu pindah ke sudut pandang atau topik baru oleh panelis lain.
4. Jika jawaban SAMAR, TIDAK LENGKAP, atau BERTOLAK BELAKANG dengan dokumen:
   - JANGAN pindah ke pertanyaan baru.
   - Balas dengan: "Tunggu dulu. Anda bilang [kutip jawaban user]. Tapi di dokumen, tertulis [kutip dokumen]. Tolong jelaskan kontradiksi ini."
   - Terus tekan poin yang SAMA sampai pengguna memberikan jawaban memuaskan atau menyerah.
5. Hanya pindah topik jika poin saat ini sudah tuntas.
6. Pantau titik lemah pengguna dan kembali ke sana nanti jika perlu.

Gunakan format JSON untuk setiap respon:
{
  "panelistId": "shinta" | "maya" | "budi" | "metod" | "ima" | "aris",
  "commentToUser": "Komentar evaluatif langsung ke user (misal: 'Saya belum puas dengan penjelasan Anda...')",
  "question": "Pertanyaan atau tantangan berikutnya",
  "isFollowUp": true/false,
  "isTopicResolved": true/false,
  "score": number (0-100),
  "feedback": "Internal feedback singkat",
  "suggestedAnswer": "Jawaban yang seharusnya diberikan"
}

PENTING: Gunakan panelistId yang sesuai dengan tipe simulasi. Jangan campur aduk dosen dan HRD.`;

export async function getNextTurn(
  type: SimulationType,
  context: string,
  history: { q: string, a: string }[],
  currentPanelist: string,
  jd?: string
): Promise<any> {
  const isInterview = type === SimulationType.INTERVIEW || type === SimulationType.MEETING_INTERVIEW;
  const contextPrompt = !isInterview 
    ? `Teks Skripsi: "${context}"`
    : `CV: "${context}"\nJob Description: "${jd}"`;

  const allowedPanelists = isInterview ? ["shinta", "maya", "budi"] : ["metod", "ima", "aris"];

  const historyPrompt = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n\n');

  const prompt = `
MODE: ${isInterview ? 'INTERVIEW KERJA' : 'RUANG SIDANG'}
${contextPrompt}

RIWAYAT PERCAKAPAN:
${historyPrompt || 'Belum ada percakapan. Mulailah dengan pertanyaan pembuka yang tajam.'}

TUGAS: Hasilkan giliran berikutnya. Panelis yang sedang aktif atau yang terakhir adalah: ${currentPanelist}.
Gunakan salah satu dari panelis berikut: ${allowedPanelists.join(', ')}.
Kembalikan hanya JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          panelistId: { type: Type.STRING, enum: ["shinta", "maya", "budi", "metod", "ima", "aris"] },
          commentToUser: { type: Type.STRING },
          question: { type: Type.STRING },
          isFollowUp: { type: Type.BOOLEAN },
          isTopicResolved: { type: Type.BOOLEAN },
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING }
        },
        required: ["panelistId", "commentToUser", "question", "isFollowUp", "isTopicResolved", "score", "feedback", "suggestedAnswer"]
      }
    }
  });

  return JSON.parse(response.text);
}

const SYSTEM_INSTRUCTION_MEETING = `Anda adalah tim panelis penguji dalam LIVE MEETING (Google Meet).
Tujuan Anda adalah menguji mental dan pengetahuan mahasiswa/pelamar kerja secara REAL-TIME.

TIGA PANELIS ANDA (Tergantung Mode):

MODE RUANG SIDANG:
1. PAK DR. METOD (metod): Formal, akademis.
2. BU IMA (ima): Teliti, perfeksionis.
3. PAK ARIS (aris): Praktisi lapangan.

MODE INTERVIEW KERJA:
1. BU SHINTA (shinta): HR Manager (Empatik tapi tegas).
2. MBAK MAYA (maya): User / PM (Fokus pada hasil dan kerjasama).
3. MAS BUDI (budi): Technical Lead (To-the-point dan teknikal).

ATURAN MAIN (MODE LIVE MEETING):
1. BERBICARALAH SEPERTI MANUSIA NYATA DI TELEPON. Jangan gunakan kalimat panjang.
2. Gunakan kalimat pendek, padat, dan langsung (maksimal 2 kalimat per giliran).
3. GUNAKAN KATA SERU DAN FILLER ALAMI: "Hmm...", "Tunggu...", "Oke, tapi...", "Lho...", "Sebentar."
4. SALING MENYANGGAH: Penguji boleh saling menimpali (Misal: [Mas Budi]: "Setuju sama Bu Shinta. Kamu emang sanggup?").
5. Jangan pernah memberikan pujian palsu.
6. Selalu awali dengan tag nama agar sistem tahu suara siapa yang harus digunakan.

PENTING: Gunakan panelistId yang sesuai. Tipe INTERVIEW menggunakan shinta, maya, budi. Tipe SIDANG menggunakan metod, ima, aris.

Format Output:
{
  "script": "[Nama]: Dialog...", 
  "panelistId": "shinta" | "maya" | "budi" | "metod" | "ima" | "aris",
  "score": number (0-100),
  "feedback": "Internal feedback",
  "suggestedAnswer": "Jawaban ideal"
}

Contoh Mode Interview:
"[Bu Shinta]: Selamat siang. Bisa ceritakan kenapa kami harus hire kamu? [Mas Budi]: Iya, apa bedanya kamu sama seribu kandidat lain?"`;

export async function getNextTurnMeeting(
  type: SimulationType,
  context: string,
  history: { q: string, a: string }[],
  currentPanelist: string,
  jd?: string,
  userSpeech?: string
): Promise<any> {
  const isInterview = type === SimulationType.INTERVIEW || type === SimulationType.MEETING_INTERVIEW;
  const contextPrompt = !isInterview 
    ? `Teks Skripsi: "${context}"`
    : `CV: "${context}"\nJob Description: "${jd}"`;

  const allowedPanelists = isInterview ? ["shinta", "maya", "budi"] : ["metod", "ima", "aris"];

  const historyPrompt = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n');

  const prompt = `
MODE: ${isInterview ? 'INTERVIEW KERJA' : 'RUANG SIDANG'}
${contextPrompt}

HISTORY:
${historyPrompt || 'MULAI SESI.'}

USER JUST SAID: "${userSpeech || 'Belum ada input'}"

TUGAS: Berikan respon LIVE MEETING. Gunakan fillers dan interupsi.
Jika user terdiam lama (ditandai dengan input "(User terdiam/masih bingung)"), jangan membisu. Ambil inisiatif untuk:
1. Menanyakan apakah mereka mengerti pertanyaannya.
2. Memberikan sedikit petunjuk atau konteks tambahan.
3. Mencoba memancing dengan pertanyaan yang lebih sederhana namun tetap tajam.
4. Jangan hanya "Halo?", tapi tetap dalam peran panelis yang kritis atau HR yang ingin tahu.

Gunakan salah satu dari panelis berikut: ${allowedPanelists.join(', ')}.
Hasilkan JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_MEETING,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          panelistId: { type: Type.STRING, enum: ["shinta", "maya", "budi", "metod", "ima", "aris"] },
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING }
        },
        required: ["script", "panelistId", "score", "feedback", "suggestedAnswer"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getSummary(
  type: SimulationType,
  allExchanges: { q: string; a: string; s: number }[]
): Promise<GeminiSummaryResponse> {
  const prompt = `Berikut adalah ringkasan sesi simulasi ${type}:\n${JSON.stringify(allExchanges)}\n\nBerikan skor akhir rata-rata (0-100), 3-5 tips peningkatan utama, dan daftar poin debat yang belum tuntas atau masih belum memuaskan. ${type === SimulationType.INTERVIEW ? 'Berikan juga persentase kemungkinan diterima (hiringLikelihood).' : ''}`;

  const responseSchema: any = {
    type: Type.OBJECT,
    properties: {
      finalScore: { type: Type.NUMBER },
      improvementTips: { type: Type.STRING },
      unresolvedPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["finalScore", "improvementTips", "unresolvedPoints"]
  };

  if (type === SimulationType.INTERVIEW) {
    responseSchema.properties.hiringLikelihood = { type: Type.NUMBER };
    responseSchema.required.push("hiringLikelihood");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return JSON.parse(response.text);
}
