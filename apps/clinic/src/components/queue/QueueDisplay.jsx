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
          background: linear-gradient(135deg, var(--color-primary-dark) 0%, #0f172a 100%);
          font-family: var(--font-sans);
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
          background: var(--color-primary-dark);
          color: #94a3b8;
          font-size: 1.5rem;
          gap: 1rem;
        }
        .queue-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--color-secondary);
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
          background: rgba(10, 52, 96, 0.6);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0, 180, 216, 0.2);
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
          background: linear-gradient(135deg, var(--color-primary-light), var(--color-secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 25px rgba(0, 180, 216, 0.4);
        }
        .queue-clinic-name {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(90deg, #ffffff, var(--color-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }
        .queue-date {
          font-size: 0.95rem;
          color: #cbd5e1;
          margin-top: 2px;
        }
        .queue-clock {
          font-size: 2.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--color-secondary);
          text-shadow: 0 0 20px rgba(0, 180, 216, 0.4);
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
          color: var(--color-warning);
          padding: 0.75rem 1rem;
          border-radius: 12px 12px 0 0;
          background: rgba(245, 158, 11, 0.1);
          border-bottom: 2px solid rgba(245, 158, 11, 0.3);
        }
        .queue-panel-header-blue {
          color: var(--color-secondary);
          background: rgba(0, 180, 216, 0.1);
          border-bottom-color: rgba(0, 180, 216, 0.3);
        }

        /* ─── NOW SERVING PANEL ──────────────────── */
        .queue-now-serving-panel {
          background: rgba(15, 76, 129, 0.4);
          border-radius: 16px;
          border: 1px solid rgba(245, 158, 11, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          animation: slideInLeft 0.5s ease-out both, cardPulse 2.5s infinite alternate;
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardPulse {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          100% { box-shadow: 0 0 20px 4px rgba(245, 158, 11, 0.1); }
        }
        .queue-now-serving-avatar {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--color-warning), #d97706);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }
        .queue-now-serving-info { flex: 1; }
        .queue-now-serving-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: #ffffff;
        }
        .queue-now-serving-doctor {
          font-size: 1rem;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 4px;
        }
        .queue-now-serving-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--color-warning);
          background: rgba(245, 158, 11, 0.15);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .queue-badge-pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-warning);
          animation: badgePulse 1.2s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.8); }
          50% { opacity: 0.5; box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }

        /* ─── PULSE ICON (header) ────────────────── */
        .queue-pulse-icon {
          animation: iconPulse 1.5s ease-in-out infinite;
          color: var(--color-warning);
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }

        /* ─── EMPTY STATES ───────────────────────── */
        .queue-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: #64748b;
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
          background: rgba(15, 76, 129, 0.3);
          border-radius: 16px;
          border: 1px solid rgba(0, 180, 216, 0.2);
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          animation: fadeInUp 0.4s ease-out both;
          transition: background 0.2s;
        }
        .queue-waiting-row:hover {
          background: rgba(0, 180, 216, 0.08);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .queue-order-number {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(0, 180, 216, 0.15);
          color: var(--color-secondary);
          font-weight: 800;
          font-size: 1.1rem;
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
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
        }
        .queue-waiting-doctor {
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .queue-waiting-time {
          font-size: 0.9rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .queue-count-badge {
          margin-left: auto;
          background: rgba(0, 180, 216, 0.2);
          color: var(--color-secondary);
          font-size: 0.9rem;
          font-weight: 800;
          padding: 0.2rem 0.75rem;
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
          background: rgba(15, 76, 129, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .queue-stat-value {
          font-size: 2.2rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .queue-stat-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .queue-stat-ongoing   { color: var(--color-warning); }
        .queue-stat-waiting   { color: var(--color-secondary); }
        .queue-stat-completed { color: var(--color-success); }
        .queue-stat-total     { color: var(--color-primary-light); }

        /* ─── FOOTER TICKER ──────────────────────── */
        .queue-footer {
          padding: 0.8rem 0;
          background: rgba(10, 52, 96, 0.8);
          border-top: 1px solid rgba(0, 180, 216, 0.2);
          overflow: hidden;
        }
        .queue-ticker {
          display: flex;
          white-space: nowrap;
          animation: ticker 25s linear infinite;
        }
        .queue-ticker-text {
          font-size: 1.05rem;
          font-weight: 500;
          color: #cbd5e1;
          padding-left: 100%;
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }

        /* ─── SCROLLBAR ──────────────────────────── */
        .queue-waiting-list::-webkit-scrollbar,
        .queue-now-serving-list::-webkit-scrollbar {
          width: 5px;
        }
        .queue-waiting-list::-webkit-scrollbar-thumb,
        .queue-now-serving-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default QueueDisplay;
