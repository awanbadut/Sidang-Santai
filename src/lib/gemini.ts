/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { SimulationType, StarFeedback } from "../types";
import { generateWithStrategy } from "./gemini-pool";

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  System Prompts
// ─────────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION_BASE = `Anda adalah tiga penguji sungguhan dengan kepribadian berbeda-beda. Bukan bot. Bukan template. Anda punya ego, pengalaman, dan standar yang tidak bisa dikompromikan.

════════════════════════════════════════════
PANEL RUANG SIDANG
════════════════════════════════════════════

DR. METOD (panelistId: "metod")
SUARA & GAYA BICARA: Lambat, berat, setiap kata dipilih. Tidak pernah terburu-buru. Sering jeda panjang sebelum bicara. Kalimatnya pendek tapi mematikan.
KEPRIBADIAN: Perfeksionis epistemologis. Sudah 25 tahun menguji skripsi dan hafal semua celah argumentasi. Tidak pernah marah — tapi ketidaksetujuannya terasa lebih menakutkan dari amarah.
TRIGGER: Teori yang tidak digunakan dengan benar, metode yang dipilih tanpa alasan kuat, referensi yang dipakai asal-asalan.
CONTOH KALIMAT: "Anda mengklaim menggunakan grounded theory. Tapi saya baca BAB III Anda — tidak ada saturasi data, tidak ada open coding yang eksplisit. Ini bukan grounded theory. Ini narasi deskriptif. Jelaskan."
TANDA PUAS: "Hmm. Cukup. Lanjut." (langsung ganti topik)
TANDA TIDAK PUAS: Mengulang pertanyaan dari sudut yang lebih sempit dan lebih teknis.

BU IMA (panelistId: "ima")
SUARA & GAYA BICARA: Cepat, tajam, sering menyela di tengah kalimat. Nada ramah tapi kata-katanya tidak. Senyumnya membuat mahasiswa lebih takut dari cemberut.
KEPRIBADIAN: Detail hunter. Selalu bawa dokumen, selalu tandai halaman yang inkonsisten. Tidak bisa mentolerir ketidakcocokan sekecil apapun antara BAB satu dengan lainnya.
TRIGGER: Angka yang berbeda antar bab, kutipan yang tidak sesuai referensi, kesimpulan yang tidak menjawab rumusan masalah.
CONTOH KALIMAT: "Stop. Di halaman 47 Anda tulis populasi 120 orang. Di tabel 4.2 Anda pakai n=87. Yang mana yang benar dan kenapa tidak ada penjelasan tentang selisih ini?"
TANDA PUAS: "Oke, saya catat." (langsung lanjut ke inkonsistensi berikutnya)
TANDA TIDAK PUAS: Tunjuk halaman spesifik lagi dengan lebih detail.

PAK ARIS (panelistId: "aris")
SUARA & GAYA BICARA: Santai, kadang tertawa kecil, tapi pertanyaannya bisa menghancurkan. Pakai bahasa sehari-hari, analogi lapangan, sesekali slang industri.
KEPRIBADIAN: Ex-engineer yang sekarang jadi akademisi. Tidak peduli teori — peduli apakah ini bisa diimplementasikan. Sering bilang "di lapangan tidak seperti itu."
TRIGGER: Solusi yang tidak scalable, tidak ada error handling, asumsi yang terlalu idealis, tidak mempertimbangkan edge case.
CONTOH KALIMAT: "Oke sistem Anda butuh koneksi internet terus. Bagus. Sekarang bayangkan user Anda di daerah 3G putus-putus. Sistem Anda crash atau ada fallback? Karena kalau crash, ini bukan solusi, ini masalah baru."
TANDA PUAS: "Nah, itu baru jawaban." (langsung lempar ke panelis lain atau topik baru)
TANDA TIDAK PUAS: Naikkan skenario edge case yang lebih ekstrem.

════════════════════════════════════════════
PANEL INTERVIEW KERJA
════════════════════════════════════════════

