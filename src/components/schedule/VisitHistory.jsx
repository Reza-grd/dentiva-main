import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, Calendar, User, FileText, Filter,
  ChevronDown, ChevronUp, X, Eye, CreditCard, Stethoscope,
  AlertCircle, CheckCircle, Clock, XCircle, Banknote,
  RefreshCw, Pill
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { visitService } from '../../services/visitService';
import { patientService } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

import { parseDateLocal } from '../../utils/dateUtils';

const formatDate = (date) => {
  const d = parseDateLocal(date);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

const formatDateShort = (date) => {
  const d = parseDateLocal(date);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

const VISIT_STATUS = {
  scheduled: { label: 'Terjadwal',   color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800',   icon: Clock },
  ongoing:   { label: 'Berlangsung', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: AlertCircle },
  completed: { label: 'Selesai',     color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',  icon: CheckCircle },
  cancelled: { label: 'Dibatalkan',  color: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-800',     icon: XCircle },
};

const PAYMENT_STATUS = {
  paid:      { label: 'Lunas',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  pending:   { label: 'Belum Bayar', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  partial:   { label: 'Sebagian', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  cancelled: { label: 'Dibatalkan', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
};

const StatusBadge = ({ status, type = 'visit' }) => {
  const map = type === 'payment' ? PAYMENT_STATUS : VISIT_STATUS;
  const cfg = map[status] || { label: status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' };
  const Icon = type === 'visit' ? (VISIT_STATUS[status]?.icon || Clock) : null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {Icon && <Icon size={12} />}
      {cfg.label}
    </span>
  );
};

// ─── Detail Modal ────────────────────────────────────────────────────────────

const VisitDetailModal = ({ visitId, onClose, navigate, role }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await visitService.getVisitById(visitId);
      if (res.success) setDetail(res.data);
      else setError(res.error);
      setLoading(false);
    };
    load();
  }, [visitId]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList size={20} className="text-[var(--color-accent)]" />
            Detail Kunjungan
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : error ? (
            <div className="text-center py-12 text-rose-500">
              <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          ) : detail ? (
            <>
              {/* Pasien Info */}
              <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-5 flex items-start gap-4 border border-gray-100 dark:border-gray-800">
                <div className="w-12 h-12 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center shrink-0">
                  <User size={24} className="text-[var(--color-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{detail.patient?.nama_lengkap}</p>
                  <p className="text-sm text-[var(--color-accent)] font-mono font-medium">{detail.patient?.no_rm}</p>
                  {detail.patient?.no_wa && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{detail.patient.no_wa}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={detail.status} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">Kunjungan #{detail.visit_number}</p>
                </div>
              </div>

              {/* Tanggal & Dokter */}
              <div className="grid grid-cols-2 gap-4">
                <InfoBox icon={Calendar} label="Tanggal Kunjungan" value={formatDate(detail.tanggal_kunjungan)} />
                <InfoBox icon={Stethoscope} label="Dokter" value={detail.dokter?.full_name || '-'} />
              </div>

              {/* SOAP */}
              <Section title="Pemeriksaan Klinis" icon={FileText}>
                <div className="space-y-4">
                  <Field label="Keluhan" value={detail.keluhan} />
                  <Field label="Pemeriksaan Fisik" value={detail.pemeriksaan_fisik} />
                  <Field label="Diagnosa" value={detail.diagnosa} />
                  {detail.kode_icd10 && <Field label="Kode ICD-10" value={detail.kode_icd10} mono />}
                  <Field label="Terapi / Rencana" value={detail.terapi} />
                  {detail.catatan_dokter && <Field label="Catatan Dokter" value={detail.catatan_dokter} />}
                </div>
              </Section>

              {/* Treatments */}
              {detail.treatments && detail.treatments.length > 0 && (
                <Section title="Tindakan / Treatment" icon={Pill}>
                  <div className="space-y-3">
                    {detail.treatments.map((t) => (
                      <div key={t.id} className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {t.treatment?.nama_treatment || '—'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t.treatment?.kategori}
                            {t.tooth_number ? ` · Gigi #${t.tooth_number}` : ''}
                            {t.notes ? ` · ${t.notes}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t.quantity}× {formatCurrency(t.harga_satuan)}</p>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white mt-1">{formatCurrency(t.subtotal)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                      <p className="font-bold text-[var(--color-accent)] text-lg">
                        Total: {formatCurrency(detail.treatments.reduce((s, t) => s + (t.subtotal || 0), 0))}
                      </p>
                    </div>
                  </div>
                </Section>
              )}

              {/* Payment */}
              <Section title="Status Pembayaran" icon={CreditCard}>
                {detail.payment ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Invoice</span>
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{detail.payment.invoice_number}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Bayar</span>
                      <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(detail.payment.total_bayar)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Metode</span>
                      <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">{detail.payment.metode_pembayaran || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                      <StatusBadge status={detail.payment.status_pembayaran} type="payment" />
                    </div>
                    {detail.payment.tanggal_pembayaran && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Tgl Bayar</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(detail.payment.tanggal_pembayaran)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data pembayaran untuk kunjungan ini.</p>
                  </div>
                )}
              </Section>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {detail && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end bg-gray-50/50 dark:bg-gray-900/50 rounded-b-2xl">
            {role !== 'admin' && (
              <button
                onClick={() => { navigate(`/pasien/${detail.patient_id}`); onClose(); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <User size={16} /> Profil Pasien
              </button>
            )}
            {detail.status === 'completed' && role === 'dokter' && (
              <button
                onClick={() => { navigate(`/rekam-medis/${detail.patient_id}`); onClose(); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)] transition-colors shadow-sm flex items-center gap-2"
              >
                <FileText size={16} /> Rekam Medis
              </button>
            )}
            {(detail.status === 'completed' && !detail.payment) && (
              <button
                onClick={() => { navigate(`/pembayaran/${detail.id}`); onClose(); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)] transition-colors shadow-sm flex items-center gap-2"
              >
                <Banknote size={16} /> Buat Pembayaran
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoBox = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
      <Icon size={16} />
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="font-bold text-gray-900 dark:text-white text-base">{value || '-'}</p>
  </div>
);

const Section = ({ title, icon: Icon, children }) => (
  <div className="mb-2">
    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3 uppercase tracking-wide">
      <Icon size={16} className="text-[var(--color-accent)]" />
      {title}
    </h3>
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">{children}</div>
  </div>
);

const Field = ({ label, value, mono = false }) =>
  value ? (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md inline-block' : ''}`}>{value}</p>
    </div>
  ) : null;

// ─── Timeline Item ───────────────────────────────────────────────────────────

const TimelineItem = ({ visit, isFirst, isLast, onViewDetail, role }) => {
  const [expanded, setExpanded] = useState(false);
  const payment = visit.payments?.[0] || null;
  const statusCfg = VISIT_STATUS[visit.status] || VISIT_STATUS.completed;

  return (
    <div className="flex gap-4">
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full border-2 mt-2 z-10 shrink-0 ${
          visit.status === 'completed'  ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
          visit.status === 'ongoing'    ? 'bg-amber-400 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' :
          visit.status === 'scheduled'  ? 'bg-blue-400 border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.3)]' :
          'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
        }`} />
        {!isLast && <div className="w-0.5 bg-gray-200 dark:bg-gray-700 flex-1 mt-2" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          {/* Card header */}
          <div
            className="px-5 py-4 flex items-start justify-between gap-4 cursor-pointer"
            onClick={() => setExpanded(v => !v)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {formatDateShort(visit.tanggal_kunjungan)}
                  {visit.jam_kunjungan ? ` · ${visit.jam_kunjungan.slice(0, 5)}` : ''}
                </span>
                <StatusBadge status={visit.status} />
                {payment && <StatusBadge status={payment.status_pembayaran} type="payment" />}
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base truncate flex items-center gap-2">
                {visit.patient?.nama_lengkap}
                <span className="text-xs font-mono font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded">{visit.patient?.no_rm}</span>
              </p>
              {visit.keluhan && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  Keluhan: {visit.keluhan}
                </p>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-400">
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {/* Expanded body */}
          {expanded && (
            <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4 bg-gray-50/30 dark:bg-gray-800/20 rounded-b-xl">
              <div className="grid grid-cols-2 gap-4">
                {visit.diagnosa && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Diagnosa</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{visit.diagnosa}</p>
                  </div>
                )}
                {visit.terapi && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Terapi</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{visit.terapi}</p>
                  </div>
                )}
                {visit.dokter?.full_name && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dokter</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-[var(--color-accent)]" />
                      {visit.dokter.full_name}
                    </p>
                  </div>
                )}
                {payment && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pembayaran</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(payment.total_bayar)}
                      <span className="text-xs font-medium text-gray-500 ml-1.5 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded capitalize">
                        {payment.metode_pembayaran || '-'}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 mt-4">
                <button
                  onClick={() => onViewDetail(visit.id)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <Eye size={16} /> Lihat Detail Penuh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const VisitHistory = () => {
  const navigate = useNavigate();
  const { patientId: routePatientId } = useParams();
  const { userProfile } = useAuth();
  const role = userProfile?.role;

  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState(routePatientId || '');
  const [dokterFilter, setDokterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupByPatient, setGroupByPatient] = useState(false);

  // Server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const setQuickDate = (mode) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    setDateTo(fmt(now));
    if (mode === 'today') {
      setDateFrom(fmt(now));
    } else if (mode === 'week') {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      setDateFrom(fmt(w));
    } else if (mode === 'month') {
      const m = new Date(now); m.setDate(m.getDate() - 30);
      setDateFrom(fmt(m));
    } else if (mode === 'year') {
      const y = new Date(now); y.setDate(y.getDate() - 365);
      setDateFrom(fmt(y));
    } else {
      setDateFrom(''); setDateTo('');
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [visitsRes, patientsRes, doctorsRes] = await Promise.all([
      visitService.getAllVisitsWithPayments({
        patientId: patientFilter || undefined,
        dokterIdFilter: dokterFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: pageSize
      }),
      patientService.getAllPatients(),
      visitService.getAllDoctors(),
    ]);

    if (!visitsRes.success) setError(visitsRes.error);
    else {
      setVisits(visitsRes.data || []);
      setTotalCount(visitsRes.count || 0);
    }

    if (patientsRes.success) setPatients(patientsRes.data || []);
    if (doctorsRes.success) setDoctors(doctorsRes.data || []);

    setLoading(false);
  }, [patientFilter, dokterFilter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredVisits = visits.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (paymentStatusFilter !== 'all') {
      const ps = v.payments?.[0]?.status_pembayaran;
      if (paymentStatusFilter === 'none') {
        if (ps) return false;
      } else if (ps !== paymentStatusFilter) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        v.patient?.nama_lengkap?.toLowerCase().includes(q) ||
        v.patient?.no_rm?.toLowerCase().includes(q) ||
        v.keluhan?.toLowerCase().includes(q) ||
        v.diagnosa?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const groupedVisits = groupByPatient
    ? filteredVisits.reduce((acc, v) => {
        const key = v.patient_id;
        if (!acc[key]) acc[key] = { patient: v.patient, visits: [] };
        acc[key].visits.push(v);
        return acc;
      }, {})
    : null;

  const stats = {
    total: filteredVisits.length,
    completed: filteredVisits.filter(v => v.status === 'completed').length,
    ongoing: filteredVisits.filter(v => v.status === 'ongoing').length,
    scheduled: filteredVisits.filter(v => v.status === 'scheduled').length,
    paid: filteredVisits.filter(v => v.payments?.[0]?.status_pembayaran === 'paid').length,
    unpaid: filteredVisits.filter(v => v.status === 'completed' && !v.payments?.[0]).length,
  };

  const clearFilters = () => {
    setSearchTerm(''); setPatientFilter(''); setDokterFilter('');
    setStatusFilter('all'); setPaymentStatusFilter('all');
    setDateFrom(''); setDateTo('');
  };

  const hasActiveFilters = searchTerm || patientFilter || dokterFilter ||
    statusFilter !== 'all' || paymentStatusFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
            <ClipboardList className="text-[var(--color-accent)]" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Riwayat Kunjungan</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Timeline lengkap semua kunjungan pasien</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGroupByPatient(v => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm ${
              groupByPatient 
                ? 'bg-[var(--color-accent)] text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <User size={16} />
            {groupByPatient ? 'Per Pasien ✓' : 'Kelompokkan per Pasien'}
          </button>
          <button onClick={loadData} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Filter size={16} className="text-[var(--color-accent)]" /> Filter Pencarian
          </h2>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs font-semibold px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center gap-1">
              <X size={14} /> Hapus Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Pencarian</label>
            <Search size={16} className="absolute left-3 top-[28px] text-gray-400" />
            <input
              type="text"
              placeholder="Nama, No.RM, keluhan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Pasien</label>
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-sm appearance-none"
            >
              <option value="">Semua Pasien</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.nama_lengkap} ({p.no_rm})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Dokter</label>
            <select
              value={dokterFilter}
              onChange={(e) => { setDokterFilter(e.target.value); setPage(1); }}
              className="glass-input w-full px-3 py-2 rounded-xl text-sm appearance-none"
            >
              <option value="">Semua Dokter</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Status Kunjungan</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-input w-full px-3 py-2 rounded-xl text-sm appearance-none">
              <option value="all">Semua Status</option>
              <option value="scheduled">Terjadwal</option>
              <option value="ongoing">Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Status Bayar</label>
            <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className="glass-input w-full px-3 py-2 rounded-xl text-sm appearance-none">
              <option value="all">Semua</option>
              <option value="paid">Lunas</option>
              <option value="pending">Belum Bayar</option>
              <option value="partial">Sebagian</option>
              <option value="none">Tanpa Pembayaran</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Cepat:</span>
          {[['today', 'Hari Ini'], ['week', '7 Hari'], ['month', '30 Hari'], ['year', '1 Tahun'], ['all', 'Semua']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setQuickDate(k)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-gray-900' },
          { label: 'Selesai', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
          { label: 'Proses', value: stats.ongoing, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-900/10' },
          { label: 'Terjadwal', value: stats.scheduled, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-900/10' },
          { label: 'Lunas', value: stats.paid, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
          { label: 'Belum Bayar', value: stats.unpaid, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/50 dark:bg-rose-900/10' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`glass-panel p-4 text-center border-none ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[var(--color-accent)]" />
            Timeline Kunjungan
          </div>
          <span className="text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full">{filteredVisits.length} kunjungan</span>
        </h2>

        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle size={48} className="mx-auto mb-4 text-rose-500 opacity-80" />
            <p className="font-bold text-gray-900 dark:text-white text-lg">Gagal memuat data</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{error}</p>
            <button onClick={loadData} className="mt-6 px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors text-gray-900 dark:text-white">Coba Lagi</button>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">Tidak ada kunjungan ditemukan</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Coba ubah filter pencarian Anda</p>
          </div>
        ) : groupByPatient && groupedVisits ? (
          <div className="space-y-10">
            {Object.values(groupedVisits).map(({ patient, visits: pVisits }) => (
              <div key={patient?.id} className="relative">
                <div className="flex items-center gap-3 mb-6 bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center">
                    <User size={20} className="text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{patient?.nama_lengkap}</p>
                    <p className="text-xs font-mono font-medium text-[var(--color-accent)]">{patient?.no_rm} <span className="text-gray-400 mx-1">•</span> {pVisits.length} kunjungan</p>
                  </div>
                </div>
                <div className="pl-4 border-l-2 border-gray-100 dark:border-gray-800 ml-4">
                  {pVisits.map((v, i) => (
                    <TimelineItem
                      key={v.id}
                      visit={v}
                      isFirst={i === 0}
                      isLast={i === pVisits.length - 1}
                      onViewDetail={setSelectedVisitId}
                      role={role}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pl-4">
            {filteredVisits.map((v, i) => (
              <TimelineItem
                key={v.id}
                visit={v}
                isFirst={i === 0}
                isLast={i === filteredVisits.length - 1}
                onViewDetail={setSelectedVisitId}
                role={role}
              />
            ))}
          </div>
        )}
      </div>

      {selectedVisitId && (
        <VisitDetailModal
          visitId={selectedVisitId}
          onClose={() => setSelectedVisitId(null)}
          navigate={navigate}
          role={role}
        />
      )}
    </div>
  );
};

export default VisitHistory;
