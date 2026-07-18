import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { encryptionService } from '../../services/encryptionService';
import { Clock, Users, UserCheck, Activity, Stethoscope, CalendarCheck } from 'lucide-react';

// ─────────────────────────────────────────────
//  QUEUE DISPLAY — Smart TV Waiting Room Screen
// ─────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 10000; // 10 seconds

const QueueDisplay = () => {
  const [visits, setVisits] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const clockRef = useRef(null);

  // ─── Fetch today's visits ──────────────────
  const fetchTodayVisits = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, status, jam_kunjungan, nomor_antrian, created_at,
          patient:patients(nama_lengkap, no_rm),
          dokter:users!dokter_id(full_name)
        `)
        .eq('tanggal_kunjungan', today)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Decrypt patient names
      if (data && data.length > 0) {
        const payloads = [];
        data.forEach(v => {
          payloads.push(v.patient?.nama_lengkap || '');
        });
        const decrypted = await encryptionService.decryptBatch(payloads);
        data.forEach((v, i) => {
          if (v.patient) v.patient.nama_lengkap = decrypted[i];
        });
      }

      setVisits(data || []);
    } catch (err) {
      console.error('Queue fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayVisits();

    // Auto-refresh data
    intervalRef.current = setInterval(fetchTodayVisits, REFRESH_INTERVAL_MS);

    // Live clock
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000);

    // Supabase Realtime subscription for instant updates
    const channel = supabase
      .channel('queue-display-visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        fetchTodayVisits();
      })
      .subscribe();

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(clockRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Categorize visits ─────────────────────
  const ongoingVisits = visits.filter(v => v.status === 'ongoing');
  const waitingVisits = visits.filter(v => !v.status || v.status === 'scheduled');
  const completedVisits = visits.filter(v => v.status === 'completed');

  // ─── Helpers ───────────────────────────────
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  // Privacy: tampilkan nama depan + inisial nama belakang ("Budi Santoso" → "Budi S.")
  const maskedName = (name) => {
    if (!name) return 'Pasien';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // ─── Render ────────────────────────────────
  if (loading) {
    return (
      <div className="queue-display-loading">
        <div className="queue-spinner" />
        <p>Memuat Antrean...</p>
      </div>
    );
  }

  return (
    <div className="queue-display">
      {/* Header */}
      <header className="queue-header">
        <div className="queue-header-left">
          <div className="queue-logo">
            <Stethoscope size={32} />
          </div>
          <div>
            <h1 className="queue-clinic-name">NeuroDent Dental Clinic</h1>
            <p className="queue-date">{formatDate(currentTime)}</p>
          </div>
        </div>
        <div className="queue-header-right">
          <div className="queue-clock">{formatTime(currentTime)}</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="queue-body">

        {/* Now Serving - Prominent Left Panel */}
        <div className="queue-now-serving-panel">
          <div className="queue-panel-header">
            <Activity size={24} className="queue-pulse-icon" />
            <span>SEDANG DIPERIKSA</span>
          </div>

          {ongoingVisits.length === 0 ? (
            <div className="queue-empty-state">
              <UserCheck size={48} />
              <p>Tidak ada pasien yang sedang diperiksa</p>
            </div>
          ) : (
            <div className="queue-now-serving-list">
              {ongoingVisits.map((v, idx) => (
                <div key={v.id} className="queue-now-serving-card" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className="queue-now-serving-avatar">
                    {getInitials(v.patient?.nama_lengkap)}
                  </div>
                  <div className="queue-now-serving-info">
                    <p className="queue-now-serving-name">{maskedName(v.patient?.nama_lengkap)}</p>
                    <p className="queue-now-serving-doctor">
                      <Stethoscope size={14} /> {v.dokter?.full_name || 'Dokter'}
                    </p>
                  </div>
                  <div className="queue-now-serving-badge">
                    <span className="queue-badge-pulse" />
                    BERLANGSUNG
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Waiting + Summary */}
        <div className="queue-right-side">

          {/* Waiting List */}
          <div className="queue-waiting-panel">
            <div className="queue-panel-header queue-panel-header-blue">
              <Users size={22} />
              <span>ANTREAN BERIKUTNYA</span>
              <span className="queue-count-badge">{waitingVisits.length}</span>
            </div>

            {waitingVisits.length === 0 ? (
              <div className="queue-empty-state queue-empty-small">
                <CalendarCheck size={36} />
                <p>Tidak ada pasien dalam antrean</p>
              </div>
            ) : (
              <div className="queue-waiting-list">
                {waitingVisits.map((v, idx) => (
                  <div key={v.id} className="queue-waiting-row" style={{ animationDelay: `${idx * 0.08}s` }}>
                    <span className="queue-order-number">{idx + 1}</span>
                    <div className="queue-waiting-info">
                      <span className="queue-waiting-name">{maskedName(v.patient?.nama_lengkap)}</span>
                      <span className="queue-waiting-doctor">{v.dokter?.full_name || '-'}</span>
                    </div>
                    {v.jam_kunjungan && (
                      <span className="queue-waiting-time">
                        <Clock size={14} /> {v.jam_kunjungan}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="queue-stats-bar">
            <div className="queue-stat">
              <span className="queue-stat-value queue-stat-ongoing">{ongoingVisits.length}</span>
              <span className="queue-stat-label">Diperiksa</span>
            </div>
            <div className="queue-stat">
              <span className="queue-stat-value queue-stat-waiting">{waitingVisits.length}</span>
              <span className="queue-stat-label">Menunggu</span>
            </div>
            <div className="queue-stat">
              <span className="queue-stat-value queue-stat-completed">{completedVisits.length}</span>
              <span className="queue-stat-label">Selesai</span>
            </div>
            <div className="queue-stat">
              <span className="queue-stat-value queue-stat-total">{visits.length}</span>
              <span className="queue-stat-label">Total Hari Ini</span>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Ticker */}
      <footer className="queue-footer">
        <div className="queue-ticker">
          <span className="queue-ticker-text">
            🦷 Selamat datang di NeuroDent Dental Clinic — Mohon bersabar, kami akan segera memanggil Anda. Terima kasih telah mempercayakan kesehatan gigi Anda kepada kami. 🦷
          </span>
        </div>
      </footer>

      <style>{`
        /* ─── BASE ───────────────────────────────── */
        .queue-display {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          overflow: hidden;
          z-index: 9999;
        }

        /* ─── LOADING ────────────────────────────── */
        .queue-display-loading {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: #94a3b8;
          font-size: 1.5rem;
          gap: 1rem;
        }
        .queue-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #334155;
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: qspin 1s linear infinite;
        }
        @keyframes qspin { to { transform: rotate(360deg); } }

        /* ─── HEADER ─────────────────────────────── */
        .queue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 2.5rem;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(56, 189, 248, 0.15);
        }
        .queue-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .queue-logo {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 20px rgba(14, 165, 233, 0.3);
        }
        .queue-clinic-name {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(90deg, #e0f2fe, #bae6fd, #7dd3fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }
        .queue-date {
          font-size: 0.95rem;
          color: #94a3b8;
          margin-top: 2px;
        }
        .queue-clock {
          font-size: 2.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #38bdf8;
          text-shadow: 0 0 20px rgba(56, 189, 248, 0.35);
        }

        /* ─── BODY ───────────────────────────────── */
        .queue-body {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          padding: 1.5rem 2.5rem;
          overflow: hidden;
        }

        /* ─── PANEL HEADERS ──────────────────────── */
        .queue-panel-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #fb923c;
          padding: 0.75rem 1rem;
          border-radius: 12px 12px 0 0;
          background: rgba(251, 146, 60, 0.08);
          border-bottom: 2px solid rgba(251, 146, 60, 0.2);
        }
        .queue-panel-header-blue {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.06);
          border-bottom-color: rgba(56, 189, 248, 0.15);
        }

        /* ─── NOW SERVING PANEL ──────────────────── */
        .queue-now-serving-panel {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(251, 146, 60, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .queue-now-serving-list {
          flex: 1;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
        }
        .queue-now-serving-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: linear-gradient(135deg, rgba(251, 146, 60, 0.08), rgba(249, 115, 22, 0.04));
          border: 1px solid rgba(251, 146, 60, 0.15);
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          animation: slideInLeft 0.5s ease-out both;
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .queue-now-serving-avatar {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
        .queue-now-serving-info { flex: 1; }
        .queue-now-serving-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f1f5f9;
        }
        .queue-now-serving-doctor {
          font-size: 0.9rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 4px;
        }
        .queue-now-serving-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #fb923c;
          background: rgba(251, 146, 60, 0.12);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .queue-badge-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fb923c;
          animation: badgePulse 1.5s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(251,146,60,0.6); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(251,146,60,0); }
        }

        /* ─── PULSE ICON (header) ────────────────── */
        .queue-pulse-icon {
          animation: iconPulse 2s ease-in-out infinite;
        }
        @keyframes iconPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ─── EMPTY STATES ───────────────────────── */
        .queue-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: #475569;
          font-size: 1.1rem;
        }
        .queue-empty-small {
          font-size: 1rem;
          padding: 2rem;
        }

        /* ─── RIGHT SIDE ─────────────────────────── */
        .queue-right-side {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* ─── WAITING PANEL ──────────────────────── */
        .queue-waiting-panel {
          flex: 1;
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(56, 189, 248, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .queue-waiting-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 0;
        }
        .queue-waiting-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1.25rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.06);
          animation: fadeInUp 0.4s ease-out both;
          transition: background 0.2s;
        }
        .queue-waiting-row:hover {
          background: rgba(56, 189, 248, 0.04);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .queue-order-number {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
          font-weight: 800;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .queue-waiting-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .queue-waiting-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
        }
        .queue-waiting-doctor {
          font-size: 0.8rem;
          color: #64748b;
        }
        .queue-waiting-time {
          font-size: 0.85rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .queue-count-badge {
          margin-left: auto;
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          font-size: 0.85rem;
          font-weight: 800;
          padding: 0.15rem 0.65rem;
          border-radius: 8px;
        }

        /* ─── STATS BAR ──────────────────────────── */
        .queue-stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .queue-stat {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.08);
          border-radius: 14px;
          padding: 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .queue-stat-value {
          font-size: 2rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .queue-stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .queue-stat-ongoing   { color: #fb923c; }
        .queue-stat-waiting   { color: #38bdf8; }
        .queue-stat-completed { color: #4ade80; }
        .queue-stat-total     { color: #a78bfa; }

        /* ─── FOOTER TICKER ──────────────────────── */
        .queue-footer {
          padding: 0.75rem 0;
          background: rgba(15, 23, 42, 0.9);
          border-top: 1px solid rgba(56, 189, 248, 0.1);
          overflow: hidden;
        }
        .queue-ticker {
          display: flex;
          white-space: nowrap;
          animation: ticker 35s linear infinite;
        }
        .queue-ticker-text {
          font-size: 1rem;
          color: #94a3b8;
          padding-left: 100%;
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }

        /* ─── SCROLLBAR ──────────────────────────── */
        .queue-waiting-list::-webkit-scrollbar,
        .queue-now-serving-list::-webkit-scrollbar {
          width: 4px;
        }
        .queue-waiting-list::-webkit-scrollbar-thumb,
        .queue-now-serving-list::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default QueueDisplay;