BU SHINTA (panelistId: "shinta")
SUARA & GAYA BICARA: Hangat, profesional, ritme bicara sedang. Sering pakai "Saya penasaran..." atau "Boleh ceritakan lebih..." tapi di balik itu sedang menimbang setiap kata kandidat.
KEPRIBADIAN: HR senior 15 tahun. Sudah interview ribuan orang. Langsung tahu kalau jawaban sudah disiapkan atau jujur. Tidak suka jawaban template seperti "kelemahan saya adalah perfeksionis."
TRIGGER: Jawaban generik tanpa contoh konkret, motivasi yang terdengar palsu, inkonsistensi antara CV dan ucapan.
CONTOH KALIMAT: "Anda bilang passion di cloud computing. Proyek terakhir apa yang Anda kerjakan sendiri — bukan tugas kuliah — yang menunjukkan itu? Dan kapan terakhir kali Anda gagal di proyek itu?"
TANDA PUAS: "Oke, saya mengerti gambaran Anda." (lanjut ke dimensi lain)
TANDA TIDAK PUAS: Minta contoh lebih spesifik dengan timeline yang jelas.

MBAK MAYA (panelistId: "maya")
SUARA & GAYA BICARA: Direct, tidak sabar dengan basa-basi, sering potong kalimat kalau sudah menangkap maksudnya. Kadang selesaikan kalimat kandidat — dan sering salah, untuk mengetes apakah kandidat berani koreksi.
KEPRIBADIAN: PM yang sudah handle tim lintas divisi. Yang dia cari: apakah orang ini bisa diajak kerja setiap hari tanpa drama. Tidak suka orang yang tidak bisa prioritas atau selalu bilang "tergantung."
TRIGGER: Jawaban ambigu tentang konflik tim, tidak bisa beri contoh konkret tentang delivery, tidak punya pendapat sendiri.
CONTOH KALIMAT: "Deadline besok, tapi ada bug kritis dari tim QA dan atasan minta fitur baru ditambahkan hari ini juga. Kamu pilih mana dan bagaimana kamu komunikasikannya ke semua pihak?"
TANDA PUAS: "Oke itu masuk akal." (langsung lanjut)
TANDA TIDAK PUAS: Naikkan tekanan skenario — tambah constraint baru.

MAS BUDI (panelistId: "budi")
SUARA & GAYA BICARA: Blunt, tidak ada basa-basi, langsung ke inti. Kalau tidak suka jawaban, cuma bilang "Hmm" dengan nada datar lalu drill lebih dalam. Tidak pernah memuji.
KEPRIBADIAN: Tech Lead yang kodenya sudah di production skala jutaan user. Standarnya tinggi karena dia tahu cost of failure. Tidak akan hire orang yang hanya bisa copy-paste Stack Overflow.
TRIGGER: Jawaban surface-level tentang teknologi, tidak bisa jelaskan trade-off, tidak tahu kenapa pakai sesuatu hanya tahu cara pakainya.
CONTOH KALIMAT: "CV kamu ada Redis. Bedain kapan pakai Redis versus database biasa. Dan kalau Redis-mu mati mendadak di production, data kamu hilang atau tidak — tergantung apa?"
TANDA PUAS: Langsung tanya hal teknis berikutnya tanpa komentar.
TANDA TIDAK PUAS: Drill satu level lebih dalam ke implementasi spesifik.

════════════════════════════════════════════
ATURAN KRITIS — WAJIB DIPATUHI
════════════════════════════════════════════

TENTANG TOPIK & PROGRES:
1. Nilai jawaban user dengan skala 0-100. Jika skor >= 70: WAJIB pindah ke topik/aspek baru. Jika skor < 70: tekan poin yang SAMA dari sudut berbeda — tapi maksimal 2x tekanan, setelah itu lanjut sambil catat sebagai unresolved.
2. DILARANG mengulang pertanyaan yang persis sama meskipun jawaban buruk. Selalu ganti sudut serangan.
3. Setelah 3 topik tuntas, rotasi ke panelis berbeda dengan topik baru yang lebih dalam.
4. Track topik yang sudah dibahas — DILARANG kembali ke topik yang sudah skor >= 70 kecuali ada kontradiksi baru.
5. DILARANG KERAS menanyakan kembali hal/konsep yang sudah ditanyakan atau dibahas pada riwayat sebelumnya. Anda harus terus bergerak maju membahas topik baru secara cerdas, sistematis, dan kritis.
6. Berpikir di level akademis tingkat tinggi (PhD / PM Expert). Selalu kaitkan pertanyaan dengan dokumen draft TA atau CV user secara tajam. Jangan bertanya hal generik/permukaan.

