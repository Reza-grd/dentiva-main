import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Lock, Bell, Database, Save, Check, MessageSquare, Send, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import { supabase } from '../../services/supabase';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';
import TreatmentEducationTemplates from './TreatmentEducationTemplates';
import SoapTemplates from './SoapTemplates';

const SettingsPage = () => {
  const { user, userProfile } = useAuth();
  const toast = useToast();

  const { settings: clinicSettings, updateSettings: updateClinicSettings } = useClinicSettings();
  const isAdmin = userProfile?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'profile' : 'security');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [testPhone, setTestPhone] = useState('');
  const [testingWA, setTestingWA] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase.rpc('get_audit_logs');
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (e) {
      toast.error('Gagal memuat log audit: ' + e.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setActiveTab(userProfile.role === 'admin' ? 'profile' : 'security');
    }
  }, [userProfile]);

  // Password Update States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Masukkan password saat ini');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    setUpdatingPassword(true);
    try {
      // Re-authenticate user to confirm current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (authError) {
        toast.error('Password saat ini salah');
        setUpdatingPassword(false);
        return;
      }

      // Perform user password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error('Gagal mengganti password: ' + updateError.message);
      } else {
        toast.success('Password berhasil diganti!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (e) {
      console.error(e);
      toast.error('Terjadi kesalahan saat mengganti password');
    } finally {
      setUpdatingPassword(false);
    }
  };
  const [formData, setFormData] = useState(() => {
    const defaults = {
      clinicName: 'Dentiva Dental Clinic',
      clinicAddress: 'Jl. Contoh No. 123, Jakarta',
      clinicPhone: '021-12345678',
      clinicEmail: 'info@Dentiva.com',
      timezone: 'Asia/Jakarta',
      currency: 'IDR',
      language: 'id',
      emailNotif: true,
      smsNotif: false,
      appointmentReminder: true,
      paymentReminder: true,
      waPaymentConfirmationEnabled: true,
      waReminderH1DayEnabled: true,
      waReminderH1HourEnabled: true,
      waPostTreatmentEducationEnabled: false,
    };

    try {
      const saved = localStorage.getItem('Dentiva_clinic_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            clinicName: parsed.clinicName || defaults.clinicName,
            clinicAddress: parsed.clinicAddress || defaults.clinicAddress,
            clinicPhone: parsed.clinicPhone || defaults.clinicPhone,
            clinicEmail: parsed.clinicEmail || defaults.clinicEmail,
            timezone: parsed.timezone || defaults.timezone,
            currency: parsed.currency || defaults.currency,
            language: parsed.language || defaults.language,
            emailNotif: parsed.emailNotif !== false,
            smsNotif: !!parsed.smsNotif,
            appointmentReminder: parsed.appointmentReminder !== false,
            paymentReminder: parsed.paymentReminder !== false,
            waPaymentConfirmationEnabled: parsed.waPaymentConfirmationEnabled !== false,
            waReminderH1DayEnabled: parsed.waReminderH1DayEnabled !== false,
            waReminderH1HourEnabled: parsed.waReminderH1HourEnabled !== false,
            waPostTreatmentEducationEnabled: !!parsed.waPostTreatmentEducationEnabled,
          };
        }
      }
    } catch (e) {
      console.error('Error parsing localStorage settings:', e);
    }
    return defaults;
  });

  useEffect(() => {
    if (clinicSettings) {
      setFormData(prev => ({
        ...prev,
        clinicName: clinicSettings.clinic_name || prev.clinicName,
        clinicPhone: clinicSettings.clinic_phone || prev.clinicPhone,
        waPaymentConfirmationEnabled: clinicSettings.wa_payment_confirmation_enabled !== 'false',
        waReminderH1DayEnabled: clinicSettings.wa_reminder_h1_day_enabled !== 'false',
        waReminderH1HourEnabled: clinicSettings.wa_reminder_h1_hour_enabled !== 'false',
        waPostTreatmentEducationEnabled: clinicSettings.wa_post_treatment_education_enabled === 'true',
      }));
    }
  }, [clinicSettings]);

  const handleSave = async () => {
    const newErrors = {};
    if (!formData.clinicName.trim()) newErrors.clinicName = 'Nama klinik wajib diisi';
    if (!formData.clinicPhone.trim()) newErrors.clinicPhone = 'Nomor telepon wajib diisi';
    if (formData.clinicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clinicEmail)) {
      newErrors.clinicEmail = 'Format email tidak valid';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      localStorage.setItem('Dentiva_clinic_settings', JSON.stringify(formData));
    } catch {}

    if (isAdmin) {
      const { success, error } = await updateClinicSettings({
        clinic_name: formData.clinicName,
        clinic_phone: formData.clinicPhone,
        wa_payment_confirmation_enabled: String(formData.waPaymentConfirmationEnabled),
        wa_reminder_h1_day_enabled: String(formData.waReminderH1DayEnabled),
        wa_reminder_h1_hour_enabled: String(formData.waReminderH1HourEnabled),
        wa_post_treatment_education_enabled: String(formData.waPostTreatmentEducationEnabled),
      });

      if (!success) {
        toast.error('Gagal menyimpan ke database: ' + error);
        return;
      }
    }

    setSaved(true);
    toast.success('Pengaturan berhasil disimpan!');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestWA = async () => {
    if (!testPhone.trim()) {
      toast.error('Masukkan nomor WhatsApp penerima untuk test');
      return;
    }
    setTestingWA(true);
    try {
      const rawPhone = testPhone.trim().replace(/[^0-9]/g, '');
      const phone = rawPhone.startsWith('0')
        ? '62' + rawPhone.slice(1)
        : rawPhone;

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { 
          isTest: true, 
          targetPhone: phone,
          target: phone,
          message: `🦷 TEST WHATSAPP GATEWAY\nWhatsApp gateway ${formData.clinicName || 'klinik'} berhasil terhubung!\nStatus: ✅ AKTIF (Whapi.cloud)`
        }
      });
      
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.message || 'WhatsApp sending failed');
      }
      toast.success('Pesan uji coba berhasil dikirim!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengirim pesan uji coba: ' + e.message);
    } finally {
      setTestingWA(false);
    }
  };

  const tabs = [
    ...(isAdmin ? [
      { id: 'profile', label: 'Profil Klinik', icon: User },
      { id: 'notifications', label: 'Notifikasi', icon: Bell },
      { id: 'whatsapp', label: 'Pengaturan WhatsApp', icon: MessageSquare },
      { id: 'treatment-education', label: 'Edukasi Perawatan', icon: MessageSquare },
      { id: 'soap-templates', label: 'Template SOAP', icon: Save },
    ] : []),
    { id: 'security', label: 'Keamanan', icon: Lock },
    { id: 'audit-logs', label: 'Log Audit', icon: Shield },
    ...(isAdmin ? [
      { id: 'database', label: 'Database', icon: Database },
    ] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="text-[var(--color-accent)]" size={32} />
          Pengaturan Sistem
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Kelola konfigurasi dan preferensi sistem</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-2 rounded-2xl">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                    }`}
                  >
                    <Icon size={20} className={activeTab === tab.id ? 'text-[var(--color-accent)]' : ''} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profil Klinik</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nama Klinik
                    </label>
                    <input
                      type="text"
                      value={formData.clinicName}
                      onChange={(e) => { setFormData({ ...formData, clinicName: e.target.value }); setErrors(p=>({...p,clinicName:null})); }}
                      className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.clinicName ? 'border-rose-500' : ''}`}
                    />
                    {errors.clinicName && <p className="text-rose-500 text-xs mt-1.5">{errors.clinicName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alamat
                    </label>
                    <textarea
                      value={formData.clinicAddress}
                      onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 rounded-xl resize-none"
                      rows="3"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Telepon
                      </label>
                      <input
                        type="tel"
                        value={formData.clinicPhone}
                        onChange={(e) => setFormData({ ...formData, clinicPhone: e.target.value })}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.clinicEmail}
                        onChange={(e) => setFormData({ ...formData, clinicEmail: e.target.value })}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Zona Waktu
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                      >
                        <option value="Asia/Jakarta">WIB (Jakarta)</option>
                        <option value="Asia/Makassar">WITA (Makassar)</option>
                        <option value="Asia/Jayapura">WIT (Jayapura)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mata Uang
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                      >
                        <option value="IDR">IDR (Rupiah)</option>
                        <option value="USD">USD (Dollar)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bahasa
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                      >
                        <option value="id">Indonesia</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Pengaturan Notifikasi</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Terima notifikasi melalui email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emailNotif}
                        onChange={(e) => setFormData({ ...formData, emailNotif: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">SMS Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Terima notifikasi melalui SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.smsNotif}
                        onChange={(e) => setFormData({ ...formData, smsNotif: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Appointment Reminders</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kirim pengingat janji temu ke pasien</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.appointmentReminder}
                        onChange={(e) => setFormData({ ...formData, appointmentReminder: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Payment Reminders</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kirim pengingat pembayaran</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.paymentReminder}
                        onChange={(e) => setFormData({ ...formData, paymentReminder: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Tab */}
            {activeTab === 'whatsapp' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Pengaturan WhatsApp</h2>
                
                <div className="space-y-6">
                  {/* WhatsApp Notification Toggles */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Toggles Notifikasi Otomatis</h3>
                    
                    <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">WA Konfirmasi Pembayaran (Lunas)</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kirim struk / kuitansi lunas otomatis setelah kasir memproses pembayaran.</p>
                      </div>
                      <label className="relative inline-flex inline-flex shrink-0 items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.waPaymentConfirmationEnabled}
                          onChange={(e) => setFormData({ ...formData, waPaymentConfirmationEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">WA Edukasi Pasca Tindakan & Obat</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kirim petunjuk perawatan pasca tindakan & panduan obat otomatis 2.5 detik setelah struk pembayaran dikirim.</p>
                      </div>
                      <label className="relative inline-flex inline-flex shrink-0 items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.waPostTreatmentEducationEnabled}
                          onChange={(e) => setFormData({ ...formData, waPostTreatmentEducationEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Pengingat Janji Temu H-1 Hari</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kirim pesan WhatsApp otomatis kepada pasien H-1 hari sebelum waktu kunjungan terjadwal.</p>
                      </div>
                      <label className="relative inline-flex inline-flex shrink-0 items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.waReminderH1DayEnabled}
                          onChange={(e) => setFormData({ ...formData, waReminderH1DayEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Pengingat Janji Temu H-1 Jam</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kirim pengingat WhatsApp otomatis kepada pasien 1 jam sebelum janji temu berlangsung.</p>
                      </div>
                      <label className="relative inline-flex inline-flex shrink-0 items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.waReminderH1HourEnabled}
                          onChange={(e) => setFormData({ ...formData, waReminderH1HourEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Test Send Section */}
                  <div className="p-5 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/20">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">Uji Coba Pengiriman Pesan</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Gunakan fitur ini untuk mengetes koneksi gateway Whapi.cloud dengan mengirimkan pesan uji coba ke nomor Anda.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Contoh: 628123456789"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="glass-input flex-1 px-4 py-2 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleTestWA}
                        disabled={testingWA}
                        className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                      >
                        {testingWA ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Kirim Test WA
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Treatment Education Tab */}
            {activeTab === 'treatment-education' && (
              <div>
                <TreatmentEducationTemplates />
              </div>
            )}

            {/* SOAP Templates Tab */}
            {activeTab === 'soap-templates' && (
              <div>
                <SoapTemplates />
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Keamanan</h2>
                <div className="space-y-6">
                  <div className="p-5 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl relative">
                    <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">Segera Hadir</span>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4 opacity-70">
                      Tingkatkan keamanan akun dengan autentikasi dua faktor
                    </p>
                    <button disabled className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm cursor-not-allowed">
                      Aktifkan 2FA (Nonaktif)
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ganti Password</h3>
                    <div className="space-y-4">
                      <input
                        type="password"
                        placeholder="Password saat ini"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                        disabled={updatingPassword}
                      />
                      <input
                        type="password"
                        placeholder="Password baru"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                        disabled={updatingPassword}
                      />
                      <input
                        type="password"
                        placeholder="Konfirmasi password baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="glass-input w-full px-4 py-2.5 rounded-xl"
                        disabled={updatingPassword}
                      />
                      <button
                        onClick={handleUpdatePassword}
                        disabled={updatingPassword}
                        className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 animate-pulse-slow"
                      >
                        {updatingPassword ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">Segera Hadir</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Session Management</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 opacity-70">
                      Kelola sesi login aktif Anda
                    </p>
                    <button disabled className="px-5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-semibold text-gray-450 dark:text-gray-500 cursor-not-allowed">
                      Lihat Sesi Aktif (Nonaktif)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit-logs' && (
              <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      <Shield className="text-amber-500" size={24} />
                      Log Audit Keamanan
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Daftar aktivitas penting dalam sistem untuk keamanan dan kepatuhan medis.</p>
                  </div>
                  <button 
                    onClick={fetchAuditLogs}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors"
                    disabled={loadingAudit}
                  >
                    Segarkan
                  </button>
                </div>

                {loadingAudit ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                    <p className="text-sm text-gray-400 font-medium">Belum ada catatan log audit yang tersedia</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase">
                          <th className="py-3 px-4">Waktu</th>
                          <th className="py-3 px-4">Modul</th>
                          <th className="py-3 px-4">Aktivitas</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Tingkat Risiko</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-sm">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                            <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                              {new Date(log.timestamp).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 capitalize">
                              {log.module}
                            </td>
                            <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                              <span className="font-bold text-xs uppercase bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 mr-2">
                                {log.action}
                              </span>
                              {log.visit_id ? 'Detail rekam medis diakses' : log.patient_id ? 'Profil pasien diakses' : 'Aktivitas sistem'}
                            </td>
                             <td className="py-3 px-4 text-xs font-semibold text-gray-500 capitalize">
                              {log.user_role}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                log.risk_level === 'CRITICAL' || log.risk_level === 'HIGH'
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                  : log.risk_level === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                              }`}>
                                {log.risk_level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Database Tab */}
            {activeTab === 'database' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex justify-between items-center">
                  <span>Database & Backup</span>
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-500 rounded-xl border border-amber-500/30">Hubungi Administrator</span>
                </h2>
                <div className="space-y-6">
                  <div className="relative p-5 bg-gray-50/50 dark:bg-gray-800/10 border border-gray-200 dark:border-gray-800/50 rounded-xl">
                    <span className="absolute top-0 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded">Belum Terverifikasi</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Automatic Backup</h3>
                    {/* Mengubah teks misleading yang tadinya menampilkan status "Success" palsu karena tidak terhubung dengan API backup Supabase */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Backup dikelola oleh provider database (Supabase). Status backup terverifikasi belum tersedia di dashboard ini — hubungi administrator sistem untuk info backup terakhir.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded">Dalam Pengembangan</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Manual Backup</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 opacity-70">
                      Buat backup manual dari database saat ini
                    </p>
                    <button disabled className="px-5 py-2.5 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-not-allowed">
                      <Database size={18} />
                      Buat Backup Sekarang (Nonaktif)
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded">Dalam Pengembangan</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Restore Database</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 opacity-70">
                      Pulihkan database dari backup sebelumnya
                    </p>
                    <button disabled className="px-5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-semibold text-gray-400 dark:text-gray-500 cursor-not-allowed">
                      Pilih File Backup (Nonaktif)
                    </button>
                  </div>

                  <div className="p-5 bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl mt-8 relative">
                    <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded">Khusus Superadmin</span>
                    <h3 className="font-semibold text-rose-900 dark:text-rose-400 mb-2 flex items-center gap-2">⚠️ Danger Zone</h3>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mb-4 opacity-70">
                      Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan
                    </p>
                    <button disabled className="px-5 py-2.5 bg-gray-305 dark:bg-gray-705 text-gray-500 dark:text-gray-450 rounded-xl text-sm font-semibold cursor-not-allowed">
                      Reset Semua Data (Dilindungi)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            {activeTab !== 'security' && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 items-center">
                {saved && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mr-2 bg-green-50 dark:bg-green-500/10 px-3 py-1.5 rounded-lg">
                    <Check size={18} />
                    <span className="font-semibold text-sm">Tersimpan</span>
                  </div>
                )}
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-accent-secondary)] transition-colors flex items-center gap-2 shadow-lg shadow-[var(--color-accent)]/20"
                >
                  <Save size={18} />
                  Simpan Perubahan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
