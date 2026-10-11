/**
 * Konteks percakapan untuk otak lokal Denti (smallTalk), diturunkan dari daftar pesan:
 *   offer      — tawaran "Buka …" dari balasan terakhir (dijawab "ya"/"tidak")
 *   quiz       — nomor soal kuis yang sedang berjalan (atau null)
 *   lastIntent — maksud balasan lokal terakhir (untuk "lagi")
 *   recent     — balasan lokal terakhir (agar tidak mengulang kalimat)
 *   afterAnswer— sudah ada jawaban AI sebelumnya
 * Pesan asisten berbentuk { role: 'assistant', content, local?, intent?, action?, error? }.
 */
export function chatContext(messages = []) {
  const replies = [...messages].reverse().filter((m) => m.role === 'assistant');
  const lastMsg = messages[messages.length - 1];
  const offer = lastMsg?.role === 'assistant' && lastMsg.action?.type === 'offer' ? { to: lastMsg.action.to, label: lastMsg.action.label } : null;
  const lastQuiz = replies.find((m) => m.action?.type === 'quiz');
  const quiz = lastQuiz && lastQuiz.action.idx != null ? lastQuiz.action.idx : null;
  return {
    offer,
    quiz,
    lastIntent: replies[0]?.intent || null,
    recent: replies.filter((m) => m.local).slice(0, 6).map((m) => m.content),
    afterAnswer: replies.some((m) => !m.local && !m.error),
  };
}