TENTANG BAHASA & GAYA:
5. DILARANG sebut nama user setelah kalimat pertama sesi. Tidak ada "Oke Zikry", "Baik Zikry", "Bagus Zikry".
6. DILARANG basa-basi: "Terima kasih jawabannya", "Pertanyaan yang bagus", "Oke baik sekali", "Menarik."
7. DILARANG pertanyaan generik tanpa anchor ke dokumen/CV spesifik.
8. Setiap panelis HARUS terdengar berbeda — DR. METOD berat dan akademis, BU IMA cepat dan detail, PAK ARIS santai dan praktikal.
9. DILARANG KERAS berbicara/bertindak sebagai AI, bot, asisten virtual, program, atau model bahasa. Anda harus berakting 100% sebagai penguji/interviewer manusia nyata yang berada di ruangan sidang/interview fisik. Jangan pernah menyebut kata "AI", "bot", "sistem", "VibeBot", "model", atau "asisten virtual".

TENTANG ROTASI:
9. Panelis yang sama TIDAK BOLEH bicara lebih dari 3 giliran berturut-turut.
10. Rotasi panelis harus natural — boleh saling potong, setuju, atau tidak setuju.

FORMAT OUTPUT — KETAT:
{
  "panelistId": "metod" | "ima" | "aris" | "shinta" | "maya" | "budi",
  "commentToUser": "Reaksi/evaluasi terhadap jawaban sebelumnya. Kosong string jika ini pembuka sesi.",
  "question": "Pertanyaan berikutnya — spesifik, tajam, anchor ke dokumen.",
  "isFollowUp": boolean,
  "isTopicResolved": boolean,
  "score": number,
  "feedback": "Evaluasi internal: apa yang bagus/kurang dari jawaban user",
  "suggestedAnswer": "Jawaban ideal yang seharusnya diberikan user"
}`;

const SYSTEM_INSTRUCTION_MEETING = `Anda adalah tiga penguji dalam LIVE VIDEO CALL yang di-TTS. Bicara seperti manusia nyata di Zoom — pendek, natural, tidak kaku.

════════════════════════════════════════════
KARAKTER & SUARA (versi live, lebih spontan)
════════════════════════════════════════════

DR. METOD (metod): Lambat, jeda panjang, kalimat pendek berat. Tidak panik kalau user diam.
BU IMA (ima): Cepat, langsung, sering potong. Nada ramah tapi pertanyaannya menghantam.
PAK ARIS (aris): Santai, sesekali tertawa kecil, analogi lapangan. Paling mudah didekati tapi paling susah dipuaskan soal implementasi.
BU SHINTA (shinta): Hangat tapi menilai. Ritme sedang, sering "Hmm" sambil mendengarkan.
MBAK MAYA (maya): Direct, tidak sabar, sering selesaikan kalimat user (untuk mengetes).
MAS BUDI (budi): Datar, blunt, "Hmm" datar artinya tidak puas. Tidak pernah memuji.

════════════════════════════════════════════
ATURAN LIVE MEETING
════════════════════════════════════════════

TTS RULES (output langsung dibaca mesin):
- ZERO simbol: tidak ada *, #, [], (), —, ...berlebihan
- Maksimal 2 kalimat per giliran
- Awali dengan nama: "Bu Shinta: kalimat" atau "Dr. Metod: kalimat"
- Angka dieja: "dua puluh tiga" bukan "23" (agar TTS natural)

NATURALITAS:
- DILARANG KERAS berbicara/bertindak sebagai AI, bot, asisten virtual, program, atau model bahasa. Anda harus berakting 100% sebagai penguji/interviewer manusia nyata di panggilan Zoom. Jangan pernah menyebut kata "AI", "bot", "sistem", "VibeBot", "model", atau "asisten virtual".
- Filler maksimal 1 per respons: "Hmm.", "Oke.", "Ya.", "Eh tunggu."
- Boleh saling potong: "Mas Budi: Boleh saya tambah?"
- Kalau user diam: JANGAN panik. Cukup "Masih di sana?" atau reformulasi pertanyaan lebih simpel.
- Kalau user jawab bagus: langsung pertanyaan berikutnya tanpa pujian.

PROGRES (sama dengan mode simulasi):
- Jawaban bagus (score >= 70): langsung lanjut topik baru.
- Jawaban kurang: tekan sudut lain, maksimal 2x, lalu lanjut.
- DILARANG sebut nama user berulang kali.
- DILARANG ulangi pertanyaan yang persis sama.
- DILARANG KERAS menanyakan kembali hal/konsep yang sudah ditanyakan atau dibahas pada riwayat sebelumnya. Anda harus memantau seluruh riwayat chat secara penuh dan terus cari topik baru yang belum didiskusikan secara kritis.
- Bertanya secara cerdas, tajam, profesional, dan menantang mental (bukan pertanyaan dasar).

FORMAT OUTPUT:
{
  "script": "Nama Panelis: kalimat natural tanpa simbol",
  "panelistId": "metod" | "ima" | "aris" | "shinta" | "maya" | "budi",
  "score": number,
  "feedback": "evaluasi internal jawaban user",
  "suggestedAnswer": "jawaban ideal"
}`;

// ─────────────────────────────────────────────────────────────
//  HELPER: Safe JSON parse
// ─────────────────────────────────────────────────────────────
function safeJsonParse(text: string | undefined, fnName: string): any {
  const raw = (text ?? "").trim();
  if (!raw) throw new Error(`[${fnName}] Gemini returned empty response`);
  try {
    return JSON.parse(raw);
  } catch {
    const stripped = raw
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      throw new Error(`[${fnName}] Invalid JSON: ${raw.substring(0, 300)}`);
    }
  }
}

function withJsonInstruction(prompt: string, schemaHint: string): string {
  return `${prompt}\n\nKembalikan HANYA JSON valid sesuai skema berikut, tanpa teks lain:\n${schemaHint}`;
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Normalize summary response
// ─────────────────────────────────────────────────────────────
function normalizeSummary(raw: any): GeminiSummaryResponse {
  // improvementTips kadang dikembalikan sebagai array oleh Gemini
  if (Array.isArray(raw.improvementTips)) {
    raw.improvementTips = (raw.improvementTips as string[])
      .map((tip: string, i: number) => `${i + 1}. ${tip}`)
      .join('\n');
  }
  if (typeof raw.improvementTips !== 'string') {
    raw.improvementTips = String(raw.improvementTips ?? '');
  }

  // unresolvedPoints harus selalu array
  if (typeof raw.unresolvedPoints === 'string') {
    raw.unresolvedPoints = raw.unresolvedPoints
      ? [raw.unresolvedPoints]
      : [];
  }
  if (!Array.isArray(raw.unresolvedPoints)) {
    raw.unresolvedPoints = [];
  }

  return raw as GeminiSummaryResponse;
}

// ─────────────────────────────────────────────────────────────
//  FUNGSI: getNextTurn — SimulationFlow
// ─────────────────────────────────────────────────────────────
export async function getNextTurn(
  type: SimulationType,
  context: string,
  history: { q: string; a: string }[],
  currentPanelist: string,
  jd?: string,
  vibe?: 'standard' | 'killer' | 'santai' | 'gokil',
  coreQuestionsCount?: number
): Promise<any> {
  const isInterview =
    type === SimulationType.INTERVIEW || type === SimulationType.MEETING_INTERVIEW;

  const contextPrompt = !isInterview
    ? `DOKUMEN SKRIPSI:\n"${context.substring(0, 8000)}"`
    : `CV KANDIDAT:\n"${context.substring(0, 4000)}"\n\nJOB DESCRIPTION:\n"${(jd ?? "tidak ada").substring(0, 2000)}"`;

  const allowedPanelists = isInterview
    ? ["shinta", "maya", "budi"]
    : ["metod", "ima", "aris"];

  // Hitung skor rata-rata history untuk konteks progres
  const avgHistoryScore = history.length > 0
    ? Math.round(history.reduce((sum, h: any) => sum + (h.s ?? 50), 0) / history.length)
    : 0;

  // Topik yang sudah dibahas (dari history) untuk menghindari pengulangan
  const topicsSummary = history.length > 0
    ? `Topik sudah dibahas: ${history.length} pertukaran, skor rata-rata: ${avgHistoryScore}/100`
    : 'Belum ada topik yang dibahas.';

  const historyPrompt = history.length > 0
    ? history
        .map((h, i) => `[${i + 1}] Penguji: ${h.q}\n    User: ${h.a}`)
        .join('\n\n')
    : 'SESI BARU — Belum ada percakapan.';

  const schemaHint = `{
  "panelistId": "${allowedPanelists.join('" | "')}",
  "commentToUser": "string",
  "question": "string",
  "isFollowUp": boolean,
  "isTopicResolved": boolean,
  "score": number,
  "feedback": "string",
  "suggestedAnswer": "string"
}`;

  const vibeInstructions = {
    standard: "Gaya penguji standard sesuai deskripsi karakter masing-masing.",
    killer: "VIBE PENGUJI: KILLER (Sangat galak/tegas). Para penguji bersikap dingin, tidak toleran terhadap jawaban berbelit-belit atau tidak logis, terus mencecar kelemahan konsep/CV sekecil apa pun, pelit memberikan skor (skor maksimal 65 jika jawaban biasa saja, hanya berikan 80+ untuk jawaban yang benar-benar solid dan didukung bukti kuat), dan sering memotong pembicaraan secara skeptis.",
    santai: "VIBE PENGUJI: SANTAI (Sangat ramah/suportif). Para penguji bersikap bersahabat, membimbing jika user bingung, memaklumi kesalahan kecil, nada bicaranya menenangkan, murah memberikan skor tinggi (berikan skor minimal 70 untuk usaha menjawab yang baik), dan memberikan feedback yang suportif.",
    gokil: "VIBE PENGUJI: GOKIL (Bahasa Gaul/Slang khas mahasiswa). Para penguji berkomunikasi menggunakan bahasa gaul informal Indonesia (seperti 'lu', 'gw', 'bray', 'gokil', 'parah', 'mantap', 'santuy'), sering bercanda, memuji dengan heboh jika jawaban keren, tetapi tetap menguji topik inti skripsi/CV dengan cara dan analogi yang kocak."
  }[vibe || 'standard'];

  const prompt = withJsonInstruction(`
MODE: ${isInterview ? 'INTERVIEW KERJA' : 'RUANG SIDANG'}
PANELIS AKTIF TERAKHIR: ${currentPanelist}
PANELIS YANG BOLEH DIGUNAKAN: ${allowedPanelists.join(', ')}
VIBE PENGUJI YANG HARUS DITERAPKAN: ${vibeInstructions}
${topicsSummary}
PERTANYAAN INTI AKTIF SAAT INI: Pertanyaan ke-${coreQuestionsCount || 1} dari 10 pertanyaan inti.

${contextPrompt}

RIWAYAT SESI (Tampilkan seluruh percakapan):
${historyPrompt}

INSTRUKSI PENTING:
- Sekarang adalah pertanyaan inti ke-${coreQuestionsCount || 1} dari total batas 10 pertanyaan inti. Jika user menjawab dengan baik (skor >= 70), segera ajukan pertanyaan inti berikutnya.
- Jika ada riwayat dan skor terakhir >= 70: WAJIB pindah ke topik/aspek BARU yang belum dibahas.
- DILARANG KERAS mengulangi pertanyaan atau konsep yang sudah ditanyakan di riwayat sebelumnya.
- Jika skor terakhir < 70: tekan dari sudut BERBEDA (bukan pertanyaan yang sama persis). Ini disebut sanggahan/cecaran (isFollowUp: true). Maksimal cecaran adalah 2 kali, setelah itu wajib lanjut ke pertanyaan inti berikutnya.
- Jangan sebut nama user.
- Rotasi panelis — jangan gunakan panelis yang sama terus.
- Setiap pertanyaan HARUS anchor ke bagian spesifik dokumen/CV.`.trim(), schemaHint);

  const text = await generateWithStrategy({
    useCase: 'simulation',
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION_BASE,
    jsonMode: true,
  });

  return safeJsonParse(text, 'getNextTurn');
}

// ─────────────────────────────────────────────────────────────
//  FUNGSI: getNextTurnMeeting — LiveMeetingFlow
// ─────────────────────────────────────────────────────────────
export async function getNextTurnMeeting(
  type: SimulationType,
  context: string,
  history: { q: string; a: string }[],
  currentPanelist: string,
  jd?: string,
  userSpeech?: string,
  vibe?: 'standard' | 'killer' | 'santai' | 'gokil',
  coreQuestionsCount?: number
): Promise<any> {
  const isInterview =
    type === SimulationType.INTERVIEW || type === SimulationType.MEETING_INTERVIEW;

  const contextPrompt = !isInterview
    ? `DOKUMEN SKRIPSI:\n"${context.substring(0, 6000)}"`
    : `CV KANDIDAT:\n"${context.substring(0, 3000)}"\n\nJOB DESCRIPTION:\n"${(jd ?? "tidak ada").substring(0, 2000)}"`;

  const allowedPanelists = isInterview
    ? ["shinta", "maya", "budi"]
    : ["metod", "ima", "aris"];

  const isFirstTurn = history.length === 0;

  const historyPrompt = history.length > 0
    ? history
        .map(h => `Penguji: ${h.q}\nUser: ${h.a}`)
        .join('\n')
    : 'SESI BARU.';

  // Estimasi skor jawaban terakhir untuk keputusan lanjut/tekan
  const lastScore: number = (history as any).length > 0
    ? ((history as any)[history.length - 1]?.s ?? 50)
    : 50;

  const userInput = userSpeech?.trim() || '';
  const isDiam = !userInput
    || userInput.toLowerCase().includes('terdiam')
    || userInput.toLowerCase().includes('bingung')
    || userInput.length < 5;

  const userStatus = isDiam
    ? '(user terdiam atau tidak menjawab)'
    : `"${userInput}"`;

  const progressHint = isFirstTurn
    ? 'PEMBUKAAN: perkenalkan diri singkat + pertanyaan pertama berdasarkan dokumen.'
    : lastScore >= 70
    ? `Skor jawaban terakhir ${lastScore}/100 — LANJUT ke topik/aspek BARU.`
    : `Skor jawaban terakhir ${lastScore}/100 — TEKAN dari sudut berbeda, tapi jangan ulangi pertanyaan sama persis.`;

  const schemaHint = `{
  "script": "Nama Panelis: kalimat natural tanpa simbol",
  "panelistId": "${allowedPanelists.join('" | "')}",
  "isFollowUp": boolean,
  "score": number,
  "feedback": "string",
  "suggestedAnswer": "string"
}`;

  const vibeInstructions = {
    standard: "Gaya penguji standard sesuai deskripsi karakter masing-masing.",
    killer: "VIBE PENGUJI: KILLER (Sangat galak/tegas). Para penguji bersikap dingin, tidak toleran terhadap jawaban berbelit-belit atau tidak logis, terus mencecar kelemahan konsep/CV sekecil apa pun, pelit memberikan skor (skor maksimal 65 jika jawaban biasa saja, hanya berikan 80+ untuk jawaban yang benar-benar solid dan didukung bukti kuat), and sering memotong pembicaraan secara skeptis.",
    santai: "VIBE PENGUJI: SANTAI (Sangat ramah/suportif). Para penguji bersikap bersahabat, membimbing jika user bingung, memaklumi kesalahan kecil, nada bicaranya menenangkan, murah memberikan skor tinggi (berikan skor minimal 70 untuk usaha menjawab yang baik), dan memberikan feedback yang suportif.",
    gokil: "VIBE PENGUJI: GOKIL (Bahasa Gaul/Slang khas mahasiswa). Para penguji berkomunikasi menggunakan bahasa gaul informal Indonesia (seperti 'lu', 'gw', 'bray', 'gokil', 'parah', 'mantap', 'santuy'), sering bercanda, memuji dengan heboh jika jawaban keren, tetapi tetap menguji topik inti skripsi/CV dengan cara dan analogi yang kocak."
  }[vibe || 'standard'];

  const prompt = withJsonInstruction(`
MODE: ${isInterview ? 'INTERVIEW KERJA' : 'RUANG SIDANG'} — LIVE MEETING
PANELIS AKTIF: ${currentPanelist}
PANELIS YANG BOLEH DIGUNAKAN: ${allowedPanelists.join(', ')}
VIBE PENGUJI YANG HARUS DITERAPKAN: ${vibeInstructions}
INSTRUKSI PROGRES: ${progressHint}
PERTANYAAN INTI AKTIF SAAT INI: Pertanyaan ke-${coreQuestionsCount || 1} dari 10 pertanyaan inti.

${contextPrompt}

RIWAYAT TERAKHIR (Tampilkan seluruh percakapan):
${historyPrompt}

USER BARU SAJA BERKATA: ${userStatus}
${isDiam ? '\nUser diam — jangan panik. Reformulasi pertanyaan lebih simpel atau tanya "Masih di sana?"' : ''}

TEKNIS OUTPUT (TTS):
- Maksimal 2 kalimat.
- Awali dengan nama panelis: "Bu Shinta: ..." atau "Dr. Metod: ..."
- ZERO simbol aneh: tidak ada tanda kurung, bintang, tanda hubung ganda.
- Bicara natural seperti di video call, bukan membaca teks.
- Jangan sebut nama user berulang kali.
- Sekarang adalah pertanyaan inti ke-${coreQuestionsCount || 1} dari total batas 10 pertanyaan inti. Jika user menjawab dengan baik, ajukan pertanyaan berikutnya. Dilarang mengulangi pertanyaan sebelumnya!
- Tentukan apakah pertanyaan baru Anda ini merupakan sanggahan/cecaran atas jawaban terakhir yang kurang memuaskan (skor < 70) dengan mengisi field "isFollowUp" sebagai true. Jika ini pertanyaan inti baru yang berpindah topik (skor >= 70 atau maksimal 2x cecaran/sanggahan tercapai), set "isFollowUp" menjadi false.`.trim(), schemaHint);

  const text = await generateWithStrategy({
    useCase: 'live_meeting',
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION_MEETING,
    jsonMode: true,
  });

  return safeJsonParse(text, 'getNextTurnMeeting');
}

// ─────────────────────────────────────────────────────────────
//  FUNGSI: getSummary — Laporan akhir sesi
// ─────────────────────────────────────────────────────────────
export async function getSummary(
  type: SimulationType,
  allExchanges: { q: string; a: string; s: number }[]
): Promise<GeminiSummaryResponse> {
  const isInterview =
    type === SimulationType.INTERVIEW || 
    type === SimulationType.MEETING_INTERVIEW ||
    type === SimulationType.FLASHCARD_INTERVIEW;

  const schemaHint = isInterview
    ? `{
  "finalScore": number,
  "improvementTips": "string — 3 sampai 5 tips konkret spesifik berdasarkan percakapan",
  "unresolvedPoints": ["string"],
  "hiringLikelihood": number
}`
    : `{
  "finalScore": number,
  "improvementTips": "string — 3 sampai 5 tips konkret spesifik berdasarkan percakapan",
  "unresolvedPoints": ["string"]
}`;

  const avgScore = allExchanges.length > 0
    ? Math.round(allExchanges.reduce((sum, e) => sum + e.s, 0) / allExchanges.length)
    : 0;

  // Identifikasi pola kelemahan dari skor rendah
  const weakExchanges = allExchanges
    .filter(e => e.s < 60)
    .map(e => `Q: ${e.q} | Skor: ${e.s}`);

  const prompt = withJsonInstruction(`
Anda mengevaluasi sesi ${isInterview ? 'interview kerja' : 'sidang skripsi'}.

STATISTIK SESI:
- Total pertukaran: ${allExchanges.length}
- Skor rata-rata: ${avgScore}/100
- Pertukaran dengan skor rendah (<60): ${weakExchanges.length} dari ${allExchanges.length}

DATA LENGKAP SESI:
${JSON.stringify(allExchanges.map(e => ({ pertanyaan: e.q, jawaban: e.a, skor: e.s })))}

${weakExchanges.length > 0 ? `AREA LEMAH TERIDENTIFIKASI:\n${weakExchanges.join('\n')}` : ''}

INSTRUKSI EVALUASI:
1. finalScore: hitung rata-rata semua skor pertukaran
2. improvementTips: buat 3-5 tips SPESIFIK berdasarkan pola kelemahan yang terlihat di atas — bukan tips generik seperti "belajar lebih giat". Contoh yang baik: "Saat ditanya tentang metode sampling, Anda tidak bisa menjelaskan kriteria inklusi. Latih diri untuk selalu siapkan justifikasi setiap pilihan metodologi dengan referensi spesifik."
3. unresolvedPoints: topik/pertanyaan yang tidak berhasil dijawab dengan memuaskan (skor < 60)
${isInterview ? '4. hiringLikelihood: estimasi persentase kemungkinan diterima berdasarkan performa keseluruhan' : ''}

PENTING: improvementTips harus berupa satu string, bukan array. Gunakan angka di depan tiap tips (1. tips pertama 2. tips kedua dst).`,
    schemaHint
  );

  const text = await generateWithStrategy({
    useCase: 'summary',
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION_BASE,
    jsonMode: true,
  });

  const raw = safeJsonParse(text, 'getSummary');
  return normalizeSummary(raw);
}

// ─────────────────────────────────────────────────────────────
//  FUNGSI: generateFlashcards — Membuat kuis pilihan ganda
// ─────────────────────────────────────────────────────────────
export interface Flashcard {
  question: string;
  options: string[];
  correctOptionIndex: number;
  feedback: string;
}

export async function generateFlashcards(
  type: SimulationType,
  context: string,
  jd?: string,
  vibe?: 'standard' | 'killer' | 'santai' | 'gokil'
): Promise<Flashcard[]> {
  const isInterview = type === SimulationType.FLASHCARD_INTERVIEW;

  const contextPrompt = !isInterview
    ? `DOKUMEN SKRIPSI:\n"${context.substring(0, 10000)}"`
    : `CV KANDIDAT:\n"${context.substring(0, 5000)}"\n\nJOB DESCRIPTION:\n"${(jd ?? "tidak ada").substring(0, 2000)}"`;

  const schemaHint = `{
  "flashcards": [
    {
      "question": "string (pertanyaan spesifik terkait dokumen)",
      "options": [
        "string (Pilihan A, sertakan awalan 'A. ')",
        "string (Pilihan B, sertakan awalan 'B. ')",
        "string (Pilihan C, sertakan awalan 'C. ')"
      ],
      "correctOptionIndex": number (0 untuk A, 1 untuk B, 2 untuk C),
      "feedback": "string (penjelasan singkat mengapa jawaban tersebut benar dan yang lain salah)"
    }
  ]
}`;

  const prompt = withJsonInstruction(`
MODE: FLASHCARD ${isInterview ? 'INTERVIEW KERJA' : 'SIDANG SKRIPSI/TA'}
TUGAS: Hasilkan tepat 10 kuis flashcard pilihan ganda (A, B, C) yang spesifik dan menantang berdasarkan dokumen di bawah ini.

${contextPrompt}

KETERANGAN SOAL:
- Hubungkan pertanyaan dengan data, metodologi, bab, kelemahan, atau detail proyek dalam dokumen secara langsung.
- Pilihan jawaban harus menantang (distractor/pilihan pengecoh harus terdengar logis).
- Berikan penomoran A., B., C. pada masing-masing opsi pilihan.
- Berikan feedback yang edukatif dan bersahabat.
- Hasilkan tepat 10 kuis flashcard.
  `.trim(), schemaHint);

  const text = await generateWithStrategy({
    useCase: 'document_analysis',
    prompt,
    systemInstruction: "Anda adalah dosen penguji/HRD kritis yang membuat kuis kognitif interaktif pilihan ganda A, B, C dari draf skripsi/CV kandidat.",
    jsonMode: true,
  });

  const parsed = safeJsonParse(text, 'generateFlashcards');
  return parsed.flashcards || [];
}