"""Menyusun artikel G7; membaca sumber lokal, menulis hanya di direktori G7."""
from pathlib import Path
import hashlib
import json
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
BASE = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
C = 'apps/clinic/src/components/'
ARTICLES = []

def ref(component, anchor):
    return (C + component + '.jsx', anchor)

def step(text, *refs):
    return {'teks': text, 'sumber': refs}

def article(slug, title, roles, keywords, intro, steps, safety, related, note=''):
    ARTICLES.append(dict(slug=slug, judul=title, peran=roles.split(','),
                         kata_kunci=keywords.split(','), pembuka=intro, langkah=steps,
                         keamanan=safety, terkait=related.split(','), catatan=note))

ALL = 'admin,dokter,resepsionis'
NAV = lambda text: ref('common/Sidebar', "label: '" + text + "'")
SET = lambda anchor: ref('settings/SettingsPage', anchor)
RM = lambda anchor: ref('medical-record/MedicalRecordForm', anchor)
PAY = lambda anchor: ref('payment/PaymentForm', anchor)
AG = lambda anchor: ref('ai/AgentActions', anchor)

article('mulai-cepat-klinik-baru', 'Mulai cepat untuk klinik baru', 'admin',
        'onboarding,klinik baru,profil klinik,tarif,staf,resepsionis',
        'Mulai setelah akun admin dan akses klinik Anda aktif. Siapkan profil, tarif, staf, lalu jadwal praktik. Panduan ini tidak menggantikan aktivasi klinik oleh tim Dentiva.', [
    step('Buka **Dashboard**. Jika kartu **Siapkan klinik Anda** muncul, gunakan daftar tugasnya sebagai pintasan. Bila kartu sudah disembunyikan, buka tujuan yang sama melalui menu.', NAV('Dashboard'), ref('dashboard/OnboardingChecklist', 'Siapkan klinik Anda')),
    step('Buka **Pengaturan → Profil Klinik**. Lengkapi nama, alamat, dan telepon klinik, lalu pilih **Simpan Perubahan**. Periksa pesan **Tersimpan**.', NAV('Pengaturan'), SET('Nama Klinik'), SET('Simpan Perubahan')),
    step('Buka **Master Treatment → Tambah Treatment**. Isi kode, nama, kategori, dan harga dasar yang disetujui klinik, lalu **Simpan**. Periksa daftar sebelum menambah tarif lain.', NAV('Master Treatment'), ref('treatments/TreatmentMaster', 'Tambah Treatment'), ref('treatments/TreatmentMaster', "'Update' : 'Simpan'")),
    step('Buka **Kelola Pengguna → Tambah Staf** untuk membuat akun resepsionis. Isi formulir dan sandi awal secara privat, lalu **Simpan Staf**. Formulir saat ini hanya menawarkan peran resepsionis; untuk akun dokter, hubungi admin klinik yang mengoordinasikan penyediaan akun dengan tim Dentiva.', NAV('Kelola Pengguna'), ref('admin/UserManagementPage', 'setShowAddModal(true)'), ref('admin/UserManagementPage', '<option value="resepsionis">'), ref('admin/UserManagementPage', "'Simpan Staf'")),
    step('Setelah akun dokter tersedia, buka **Jadwal Dokter → Tambah Jadwal**. Pilih dokter, hari, jam mulai dan selesai, lalu simpan. Ikuti artikel jadwal praktik untuk rinciannya.', NAV('Jadwal Dokter'), ref('schedule/DoctorSchedulePage', 'Tambah Jadwal Praktek')),
    step('Minta resepsionis dan dokter masuk dengan akun masing-masing. Cocokkan peran di **Menu profil pengguna** dan menu yang tersedia sebelum mulai bekerja.', ref('layout/TopBar', 'Menu profil pengguna'), ref('common/Sidebar', 'resepsionis: [')),
], ['Gunakan satu akun per orang. Sandi awal tidak boleh dimasukkan ke laporan, tangkapan layar, atau chat tim.',
    'Label “Undang dokter” pada checklist belum berarti undangan email dapat digunakan. SMTP/email reset sandi belum aktif; hubungi admin klinik bila akses belum tersedia.',
    'Jangan memasukkan pasien nyata untuk mencoba aplikasi. Latihan memakai data sintetis di lingkungan uji yang disediakan pengelola.'],
    'masuk-dan-keluar,sandi-dan-mfa,jadwal-praktik-dokter',
    'Checklist aplikasi memuat enam item, termasuk SATUSEHAT yang ditandai opsional. Ini status checklist perangkat lunak, bukan penetapan kewajiban hukum atau bukti integrasi produksi.')

article('masuk-dan-keluar', 'Masuk dan keluar dengan akun pribadi', ALL,
        'login,logout,akun,email,password,ponsel',
        'Gunakan alamat aplikasi yang diberikan admin klinik. Kasir memakai akun dengan peran resepsionis.', [
    step('Pada halaman masuk, isi **Email** dan **Password** akun Anda sendiri. Gunakan tombol bergambar mata hanya bila layar tidak terlihat orang lain.', ref('auth/LoginPage', "register('email')"), ref('auth/LoginPage', "register('password')"), ref('auth/LoginPage', 'Tampilkan password')),
    step('Pilih **Masuk ke Sistem**. Tunggu dashboard terbuka; bila muncul galat, periksa email dan sandi sebelum mencoba lagi.', ref('auth/LoginPage', 'Masuk ke Sistem'), ref('auth/LoginPage', 'GENERIC_LOGIN_ERROR')),
    step('Buka **Menu profil pengguna** untuk memeriksa nama dan peran. Di ponsel, gunakan **Buka menu navigasi** untuk melihat menu kerja Anda.', ref('layout/TopBar', 'Menu profil pengguna'), ref('layout/TopBar', 'Buka menu navigasi')),
    step('Setelah selesai, buka **Menu profil pengguna → Keluar**. Pastikan halaman masuk tampil sebelum perangkat dipakai orang lain.', ref('layout/TopBar', 'handleLogout'), ref('layout/TopBar', '<LogOut size={16} /> Keluar')),
], ['Jangan memakai akun dokter untuk kasir atau meminjam akun admin.',
    'Jangan mengirim sandi, kode autentikator, atau rekaman layar formulir masuk kepada siapa pun.'],
    'sandi-dan-mfa,privasi-dan-backup,faq-pemecahan-masalah')

article('sandi-dan-mfa', 'Mengganti sandi, lupa sandi, dan status MFA', ALL,
        'password,sandi,lupa password,reset email,MFA,2FA,TOTP,autentikator',
        'Penggantian sandi tersedia ketika Anda masih bisa masuk. SMTP/email reset sandi belum aktif. Aktivasi MFA mandiri pada layar klinik juga belum tersedia pada versi yang ditinjau.', [
    step('Jika masih bisa masuk, buka **Menu profil pengguna → Pengaturan → Keamanan**.', ref('layout/TopBar', "navigate('/pengaturan')"), SET("label: 'Keamanan'")),
    step('Isi **Password saat ini**, **Password baru**, dan **Konfirmasi password baru**. Gunakan sandi panjang dan unik; ikuti penolakan atau persyaratan server bila muncul.', SET('placeholder="Password saat ini"'), SET('placeholder="Password baru"'), SET('placeholder="Konfirmasi password baru"')),
    step('Pilih **Update Password** dan tunggu pesan **Password berhasil diganti!**. Bila gagal, jangan menganggap sandi sudah berubah.', SET("'Update Password'"), SET("toast.success('Password berhasil diganti!')")),
    step('Untuk MFA, periksa bagian keamanan: tombol **Aktifkan 2FA (Nonaktif)** belum bisa digunakan. Hubungi admin klinik untuk status penerapan MFA; jangan mencari QR atau kode pemulihan di layar ini.', SET('Aktifkan 2FA (Nonaktif)')),
    step('Jika lupa sandi atau tidak bisa masuk, hubungi admin klinik melalui kanal internal yang sudah dikenal. Tombol **Lupa password?** memang ada, tetapi pesan “tautan dikirim” belum membuktikan email diterima selama SMTP belum aktif.', ref('auth/LoginPage', 'Lupa password?'), ref('auth/LoginPage', "resetState === 'sent'")),
], ['Admin klinik mengoordinasikan pemulihan dengan pengelola Dentiva bila diperlukan; tidak ada tombol reset staf yang dijanjikan di sini.',
    'Dukungan tidak memerlukan sandi lama, QR MFA, maupun kode sekali pakai Anda. Jangan menonaktifkan perlindungan perangkat sebagai jalan pintas.'],
    'masuk-dan-keluar,faq-pemecahan-masalah',
    'Keberadaan layanan MFA di server tidak berarti MFA sudah dipaksa atau tersedia sebagai alur aktivasi pada aplikasi klinik. Console adalah aplikasi internal yang berbeda.')

article('mendaftarkan-pasien-baru', 'Mendaftarkan pasien baru', 'resepsionis',
        'pendaftaran,pasien baru,identitas,NIK,WhatsApp,kasir',
        'Cari pasien terlebih dahulu untuk menghindari data ganda. Artikel ini menjelaskan pencatatan administrasi oleh resepsionis.', [
    step('Buka **Data Pasien** dan cari nama atau nomor rekam medis. Jika pasien sudah ada, gunakan artikel kunjungan pasien lama.', NAV('Data Pasien'), ref('patient/PatientList', 'Cari nama, No. RM, No. WA, atau alamat...')),
    step('Buka **Daftar Pasien**, lalu pilih **Pasien Baru**. Pada **Identitas & Jaminan**, isi nama, jenis kelamin, nomor WhatsApp, dan identitas yang sesuai. Pilihan identitas meliputi NIK, NIK ibu untuk bayi, paspor, atau lainnya; jangan mengarang NIK.', NAV('Daftar Pasien'), ref('patient/PatientRegistration', 'Pasien Baru'), ref('patient/PatientRegistration', "title: 'Identitas & Jaminan'"), ref('patient/PatientRegistration', 'NIK Ibu Kandung (Bayi Baru Lahir)')),
    step('Catat persetujuan notifikasi WhatsApp sesuai jawaban pasien. Pilih **Lanjutkan →**, lalu lengkapi **Alamat Domisili** dengan memilih wilayah berurutan dan mengisi alamat detail.', ref('patient/PatientRegistration', 'wa_consent'), ref('patient/PatientRegistration', 'Lanjutkan →'), ref('patient/PatientRegistration', "title: 'Alamat Domisili'")),
    step('Pilih **Daftar Pasien** bila hanya mendaftarkan, atau **Daftar & Jadwalkan** bila akan membuat kunjungan pertama. Tunggu dialog berhasil yang menampilkan nomor rekam medis.', ref('patient/PatientRegistration', "'Mendaftar...' : 'Daftar Pasien'"), ref('patient/PatientRegistration', 'Daftar & Jadwalkan'), ref('patient/PatientRegistration', 'setSuccessModalData({')),
    step('Jika memilih penjadwalan, tekan **Lanjut ke Penjadwalan →**, isi tanggal, jam, dokter, serta keluhan kunjungan, lalu **Simpan Jadwal**. Konfirmasi hasil sebelum menutup dialog.', ref('patient/PatientRegistration', 'Lanjut ke Penjadwalan →'), ref('patient/PatientRegistration', 'Jadwal Kunjungan Pertama'), ref('patient/PatientRegistration', '<Save size={18} /> Simpan Jadwal')),
], ['Cocokkan identitas dengan pasien melalui prosedur klinik; jangan membacakan NIK di ruang tunggu.',
    'Pendaftaran dan penjadwalan adalah proses terpisah. Bila jadwal gagal setelah pasien berhasil dibuat, cari pasien yang sudah tercatat sebelum mencoba lagi.'],
    'mencari-memperbarui-pasien,kunjungan-pasien-lama,booking-online')

article('mencari-memperbarui-pasien', 'Mencari pasien dan memperbarui biodata', 'dokter,resepsionis',
        'pencarian,pasien,biodata,alamat,nomor RM,ubah pasien',
        'Dokter dan resepsionis dapat membuka daftar sesuai izin. Penyuntingan biodata dalam panduan ini dilakukan resepsionis; admin bisnis tidak memiliki menu data pasien.', [
    step('Buka **Data Pasien**. Ketik nama, nomor RM, nomor WA, atau alamat pada kolom pencarian, lalu tunggu hasilnya.', NAV('Data Pasien'), ref('patient/PatientList', 'Cari nama, No. RM, No. WA, atau alamat...')),
    step('Jika belum ditemukan, periksa **Semua Gender**, **Semua Status**, serta halaman daftar. Gunakan pemilih jumlah pasien per halaman bila diperlukan.', ref('patient/PatientList', 'Semua Gender'), ref('patient/PatientList', 'Semua Status'), ref('patient/PatientList', 'Jumlah pasien per halaman')),
    step('Cocokkan setidaknya dua pengenal, misalnya nama dan nomor RM, kemudian pilih ikon **Lihat Detail**. Hindari memilih pasien hanya berdasarkan nama yang mirip.', ref('patient/PatientList', 'title="Lihat Detail"'), ref('patient/PatientDetail', 'no_rm')),
    step('Sebagai resepsionis, pilih **Edit Data** pada detail pasien, perbaiki biodata yang telah dikonfirmasi, lalu **Simpan**. Gunakan **Batal** bila perubahan belum tepat. Dokter yang perlu koreksi biodata dapat meminta bantuan resepsionis.', ref('patient/PatientDetail', "role === 'resepsionis'"), ref('patient/PatientDetail', 'setEditing(true)'), ref('patient/PatientDetail', 'onClick={handleSave}'), ref('patient/PatientDetail', 'onClick={handleCancel}')),
    step('Periksa kembali data setelah penyimpanan berhasil. Bila muncul galat, baca pesannya dan jangan membuat pasien baru untuk menggantikan biodata yang gagal diubah.', ref('patient/PatientDetail', 'patientService.updatePatient(patientId, dataToUpdate)'), ref('patient/PatientDetail', 'setEditing(false)')),
], ['Tutup detail pasien sebelum meninggalkan meja; jangan memotret daftar pasien untuk dibagikan ke grup umum.',
    'Pencarian tanpa hasil bukan bukti bahwa pasien tidak ada. Periksa filter dan ejaan terlebih dahulu.'],
    'mendaftarkan-pasien-baru,kunjungan-pasien-lama,privasi-dan-backup')

article('kunjungan-pasien-lama', 'Membuat janji untuk pasien lama', 'resepsionis',
        'jadwal,janji temu,pasien lama,kunjungan ulang,dokter',
        'Gunakan pasien yang sudah tercatat. Menu Jadwal menampilkan kunjungan, sedangkan alur pembuatan janji resepsionis tersedia melalui Daftar Pasien atau detail pasien.', [
    step('Buka **Daftar Pasien → Pasien Lama**.', NAV('Daftar Pasien'), ref('patient/PatientRegistration', 'Pasien Lama')),
    step('Cari nama, nomor RM, atau nomor WhatsApp. Ketik setidaknya dua karakter, pilih hasil yang benar, dan cocokkan identitasnya.', ref('patient/PatientRegistration', 'Masukkan Nama, No. RM, atau No. WhatsApp...'), ref('patient/PatientRegistration', 'debouncedOldTerm.trim().length < 2')),
    step('Pada **Jadwal Kunjungan Baru**, pilih dokter, tanggal, jam, dan isi keluhan atau alasan kunjungan. Cocokkan waktu dengan jadwal praktik klinik.', ref('patient/PatientRegistration', 'Jadwal Kunjungan Baru'), ref('patient/ScheduleVisitForm', 'Pilih Dokter'), ref('patient/PatientRegistration', 'Harap lengkapi tanggal, jam, dan dokter')),
    step('Pilih **Jadwalkan Kunjungan** dan tunggu dialog keberhasilan. Bila gagal, periksa pesan dan jadwal yang sudah ada sebelum mengirim ulang.', ref('patient/PatientRegistration', 'Jadwalkan Kunjungan'), ref('patient/PatientRegistration', 'setScheduleSuccessModalData({')),
    step('Buka **Jadwal**, pilih tanggal yang sesuai, lalu periksa pasien dan dokter pada kunjungan berstatus **Terjadwal**.', NAV('Jadwal'), ref('schedule/SchedulePage', 'Pilih tanggal kunjungan'), ref('schedule/SchedulePage', "scheduled: 'Terjadwal'")),
], ['Jangan membuat data pasien baru untuk kunjungan ulang.',
    'Alternatif: dari detail pasien pilih “Jadwalkan Kunjungan Ulang”, lalu “Simpan Jadwal”. Jangan menjanjikan bahwa pesan WhatsApp otomatis terkirim hanya karena jadwal tersimpan.'],
    'mencari-memperbarui-pasien,jadwal-praktik-dokter,booking-online')

article('jadwal-praktik-dokter', 'Mengatur jadwal praktik dokter', 'admin',
        'jadwal dokter,praktik,hari,jam,kapasitas,slot',
        'Jadwal praktik menentukan hari dan rentang waktu dokter bekerja. Ini berbeda dari janji kunjungan pasien.', [
    step('Buka **Jadwal Dokter**. Periksa daftar atau filter **Semua Dokter** sebelum menambahkan jadwal.', NAV('Jadwal Dokter'), ref('schedule/DoctorSchedulePage', 'Semua Dokter')),
    step('Pilih **Tambah Jadwal**, kemudian pilih dokter dan hari praktik.', ref('schedule/DoctorSchedulePage', '<Plus size={14} /> Tambah Jadwal'), ref('schedule/DoctorSchedulePage', 'value={formData.dokter_id}'), ref('schedule/DoctorSchedulePage', 'value={formData.hari}')),
    step('Isi **Jam Mulai** dan **Jam Selesai**. Jam mulai harus lebih awal; satu dokter tidak dapat memiliki dua entri hari yang sama melalui formulir ini.', ref('schedule/DoctorSchedulePage', 'Jam Mulai'), ref('schedule/DoctorSchedulePage', 'Jam mulai harus lebih awal'), ref('schedule/DoctorSchedulePage', 'Dokter ini sudah memiliki jadwal')),
    step('Isi **Jumlah Pasien per Hari** bila klinik memakai kapasitas tertentu, lalu periksa pratinjau slot. Bila kosong, aplikasi menampilkan interval bawaan 30 menit.', ref('schedule/DoctorSchedulePage', 'Jumlah Pasien per Hari'), ref('schedule/DoctorSchedulePage', 'Interval default 30 menit per slot')),
    step('Pilih **Tambah Jadwal** untuk menyimpan entri baru. Untuk perubahan berikutnya, gunakan ikon **Edit** dan **Simpan Perubahan**; ikon **Nonaktifkan** dapat menghentikan penggunaan jadwal sesuai kebutuhan.', ref('schedule/DoctorSchedulePage', "editTarget ? 'Simpan Perubahan' : 'Tambah Jadwal'"), ref('schedule/DoctorSchedulePage', "'Nonaktifkan' : 'Aktifkan'")),
], ['Koordinasikan perubahan jadwal dengan dokter dan resepsionis. Mengubah jadwal praktik tidak membuktikan janji pasien yang sudah ada ikut dijadwal ulang.',
    'Jangan menghapus jadwal hanya untuk mengatasi galat tanpa memeriksa kunjungan yang terdampak.'],
    'mulai-cepat-klinik-baru,kunjungan-pasien-lama,booking-online')

article('booking-online', 'Menangani permintaan booking online', 'resepsionis',
        'booking online,konfirmasi,tolak,WhatsApp,janji',
        'Booking adalah permintaan waktu dari pasien. Konfirmasi di daftar booking belum membuat data pasien maupun kunjungan secara otomatis.', [
    step('Buka **Booking Online**, lalu pilih status **Menunggu**. Gunakan tombol **Muat ulang** bila perlu mengambil daftar terbaru.', NAV('Booking Online'), ref('schedule/BookingRequests', "pending: { label: 'Menunggu'"), ref('schedule/BookingRequests', 'aria-label="Muat ulang"')),
    step('Periksa kode booking, nama, nomor kontak, dokter, tanggal, dan jam. Cocokkan dengan daftar **Jadwal** sebelum menerima permintaan.', ref('schedule/BookingRequests', 'r.reference_code'), ref('schedule/BookingRequests', 'r.requested_time.slice'), NAV('Jadwal')),
    step('Pilih **Konfirmasi** bila tersedia, atau **Tolak** bila permintaan tidak dapat diterima. Jika menolak, isi alasan internal bila diperlukan, lalu tunggu hasil pembaruan status.', ref('schedule/BookingRequests', "setRowStatus(r, 'confirmed')"), ref('schedule/BookingRequests', "setRowStatus(r, 'rejected')"), ref('schedule/BookingRequests', 'Alasan penolakan (opsional')),
    step('Gunakan **Kabari via WA**, periksa tujuan dan isi pesan di WhatsApp, lalu kirim melalui WhatsApp. Membuka tautan tidak berarti pesan sudah terkirim.', ref('schedule/BookingRequests', 'Kabari via WA'), ref('schedule/BookingRequests', 'https://wa.me/')),
    step('Untuk booking yang dikonfirmasi, gunakan **Daftarkan pasien**. Cari apakah pasien sudah tercatat; pilih alur pasien lama bila sudah ada. Jika pasien baru, lengkapi pendaftaran. Tetapkan kembali dokter, tanggal, dan jam booking saat membuat jadwal, kemudian periksa kunjungannya.', ref('schedule/BookingRequests', 'Daftarkan pasien'), ref('schedule/BookingRequests', 'fromBooking: { nama:'), ref('patient/PatientRegistration', 'Pasien Lama'), ref('patient/PatientRegistration', 'scheduleData')),
], ['Pintasan booking hanya mengisi awal nama dan nomor WA, bukan seluruh rincian kunjungan.',
    'Jangan menyertakan diagnosis atau informasi tambahan yang tidak diperlukan dalam pesan konfirmasi.'],
    'kunjungan-pasien-lama,mendaftarkan-pasien-baru,layanan-dokter')

article('layanan-dokter', 'Melihat antrean dan memperbarui status layanan', 'dokter',
        'jadwal hari ini,antrean,mulai,selesai,batalkan,kunjungan',
        'Status kunjungan membantu tim mengetahui proses pelayanan. Status pembayaran dikelola terpisah oleh resepsionis.', [
    step('Buka **Jadwal Hari Ini**. Pilih tanggal dan filter status yang diperlukan.', NAV('Jadwal Hari Ini'), ref('schedule/SchedulePage', 'Pilih tanggal kunjungan'), ref('schedule/SchedulePage', 'Filter status kunjungan')),
    step('Periksa identitas pasien dan kunjungannya. Gunakan **Profil** atau tombol **Rekam Medis** pada kartu bila perlu meninjau data sebelum melayani.', ref('schedule/SchedulePage', 'navigate(`/pasien/${visit.patient_id}`)'), ref('schedule/SchedulePage', 'navigate(`/rekam-medis/${visit.patient_id}`)')),
    step('Untuk kunjungan **Terjadwal**, pilih **Mulai** ketika pelayanan benar-benar dimulai. Tunggu status berubah menjadi **Berlangsung**.', ref('schedule/SchedulePage', "handleUpdateStatus(visit.id, 'ongoing')"), ref('schedule/SchedulePage', "ongoing:   'Berlangsung'")),
    step('Isi dan simpan rekam medis sesuai pemeriksaan. Setelah pelayanan serta pencatatan selesai, periksa status; **Simpan Rekam Medis** juga mengirim status selesai pada kunjungan yang disimpan. Jika masih **Berlangsung**, gunakan **Selesai** pada kartu.', RM('Simpan Rekam Medis'), RM("status: 'completed'"), ref('schedule/SchedulePage', "handleUpdateStatus(visit.id, 'completed')")),
    step('Jika kunjungan memang dibatalkan, gunakan **Batalkan** pada kunjungan yang masih Terjadwal atau Berlangsung. Pastikan status menjadi **Dibatalkan**; jangan memakai pembatalan untuk menghapus jejak pelayanan yang sudah terjadi.', ref('schedule/SchedulePage', "handleUpdateStatus(visit.id, 'cancelled')"), ref('schedule/SchedulePage', "cancelled: 'Dibatalkan'")),
], ['Jangan menandai layanan selesai hanya agar kasir dapat membuat tagihan.',
    'Selesai bukan berarti lunas. Jika server menolak perubahan status, ikuti alur peran yang sah dan hubungi admin klinik.'],
    'mengisi-rekam-medis,odontogram-dan-diagnosis,pembayaran-kunjungan')

article('mengisi-rekam-medis', 'Mengisi dan menyimpan rekam medis', 'dokter',
        'rekam medis,RME,SOAP,keluhan,diagnosa,terapi,draf',
        'Gunakan akun dokter dan pastikan pasien serta tanggal kunjungan benar. Simpan secara sadar: draf sementara bukan bukti catatan sudah tercatat di server.', [
    step('Buka **Data Pasien**, cari pasien, lalu pilih ikon **Rekam Medis**. Cocokkan nama dan nomor RM pada halaman yang terbuka.', NAV('Data Pasien'), ref('patient/PatientList', 'title="Rekam Medis"'), RM('patient.no_rm')),
    step('Isi riwayat penyakit dan **Keluhan Utama**, kemudian lengkapi hasil pemeriksaan pada bagian yang sesuai. Tandai alergi hanya berdasarkan informasi yang sudah dikonfirmasi.', RM('Riwayat Penyakit Medis'), RM("errors.chief_complaint = 'Keluhan Utama wajib diisi'"), RM("key:'alergi'")),
    step('Pada **Histori Kunjungan & SOAP**, pilih kunjungan yang benar. Gunakan **Tambah Kunjungan** hanya jika memang perlu entri baru. Isi tanggal, **Keluhan (S)**, **Diagnosa (A)**, dan **Terapi/Tindakan (P)**; pilih kode ICD-10 bila sesuai.', RM('Histori Kunjungan & SOAP'), RM('Tambah Kunjungan'), RM('Keluhan (S)'), RM('Diagnosa (A)'), RM('Terapi/Tindakan (P)'), RM('<ICD10Picker')),
    step('Jika memakai **Template SOAP**, periksa dialog penggantian isi dan tinjau ulang hasilnya. Template menimpa isi SOAP terkait; sesuaikan dengan pemeriksaan pasien.', RM('Ganti isi SOAP dengan template'), RM('Gunakan Template SOAP:')),
    step('Pilih **Simpan Rekam Medis**. Tunggu pesan **Berhasil disimpan!**; jika pesan menyebut sebagian data gagal, catatan belum dapat dianggap tersimpan seluruhnya. Periksa kembali sebelum mencoba menyimpan ulang.', RM('Simpan Rekam Medis'), RM("toast.success('Berhasil disimpan!')"), RM('Sebagian data medis gagal disimpan')),
    step('Bila banner draf muncul saat membuka kembali halaman, pilih **Pulihkan Draf** hanya setelah memastikan pasien dan isinya benar, lalu simpan ke server. Pilih **Abaikan** bila draf tidak tepat.', RM('Draf rekam medis yang belum disimpan ditemukan!'), RM('Pulihkan Draf'), RM("toast.info('Draf diabaikan')")),
], ['Penyimpanan rekam medis mengirim status kunjungan selesai; pastikan pelayanan dan pencatatan memang siap sebelum menekan simpan.',
    'Draf memakai penyimpanan sesi browser, bukan backup atau mode kerja offline. Jangan mengandalkannya setelah menutup sesi/perangkat.',
    'Catatan terkunci atau tindakan yang sudah dibayar dapat membatasi penyuntingan. Jangan membuat entri ganda untuk melewati penguncian.'],
    'odontogram-dan-diagnosis,resep-dan-persetujuan,layanan-dokter')

article('odontogram-dan-diagnosis', 'Mencatat odontogram dan diagnosis', 'dokter',
        'odontogram,gigi,permukaan,simbol,diagnosis,ICD-10,tindakan',
        'Odontogram mencatat temuan pemeriksaan. Pemilihan simbol dan diagnosis tetap menjadi tanggung jawab dokter.', [
    step('Buka rekam medis pasien yang benar, lalu gulir ke bagian odontogram. Pilih **Bantuan Simbol** bila perlu melihat legenda.', ref('patient/PatientDetail', 'Buka Rekam Medis'), RM('Bantuan Simbol')),
    step('Klik gigi atau permukaan yang diperiksa, lalu pilih kode simbol pada panel. Untuk kode yang memerlukan permukaan, pilih permukaan spesifik; ikuti pesan aplikasi bila pilihan tidak sesuai.', ref('medical-record/odontogram/Odontogram', 'handleToothClick'), ref('medical-record/odontogram/Odontogram', 'handleSurfaceClick'), ref('medical-record/odontogram/Odontogram', 'Pilih permukaan gigi spesifik')),
    step('Periksa nomor gigi dan hasil tanda sebelum melanjutkan. Jika memakai simbol bridge, pilih gigi akhir pada baris yang sama sesuai petunjuk **Mode Bridge**.', ref('medical-record/odontogram/Odontogram', 'Gigi tidak berada dalam baris yang sama'), ref('medical-record/odontogram/Odontogram', 'Mode Bridge: Pilih gigi akhir')),
    step('Pada bagian diagnosis dan tindakan, cari kode/nama diagnosis serta tindakan yang benar, lalu pilih hasilnya. Catatan diagnosis bebas dan kode ICD-10 pada SOAP juga perlu diperiksa sesuai kunjungan.', ref('medical-record/DiagnosisTreatment', 'Cari kode / nama diagnosis...'), ref('medical-record/DiagnosisTreatment', 'Cari nama tindakan/perawatan...'), RM('<ICD10Picker')),
    step('Lengkapi bidang rekam medis yang wajib, kemudian **Simpan Rekam Medis**. Periksa hasil penyimpanan; perubahan gambar sebelum simpan belum menjadi bukti perubahan di server.', RM('Harap lengkapi semua bidang wajib'), RM('Simpan Rekam Medis')),
], ['Hindari “Reset Semua Gigi” untuk memperbaiki satu tanda; periksa lingkup perubahan sebelum menghapus.',
    'Jika tindakan terkunci karena invoice atau pembayaran, koordinasikan dengan resepsionis. Jangan mengubah diagnosis untuk menyesuaikan tagihan.'],
    'mengisi-rekam-medis,resep-dan-persetujuan')

article('resep-dan-persetujuan', 'Menambahkan resep dan persetujuan tindakan', 'dokter',
        'resep,obat,dosis,frekuensi,consent,persetujuan,tanda tangan',
        'Resep dan persetujuan terhubung dengan kunjungan. Artikel ini menjelaskan penggunaan layar, bukan rekomendasi obat atau pengganti penjelasan tindakan kepada pasien.', [
    step('Buka rekam medis dan pilih kunjungan yang benar pada **Histori Kunjungan & SOAP**. Pastikan kunjungan tidak terkunci sebelum mengubah isinya.', RM('Histori Kunjungan & SOAP'), RM('disabled={visit.is_locked || saving}')),
    step('Di bagian resep, cari obat pada **Cari nama obat...**, pilih obat yang benar, lalu isi dosis, frekuensi, dan jumlah sesuai keputusan dokter. Tinjau alergi; ketiadaan peringatan aplikasi tidak membuktikan obat aman.', ref('medical-record/PrescriptionEntry', 'Cari nama obat...'), ref('medical-record/PrescriptionEntry', 'setDosis(obat.dosis_default'), ref('medical-record/PrescriptionEntry', 'checkForAllergy(obat.nama_obat)')),
    step('Pilih tombol tambah pada baris obat dan periksa daftar resep. Pilih **Simpan Rekam Medis** untuk menyimpan perubahan. Setelah kunjungan tersimpan dan memuat resep, gunakan **Cetak Resep**.', ref('medical-record/PrescriptionEntry', 'onClick={handleAdd}'), RM('Simpan Rekam Medis'), RM('Cetak Resep')),
    step('Untuk kunjungan yang sudah tersimpan dan belum terkunci, pilih **Informed Consent**. Isi judul serta jenis tindakan, jelaskan tindakan melalui prosedur klinik, lalu minta pasien menandatangani kotak yang disediakan.', RM('Informed Consent'), ref('medical-record/ConsentFormModal', 'value={title}'), ref('medical-record/ConsentFormModal', 'value={treatmentType}'), ref('medical-record/ConsentFormModal', 'Gunakan mouse atau jari')),
    step('Pilih **Simpan Persetujuan**, tunggu konfirmasi berhasil, lalu periksa entri pada daftar **Informed Consents**. Klik entri tindakan tersebut bila perlu menghasilkan PDF.', ref('medical-record/ConsentFormModal', 'Simpan Persetujuan'), ref('medical-record/ConsentFormModal', 'Informed consent berhasil disimpan'), RM('Informed Consents'), RM('generateConsentPdf(c,')),
], ['Jangan membubuhkan tanda tangan atas nama pasien. Jika pasien tidak dapat menandatangani, ikuti prosedur klinik dan hubungi penanggung jawab.',
    'Amankan hasil cetak/PDF dan berikan hanya kepada penerima yang terverifikasi. Penyimpanan tanda tangan di aplikasi bukan klaim sertifikasi tanda tangan elektronik.'],
    'mengisi-rekam-medis,odontogram-dan-diagnosis,privasi-dan-backup')

article('pembayaran-kunjungan', 'Mencatat pembayaran kunjungan', 'resepsionis',
        'kasir,pembayaran,lunas,cicilan,pending,QRIS,transfer',
        'Pastikan dokter sudah menyelesaikan pelayanan. Kasir memakai akun resepsionis; pembayaran pasien berbeda dari langganan Dentiva.', [
    step('Buka **Jadwal**, pilih tanggal, lalu cari kunjungan berstatus **Selesai**. Pilih tombol pembayaran pada kartu untuk membuka formulir kunjungan itu.', NAV('Jadwal'), ref('schedule/SchedulePage', "visit.status === 'completed'"), ref('schedule/SchedulePage', 'navigate(`/pembayaran/${visit.id}`)')),
    step('Cocokkan pasien, kunjungan, tindakan, jumlah, dan harga. Periksa biaya tambahan serta diskon sesuai kebijakan klinik; jangan mengubah pilihan klinis tanpa koordinasi dokter.', PAY('selectedTreatments'), PAY('value={paymentData.biaya_tambahan}'), PAY('value={paymentData.diskon}')),
    step('Isi **Uang Diterima** sesuai dana yang diterima dan pilih metode pembayaran yang sesuai, misalnya Cash, QRIS, atau Transfer Bank. Periksa **TOTAL BAYAR** sebelum melanjutkan.', PAY('value={paymentData.jumlah_bayar'), PAY('<option value="cash">Cash'), PAY('<option value="transfer">Transfer Bank'), PAY('TOTAL BAYAR:')),
    step('Pilih status **Lunas**, **Bayar Sebagian**, atau **Pending** sesuai keadaan sebenarnya. Untuk QRIS, periksa notifikasi dana masuk di aplikasi bank/e-wallet klinik; menampilkan QR tidak berarti pembayaran berhasil.', PAY('<option value="paid">Lunas'), PAY('<option value="partial">Bayar Sebagian'), ref('payment/QrisPanel', 'Simpan pembayaran hanya setelah')),
    step('Pilih **Simpan Pembayaran** dan tunggu konfirmasi. Jika koneksi putus atau hasil tidak jelas, buka kembali detail pembayaran yang sama sebelum mengirim ulang.', PAY('Simpan Pembayaran'), PAY('paymentService.saveVisitPayment'), ref('payment/PaymentList', 'navigate(`/pembayaran/${payment.visit_id}`)')),
    step('Buka **Pembayaran**, cari invoice atau pasien, lalu periksa status terakhir melalui **Detail**. Lanjutkan pencetakan invoice dari detail yang sudah tercatat.', NAV('Pembayaran'), ref('payment/PaymentList', 'Cari nama pasien atau invoice...'), ref('payment/PaymentList', 'Detail')),
], ['Status bawaan formulir adalah Lunas. Bila Uang Diterima kosong atau nol ketika Lunas dipilih, aplikasi mengisinya sebesar total tagihan saat simpan; selalu isi dan periksa nominal secara eksplisit.',
    'Pembayaran lunas dapat mengunci perubahan. Pembatalan/refund bukan fitur yang dijanjikan artikel ini; hubungi admin klinik dan ikuti prosedur koreksi.'],
    'invoice-dan-kwitansi,layanan-dokter,faq-pemecahan-masalah')

article('invoice-dan-kwitansi', 'Mencari dan mencetak invoice', 'resepsionis',
        'invoice,kwitansi,faktur,cetak,PDF,WhatsApp,kasir',
        'Cetak dari transaksi yang sudah disimpan. Gunakan invoice yang sama untuk cetak ulang agar tidak membuat transaksi ganda.', [
    step('Buka **Pembayaran**. Cari nama pasien atau nomor invoice, lalu sesuaikan rentang waktu dan status bila hasil belum muncul.', NAV('Pembayaran'), ref('payment/PaymentList', 'Cari nama pasien atau invoice...'), ref('payment/PaymentList', 'Filter rentang waktu pembayaran'), ref('payment/PaymentList', 'Filter status pembayaran')),
    step('Pilih **Detail** pada invoice yang benar. Cocokkan nomor invoice, pasien, item, total, dan status bayar.', ref('payment/PaymentList', 'navigate(`/pembayaran/${payment.visit_id}`)'), PAY('existingPayment.invoice_number')),
    step('Pilih **Cetak Invoice**. Periksa identitas klinik, alamat, dan rincian pada pratinjau sebelum mencetak atau menyimpan PDF melalui dialog cetak browser.', PAY('Cetak Invoice'), PAY('handlePrintInvoice')),
    step('Untuk invoice lunas, gunakan **Kirim Ulang Invoice WA** hanya bila fitur tersedia dan pasien memberi izin WhatsApp. Baca hasil pengiriman; status ditunda atau gagal bukan bukti pesan sudah diterima.', PAY('Kirim Ulang Invoice WA'), PAY('skipped_no_consent:'), PAY('handleResendWhatsApp')),
    step('Jika dialog cetak tidak muncul pada desktop, buka aplikasi web resmi yang diberikan klinik melalui browser dan cari invoice yang sama. Jangan membuat pembayaran baru untuk mencoba mencetak ulang.', PAY('handlePrintInvoice'), ref('auth/LoginPage', 'Masuk ke Sistem'), ref('payment/PaymentList', 'Cari nama pasien atau invoice...')),
], ['Invoice memuat data pasien dan transaksi. Jangan mengirim ke nomor yang belum diverifikasi atau printer yang tidak diawasi.',
    'Bila alamat klinik pada pratinjau tidak sesuai, hentikan pencetakan dan hubungi admin klinik. Kode cetak saat ini masih memuat alamat tetap; perubahan Profil Klinik belum membuktikan seluruh template cetak ikut benar.'],
    'pembayaran-kunjungan,aplikasi-desktop,privasi-dan-backup')

article('master-bahan', 'Menyiapkan master bahan dan satuan stok', 'admin',
        'master bahan,gudang,satuan,box,konversi,stok minimum,batch',
        'Tentukan satuan dasar sebelum mencatat pembelian. Satuan beli seperti box dapat berisi beberapa satuan dasar seperti pcs.', [
    step('Buka **Biaya & Modal → Master Bahan & Gudang**. Periksa daftar agar bahan yang sama tidak dibuat dua kali.', NAV('Biaya & Modal'), ref('costing/CostingDashboard', "label: 'Master Bahan & Gudang'")),
    step('Pilih **Tambah Bahan Baru**. Isi kode bahan, nama, kategori, dan satuan dasar.', ref('costing/MasterBahan', 'Tambah Bahan Baru'), ref('costing/MasterBahan', 'Kode, nama, dan satuan dasar wajib diisi')),
    step('Isi satuan beli dan faktor konversi sesuai kemasan yang diterima. Contoh sintetis: satu box berisi 100 pcs berarti faktor konversi 100; jangan memasukkan jumlah box sebagai isi per box.', ref('costing/MasterBahan', 'value={formData.satuan_beli}'), ref('costing/MasterBahan', 'value={formData.faktor_konversi}')),
    step('Isi stok minimum serta pemasok bila diperlukan, lalu **Simpan**. Setelah tersimpan, gunakan **Stok Masuk** untuk mencatat pembelian; pembuatan master melalui formulir ini bukan pencatatan pembelian.', ref('costing/MasterBahan', 'value={formData.stok_minimum}'), ref('costing/MasterBahan', "'Menyimpan...' : 'Simpan'"), ref('costing/CostingDashboard', "label: 'Stok Masuk'")),
    step('Untuk melihat batch, pilih ikon **Lihat Batch & Expired** pada baris bahan. Cocokkan tanggal kedaluwarsa dan sisa batch dengan kondisi gudang.', ref('costing/MasterBahan', 'Lihat Batch & Expired'), ref('costing/MasterBahan', 'Info Batch & Kadaluarsa')),
], ['Jangan menghapus bahan yang mempunyai histori stok untuk merapikan daftar. Jika ada master keliru atau ganda, koordinasikan koreksi dengan penanggung jawab klinik.',
    'Kode KFA atau kategori Obat bukan bukti persetujuan penggunaan klinis; penetapan obat tetap melalui dokter dan prosedur klinik.'],
    'mencatat-stok-masuk,opname-dan-kartu-stok,biaya-hpp-dan-margin')

article('mencatat-stok-masuk', 'Mencatat pembelian dan stok masuk', 'admin',
        'stok masuk,pembelian,faktur,pemasok,harga,konversi,kedaluwarsa',
        'Siapkan master bahan dan nota pembelian. Periksa satuan beli serta isi per kemasan sebelum menyimpan.', [
    step('Buka **Biaya & Modal → Stok Masuk**.', NAV('Biaya & Modal'), ref('costing/CostingDashboard', "label: 'Stok Masuk'")),
    step('Isi tanggal pembelian dan pilih bahan pada **Pilih Bahan**. Pastikan kode/nama sesuai barang yang diterima.', ref('costing/MaterialPurchases', 'value={formData.tanggal}'), ref('costing/MaterialPurchases', '-- Pilih Bahan --')),
    step('Isi jumlah beli dan harga per satuan beli. Tinjau perhitungan jumlah satuan dasar dan total pembelian; misalnya jumlah box harus dikalikan isi per box yang benar.', ref('costing/MaterialPurchases', 'value={formData.jumlah_beli}'), ref('costing/MaterialPurchases', 'value={formData.harga_satuan_beli}'), ref('costing/MaterialPurchases', 'jumlah_dasar')),
    step('Lengkapi pemasok, nomor faktur, dan tanggal kedaluwarsa bila ada. Cocokkan semuanya dengan nota serta kemasan fisik.', ref('costing/MaterialPurchases', 'value={formData.supplier}'), ref('costing/MaterialPurchases', 'value={formData.no_faktur}'), ref('costing/MaterialPurchases', 'value={formData.tanggal_kadaluarsa}')),
    step('Pilih **Proses Pembelian**. Setelah proses berhasil, periksa perubahan melalui **Kartu Stok** dan informasi batch pada master bahan sebelum mencatat pembelian berikutnya.', ref('costing/MaterialPurchases', 'Proses Pembelian'), ref('costing/MaterialPurchases', 'if (res.success)'), ref('costing/CostingDashboard', "label: 'Kartu Stok'")),
], ['Jangan mengirim ulang pembelian hanya karena layar terlambat merespons; periksa kartu stok dan nomor faktur terlebih dahulu.',
    'Stok masuk melalui agen tidak mendukung pembatalan otomatis. Jika jumlah keliru, periksa bukti dan lakukan koreksi lewat opname yang beralasan.'],
    'master-bahan,opname-dan-kartu-stok,usulan-denti')

article('opname-dan-kartu-stok', 'Memeriksa kartu stok dan mencatat opname', 'admin',
        'opname,kartu stok,selisih,stok fisik,koreksi,gudang',
        'Kartu stok membantu menelusuri pergerakan. Opname menyesuaikan saldo berdasarkan hasil hitung fisik, bukan menambahkan jumlah pembelian.', [
    step('Buka **Biaya & Modal → Kartu Stok**. Pilih bahan, jenis pergerakan, dan rentang tanggal untuk menelusuri selisih.', NAV('Biaya & Modal'), ref('costing/CostingDashboard', "label: 'Kartu Stok'"), ref('costing/StockMovements', 'Semua Tipe'), ref('costing/StockMovements', 'value={filters.startDate}')),
    step('Hitung stok fisik dalam satuan dasar bahan. Buka **Stok Opname → Lakukan Opname Baru** untuk membuka formulir.', ref('costing/CostingDashboard', "label: 'Stok Opname'"), ref('costing/StockOpname', 'Lakukan Opname Baru'), ref('costing/StockOpname', 'selectedMaterial.satuan_dasar')),
    step('Pilih tanggal dan bahan. Bandingkan **Stok Sistem (Saat Ini)** dengan jumlah yang benar-benar ada, lalu isi **Stok Fisik Aktual** sebagai saldo akhir, bukan nilai selisih.', ref('costing/StockOpname', 'value={formData.tanggal}'), ref('costing/StockOpname', 'value={formData.stok_fisik}'), ref('costing/StockOpname', 'stok_sistem: mat ? mat.stok_saat_ini')),
    step('Baca **Selisih** yang ditampilkan, lalu isi **Catatan** berisi alasan yang dapat dipertanggungjawabkan, misalnya koreksi salah hitung. Pastikan arah penyesuaiannya benar.', ref('costing/StockOpname', 'Selisih:'), ref('costing/StockOpname', 'Alasan selisih (rusak, hilang, dll)...')),
    step('Pilih **Simpan Opname**. Periksa riwayat opname serta Kartu Stok setelah proses berhasil; jika hasil belum jelas, jangan membuat opname kedua sebelum membaca saldo terbaru.', ref('costing/StockOpname', 'Simpan Opname'), ref('costing/StockOpname', 'Riwayat Stok Opname'), ref('costing/StockMovements', 'Opname (Selisih)')),
], ['Simpan bukti hitung sesuai prosedur klinik. Jangan menyesuaikan angka hanya agar cocok dengan perkiraan.',
    'Kartu stok bukan fitur menghapus histori. Koreksi tidak menghapus alasan transaksi sebelumnya.'],
    'mencatat-stok-masuk,master-bahan,usulan-denti')

article('biaya-hpp-dan-margin', 'Menyiapkan biaya, resep bahan, dan membaca HPP', 'admin',
        'HPP,BOM,resep bahan,overhead,biaya,margin,profitabilitas,wastage',
        'HPP membantu memahami modal perawatan. Hasilnya bergantung pada kelengkapan harga bahan, resep bahan, overhead, dan transaksi; HPP bukan tarif pasien.', [
    step('Buka **Biaya & Modal → Biaya Operasional → Tambah Biaya Overhead**. Isi kategori, nama biaya, dan jumlah bulanan, lalu **Simpan**.', NAV('Biaya & Modal'), ref('costing/CostingDashboard', "label: 'Biaya Operasional'"), ref('costing/OverheadCosts', 'Tambah Biaya Overhead'), ref('costing/OverheadCosts', 'value={formData.jumlah_bulanan}'), ref('costing/OverheadCosts', 'onClick={handleSaveCost}')),
    step('Pada **Target & Alokasi Bulanan**, pilih periode dan gunakan **Edit Target** bila target sudah ada. Periksa total overhead serta **Estimasi Total Bobot Tindakan**, lalu **Kunci Target**. Target ini masukan perhitungan, bukan jumlah pasien yang pasti datang.', ref('costing/OverheadCosts', 'Target & Alokasi Bulanan'), ref('costing/OverheadCosts', 'Edit Target'), ref('costing/OverheadCosts', 'Estimasi Total Bobot Tindakan'), ref('costing/OverheadCosts', 'Kunci Target')),
    step('Buka **Resep Bahan (BOM)**. Cari dan pilih perawatan yang akan disusun, lalu **Tambah Bahan**.', ref('costing/CostingDashboard', "label: 'Resep Bahan (BOM)'"), ref('costing/TreatmentBOM', 'Cari perawatan...'), ref('costing/TreatmentBOM', '<Plus size={16} /> Tambah Bahan')),
    step('Pilih bahan, isi jumlah rata-rata dalam satuan dasar serta **Wastage (%)**. Tinjau pilihan **Bahan Wajib**, kemudian **Simpan**. Periksa resepnya sebelum melanjutkan ke perawatan lain.', ref('costing/TreatmentBOM', 'qty_rata2'), ref('costing/TreatmentBOM', 'Wastage (%)'), ref('costing/TreatmentBOM', 'Bahan Wajib (otomatis dipotong dari stok saat selesai)'), ref('costing/TreatmentBOM', 'onClick={handleSaveBOM}')),
    step('Buka **Lap. Profitabilitas**, pilih awal dan akhir periode, lalu baca harga jual, modal, dan margin yang tersedia. Bila belum ada data, periksa transaksi, harga bahan, dan resep; jangan menganggap data kosong sebagai laba nol yang sudah terukur.', ref('costing/CostingDashboard', "label: 'Lap. Profitabilitas'"), ref('costing/ProfitabilityReport', 'value={dateRange.startDate}'), ref('costing/ProfitabilityReport', 'item.total_modal'), ref('costing/ProfitabilityReport', 'item.margin')),
], ['BOM adalah resep pemakaian bahan, bukan resep obat pasien. Jangan memakai estimasi bahan sebagai keputusan klinis.',
    'Pisahkan master overhead untuk alokasi biaya dari pencatatan pengeluaran aktual. Jangan menjanjikan perubahan BOM/target akan menghitung ulang semua histori.'],
    'master-bahan,mencatat-stok-masuk,mencatat-pengeluaran')

article('mencatat-pengeluaran', 'Mencatat pengeluaran dan memeriksa nota', 'admin',
        'pengeluaran,nota,pindai,biaya,pemasok,duplikat',
        'Pengeluaran dapat dicatat manual. Pindai nota adalah bantuan pengisian yang tetap perlu diperiksa; pencatatan stok masuk merupakan alur tersendiri.', [
    step('Buka **Pengeluaran** dan pilih periode yang relevan. Periksa daftar untuk memastikan nota belum tercatat.', NAV('Pengeluaran'), ref('financial/ExpensesPage', 'setMonth('), ref('financial/ExpensesPage', 'r.nomor_nota')),
    step('Pilih **Tambah**, lalu isi tanggal, kategori, jumlah, pemasok, nomor nota, dan deskripsi sesuai bukti transaksi.', ref('financial/ExpensesPage', 'onClick={openNew}'), ref('financial/ExpensesPage', 'value={editing.tanggal_expense}'), ref('financial/ExpensesPage', 'value={editing.nomor_nota}')),
    step('Bila memakai **Pindai nota**, pilih foto nota pembelian yang jelas dan sudah bebas data pasien. Periksa ulang hasil pembacaan, terutama nominal, tanggal, dan pemasok. Bila AI tidak aktif atau kuota habis, lanjutkan pengisian manual.', ref('financial/ExpensesPage', 'onClick={startScan}'), ref('financial/ExpensesPage', 'Periksa hasil pindai nota'), ref('financial/ExpensesPage', 'Silakan isi manual.')),
    step('Pilih **Simpan**. Bila muncul catatan transaksi mirip, bandingkan dahulu. Gunakan **Tetap simpan** hanya jika Anda telah memastikan transaksi memang berbeda dan sah.', ref('financial/ExpensesPage', '<Button type="submit"'), ref('financial/ExpensesPage', 'Tetap simpan'), ref('financial/ExpensesPage', 'expenseService.byNota')),
    step('Tunggu pesan **Pengeluaran disimpan.** atau **Pengeluaran diperbarui.**, lalu periksa barisnya. Untuk koreksi, gunakan ikon **Ubah** pada pengeluaran yang sama.', ref('financial/ExpensesPage', "'Pengeluaran diperbarui.' : 'Pengeluaran disimpan.'"), ref('financial/ExpensesPage', 'title="Ubah"')),
], ['Nota pembelian dapat dikirim ke layanan AI jika Anda memakai pindai nota. Jangan unggah nota yang memuat identitas atau rincian medis pasien.',
    'Jangan menghapus pengeluaran untuk menyembunyikan kesalahan. Periksa transaksi dan koordinasikan koreksi dengan penanggung jawab keuangan.'],
    'mencatat-stok-masuk,biaya-hpp-dan-margin,menggunakan-denti')

article('layar-antrean-tv', 'Menyiapkan layar antrean TV', 'admin,resepsionis',
        'TV,antrean,token,layar ruang tunggu,tautan,cabut',
        'Gunakan tautan khusus untuk TV. TV tidak memerlukan login staf dan menerima informasi antrean terbatas.', [
    step('Buka **Layar Antrean** pada akun admin atau resepsionis.', NAV('Layar Antrean'), ref('queue/QueueDisplayPage', '<QueueDisplayLinks />')),
    step('Isi nama layar, misalnya “TV Ruang Tunggu”, lalu **Buat tautan**. Tunggu tautan baru tampil.', ref('settings/QueueDisplayLinks', 'placeholder="Nama layar'), ref('settings/QueueDisplayLinks', 'Buat tautan')),
    step('Pilih **Salin tautan**, lalu buka alamat tersebut di browser TV dan simpan sebagai bookmark. Tautan lengkap hanya ditampilkan sekali; jika salin otomatis gagal, salin manual dari kotak tautan.', ref('settings/QueueDisplayLinks', 'Salin tautan'), ref('settings/QueueDisplayLinks', 'hanya ditampilkan sekali'), ref('settings/QueueDisplayLinks', 'Salin tautan secara manual')),
    step('Periksa layar TV: gunakan nomor antrean, inisial, dan nama dokter untuk membantu panggilan. Jika layar tidak memperbarui data, periksa koneksi dan konfirmasikan antrean kepada resepsionis.', ref('queue/QueueDisplay', 'get_queue_display'), ref('queue/QueueDisplay', 'setInterval(fetchQueue'), ref('settings/QueueDisplayLinks', 'nomor antrean, inisial')),
    step('Bila TV diganti atau tautan tersebar, buka **Tautan yang pernah dibuat → Cabut** pada tautan terkait. Konfirmasi pencabutan dan buat tautan baru bila diperlukan.', ref('settings/QueueDisplayLinks', 'Tautan yang pernah dibuat'), ref('settings/QueueDisplayLinks', 'Cabut tautan'), ref('settings/QueueDisplayLinks', "toast.success('Tautan dicabut')")),
], ['Siapa pun yang memegang tautan dapat melihat layar antrean. Jangan memasukkannya ke grup publik, laporan, atau tangkapan layar.',
    'Jangan membuka dashboard staf di TV. Nomor antrean dan inisial tetap perlu ditampilkan secara terbatas untuk keperluan pelayanan.'],
    'layanan-dokter,privasi-dan-backup,faq-pemecahan-masalah')

article('menggunakan-denti', 'Menggunakan Denti dan memahami batasnya', ALL,
        'Denti,AI,agen,panduan,kuota,pindai nota,asisten',
        'Denti Pemandu membantu navigasi dan penjelasan untuk semua peran. Asisten AI dan Denti Agen untuk data operasional tersedia bagi admin sesuai akses dan paket yang aktif.', [
    step('Untuk panduan aplikasi, pilih **Buka Denti, pemandu Dentiva**, lalu ketik pertanyaan seperti “buka jadwal” atau “apa itu HPP?”. Pilih tombol **Kirim**.', ref('ai/DentiGuideWidget', 'Buka Denti, pemandu Dentiva'), ref('ai/DentiGuideWidget', 'aria-label="Tulis pesan untuk Denti"'), ref('ai/DentiGuideWidget', 'aria-label="Kirim"')),
    step('Sebagai admin, buka **Asisten AI** untuk pertanyaan bisnis atau usulan tindakan. Jika layar persetujuan penggunaan tampil, baca informasi pemrosesan data dan aktifkan hanya bila Anda berwenang serta setuju.', NAV('Asisten AI'), ref('ai/AiAssistantPage', 'Saya admin klinik ini dan menyetujui'), ref('ai/AiAssistantPage', 'onClick={() => toggle(true)}')),
    step('Periksa pemakaian kuota, lalu tulis pertanyaan operasional yang jelas dan pilih **Kirim**. Contoh sintetis: “Bahan apa yang perlu dipesan ulang?”. Enter mengirim; Shift+Enter membuat baris baru.', ref('ai/AiAssistantPage', 'status.kuota_bulanan'), ref('ai/AiAssistantPage', 'Enter untuk kirim, Shift+Enter baris baru'), ref('ai/AiAssistantPage', '<Send size={16} /> Kirim')),
    step('Jika memindai nota dari Asisten AI, pilih ikon **Pindai nota agar Denti mencatatnya** dan unggah foto nota pembelian yang sesuai. Periksa hasil serta kartu usulan; foto terbaca belum berarti pengeluaran atau stok sudah dicatat.', ref('ai/AiAssistantPage', 'Pindai nota agar Denti mencatatnya'), ref('ai/AiAssistantPage', 'ask(notaMessage(d)'), AG('Data baru berubah setelah Anda menyetujui.')),
    step('Tinjau jawaban dan kartu usulan. Agen dapat membantu bahan, stok, pengeluaran, overhead, resep bahan, dan tarif; untuk pembayaran pasien, rekam medis, data pasien, pengguna, atau pengaturan, gunakan menu resmi dengan akun berwenang.', AG('Usulan tindakan Denti'), ref('ai/AiAssistantPage', 'Hanya angka ringkasan'), ref('ai/DentiGuideWidget', 'khusus admin')),
], ['Jangan mengetik identitas, nomor kontak, atau rekam medis pasien ke chat, termasuk pada nama file dan foto nota. Teks yang Anda masukkan sendiri tetap dapat memuat informasi sensitif.',
    'Jawaban AI dapat keliru. Cocokkan nominal, satuan, dan sumber transaksi sebelum menyetujui; jawaban percakapan bukan bukti pencatatan.',
    'Jika kuota habis atau AI sibuk, gunakan menu operasional yang tersedia; jangan mengirim permintaan berulang tanpa memeriksa hasil sebelumnya.'],
    'usulan-denti,mencatat-pengeluaran,faq-pemecahan-masalah',
    'Batas kemampuan tindakan mengacu pula pada docs/denti-agen.md bagian Kemampuan; bukan daftar fitur baru G3. Denti Pemandu memakai panduan lokal dan tidak memberikan akses agen kepada dokter/resepsionis.')

article('usulan-denti', 'Menyetujui, menolak, dan membatalkan usulan Denti', 'admin',
        'Denti Agen,setujui,tolak,batalkan,undo,kedaluwarsa,duplikat',
        'Usulan belum mengubah data bisnis. Hanya admin pembuat yang berwenang dapat menjalankannya; server memeriksa kembali kondisi data saat persetujuan.', [
    step('Buka **Asisten AI** dan minta pekerjaan operasional yang jelas. Tunggu kartu **Usulan tindakan Denti**; kalimat “sudah dicatat” tanpa kartu/hasil bukan bukti data berubah.', NAV('Asisten AI'), AG('aria-label="Usulan tindakan Denti"')),
    step('Baca judul, rincian, risiko, dan seluruh peringatan pada kartu. Cocokkan bahan, nominal, satuan, tanggal, serta nota. Jika ada yang keliru, pilih **Tolak**, tunggu status **Ditolak**, lalu minta usulan yang diperbaiki.', AG('p.rincian'), AG('p.peringatan'), AG('Tolak: ${p.judul}'), AG('> Ditolak')),
    step('Jika benar, pilih **Setujui** sekali dan tunggu status **Dijalankan**. Bila ada beberapa kartu, periksa semuanya sebelum memilih **Setujui semua**; persetujuan massal satu paket, sehingga satu kegagalan membatalkan seluruh paket tersebut.', AG('Setujui: ${p.judul}'), AG('> Dijalankan'), AG('Setujui semua ('), AG('bila ada yang gagal, tidak ada yang berubah')),
    step('Gunakan **Lihat di Pengeluaran**, **Lihat di Master Treatment**, atau **Lihat di Biaya & Modal**, sesuai jenis kartu, untuk memeriksa hasil tercatat.', AG('Lihat di {link.label}'), AG("label: 'Pengeluaran'"), AG("label: 'Master Treatment'"), AG("label: 'Biaya & Modal'")),
    step('Untuk hasil yang masih dapat dibatalkan, pilih **Batalkan** pada kartu Dijalankan dan tunggu **Dibatalkan**. Tombol ini hanya muncul jika server menyatakan tindakan mendukung pembatalan; periksa hasil akhirnya melalui menu terkait.', AG('{a.bisaBatal &&'), AG('Batalkan: ${p.judul}'), AG('> Dibatalkan')),
    step('Jika kartu **Kedaluwarsa**, minta usulan baru setelah membaca data terbaru. Jika persetujuan/pembatalan gagal atau koneksi terputus, baca pesan galat dan periksa hasil di menu terkait sebelum mengirim permintaan lagi.', AG('> Kedaluwarsa'), AG('Minta Denti membuat usulan ini lagi.'), AG('{a.error &&')),
], ['Tolak menghentikan usulan yang belum dijalankan; Batalkan mencoba memulihkan hasil tindakan yang sudah dijalankan dan didukung server. Keduanya berbeda.',
    'Stok masuk tidak dapat dibatalkan otomatis. Tinjau Kartu Stok dan gunakan opname beralasan untuk koreksi, bukan membuat transaksi kebalikan sembarang.',
    'Usulan berlaku 30 menit menurut aturan agen; perubahan data atau izin dapat membuat usulan ditolak lebih awal. Jangan memakai akun orang lain untuk menyetujui.'],
    'menggunakan-denti,opname-dan-kartu-stok,mencatat-pengeluaran')

article('aplikasi-desktop', 'Menggunakan Dentiva Desktop dan menangani pembaruan', ALL,
        'desktop,Windows,macOS,installer,update,pembaruan,cetak,offline',
        'Dentiva Desktop menampilkan aplikasi klinik dalam jendela desktop. Data tetap memerlukan koneksi ke server; aplikasi ini bukan server lokal atau mode kerja offline.', [
    step('Pada halaman masuk versi web, pilih **Unduh aplikasi desktop**. Minta admin klinik memverifikasi sumber dan installer resmi sebelum pemasangan Windows/macOS; bila perangkat menampilkan peringatan keamanan, hentikan dan minta bantuan admin.', ref('auth/LoginPage', 'Unduh aplikasi desktop')),
    step('Setelah pemasangan yang disetujui pengelola, buka Dentiva dan masuk dengan akun pribadi melalui **Masuk ke Sistem**. Periksa peran seperti pada aplikasi web.', ref('auth/LoginPage', 'Masuk ke Sistem'), ref('layout/TopBar', 'Menu profil pengguna')),
    step('Jika kartu **Dentiva … tersedia** muncul, simpan semua pekerjaan dahulu. Pilih **Perbarui sekarang** hanya setelah admin memastikan kanal pembaruan siap, atau **Nanti** untuk melanjutkan pekerjaan.', ref('common/DesktopUpdater', 'Dentiva {update.version} tersedia'), ref('common/DesktopUpdater', 'Simpan pekerjaan Anda dulu'), ref('common/DesktopUpdater', "'Perbarui sekarang'"), ref('common/DesktopUpdater', '>Nanti<')),
    step('Tunggu proses unduh, pemasangan, dan mulai ulang. Jika kartu menampilkan kegagalan, periksa koneksi dan gunakan **Coba lagi** hanya setelah pekerjaan aman; bila tetap gagal, hubungi admin klinik untuk installer yang diverifikasi.', ref('common/DesktopUpdater', 'update.downloadAndInstall'), ref('common/DesktopUpdater', 'await relaunch()'), ref('common/DesktopUpdater', "'Coba lagi'")),
    step('Jika cetak invoice tidak membuka dialog di desktop, gunakan aplikasi web resmi melalui browser dan buka invoice yang sama dari **Pembayaran → Detail → Cetak Invoice**.', ref('payment/PaymentList', 'navigate(`/pembayaran/${payment.visit_id}`)'), PAY('Cetak Invoice')),
], ['Jangan mematikan SmartScreen, Gatekeeper, antivirus, atau pemeriksaan tanda tangan untuk memasang aplikasi.',
    'Pembaruan otomatis belum dijamin aktif: konfigurasi yang ditinjau masih memakai placeholder kunci publik updater. Adanya komponen pembaruan tidak membuktikan distribusi rilis sudah siap.',
    'Saat offline, jangan menganggap perubahan sudah tersimpan. Setelah jaringan pulih, periksa data server sebelum mengulang transaksi.'],
    'masuk-dan-keluar,invoice-dan-kwitansi,faq-pemecahan-masalah',
    'Sumber tambahan: docs/desktop.md dan apps/desktop/src-tauri/tauri.conf.json. Kesiapan installer, tanda tangan kode, dan kanal rilis perlu diverifikasi pengelola; artikel tidak memerintahkan pengguna membangun atau menerbitkan rilis.')

article('privasi-dan-backup', 'Menjaga privasi pasien dan meminta bantuan pemulihan', ALL,
        'privasi,data pasien,akses,backup,offsite,pemulihan,permintaan data',
        'Gunakan informasi pasien hanya untuk pekerjaan yang diizinkan. Panduan operasional ini tidak menetapkan kebijakan retensi atau menjanjikan hasil pemulihan data.', [
    step('Periksa peran pada **Menu profil pengguna**. Gunakan menu sesuai tugas: admin untuk bisnis/agregat, dokter untuk klinis, resepsionis untuk administrasi serta pembayaran. Jika **Akses Ditolak**, pilih **Kembali ke Dashboard** dan hubungi admin klinik bila hak akses perlu ditinjau.', ref('layout/TopBar', 'Menu profil pengguna'), ref('common/Sidebar', 'const menus ='), ref('auth/AccessDenied', 'Kembali ke Dashboard')),
    step('Saat mencari atau membuka detail pasien, verifikasi penerima dan tujuan penggunaan sebelum menyalin, mencetak, atau membagikan informasi. Jangan masukkan data pasien ke Denti; gunakan panduan tanpa identitas.', ref('patient/PatientList', 'title="Lihat Detail"'), ref('patient/PatientDetail', 'Export PDF PDP'), ref('ai/DentiGuideWidget', 'aria-label="Tulis pesan untuk Denti"')),
    step('Jika pasien meminta salinan, koreksi, atau penghapusan, teruskan ke penanggung jawab klinik melalui admin. Dokter/resepsionis berwenang dapat membuka detail pasien dan **Catat Permintaan** sesuai prosedur verifikasi klinik. Mencatat permintaan tidak otomatis mengabulkan atau menghapus data.', ref('patient/PatientDetail', 'Catat Permintaan'), ref('patient/PatientDetail', 'pdpService.createDataSubjectRequest'), ref('patient/PatientDetail', 'requestType: pdpForm.requestType')),
    step('Untuk pertanyaan backup, admin dapat membuka **Pengaturan → Database** dan membaca status yang ditampilkan. **Buat Backup Sekarang (Nonaktif)** dan **Pilih File Backup (Nonaktif)** belum bisa dipakai; hubungi admin klinik untuk diteruskan ke pengelola sistem.', NAV('Pengaturan'), SET("label: 'Database'"), SET('Buat Backup Sekarang (Nonaktif)'), SET('Pilih File Backup (Nonaktif)')),
    step('Akhiri sesi melalui **Menu profil pengguna → Keluar** ketika selesai, terutama pada perangkat bersama. Amankan hasil cetak dan unduhan sebelum menyerahkan perangkat.', ref('layout/TopBar', '<LogOut size={16} /> Keluar')),
], ['Backup offsite belum aktif. Backup lokal bukan jaminan pemulihan semua kejadian; jangan menjanjikan waktu pulih atau kehilangan data maksimum yang belum diuji.',
    'Jangan mengirim berkas backup, PDF pasien, token layar TV, atau tangkapan layar yang berisi data pasien ke layanan AI/kanal dukungan umum.',
    'Jika menduga informasi terlihat oleh pihak yang salah, hentikan pembagian dan segera hubungi admin klinik melalui kanal resmi tanpa meneruskan data sensitifnya.'],
    'sandi-dan-mfa,layar-antrean-tv,faq-pemecahan-masalah')

article('faq-pemecahan-masalah', 'FAQ dan pemecahan masalah sehari-hari', ALL,
        'FAQ,galat,error,koneksi,akses ditolak,AI sibuk,reset,backup,dukungan',
        'Mulai dari pesan yang terlihat. Bila hasil penyimpanan belum jelas, periksa status terbaru sebelum mengulangi tindakan.', [
    step('**Menu hilang atau Akses Ditolak?** Periksa peran di menu profil, lalu gunakan **Kembali ke Dashboard**. Hubungi admin klinik bila pembagian tugas tidak sesuai; jangan mencoba akun orang lain atau mengubah alamat untuk melewati izin.', ref('layout/TopBar', 'Menu profil pengguna'), ref('auth/AccessDenied', 'Kembali ke Dashboard')),
    step('**Email reset tidak datang atau lupa sandi?** Hubungi admin klinik. **Lupa password?** masih dapat menampilkan pesan pengiriman, tetapi SMTP/email reset sandi belum aktif; jangan menunggu email sebagai satu-satunya jalur pemulihan.', ref('auth/LoginPage', 'Lupa password?'), ref('auth/LoginPage', "resetState === 'sent'")),
    step('**Halaman gagal dimuat?** Periksa jaringan terlebih dahulu. Pada galat daftar Pembayaran gunakan **Coba lagi**; pada layar **Aplikasi Mengalami Kendala** gunakan **Muat Ulang Halaman** setelah menilai pekerjaan yang belum tersimpan. Catat pesan galat tanpa data pasien bila tetap gagal.', ref('payment/PaymentList', '>Coba lagi</button>'), ref('common/ErrorBoundary', 'Aplikasi Mengalami Kendala'), ref('common/ErrorBoundary', 'Muat Ulang Halaman')),
    step('**Pembayaran atau usulan Denti belum jelas hasilnya?** Buka detail transaksi atau menu hasil usulan dan periksa status. Pesan jawaban AI, QR yang tampil, atau tombol yang sudah ditekan belum membuktikan proses selesai. Jangan mengulang simpan atau Setujui sebelum memeriksa.', ref('payment/PaymentList', 'navigate(`/pembayaran/${payment.visit_id}`)'), AG('Lihat di {link.label}'), ref('payment/QrisPanel', 'Simpan pembayaran hanya setelah')),
    step('**Denti sibuk, kuota habis, atau tidak menjawab?** Baca pesan di **Asisten AI** dan periksa kuota. Gunakan **Pengeluaran** atau **Biaya & Modal** untuk pekerjaan manual sesuai izin; coba AI kembali kemudian tanpa mengirim data pasien.', ref('ai/AiAssistantPage', 'status.kuota_bulanan'), ref('ai/AiAssistantPage', 'res.error'), NAV('Pengeluaran'), NAV('Biaya & Modal')),
    step('**Backup atau pemulihan data diperlukan?** Hubungi admin klinik. Tombol backup/restore belum aktif, backup offsite belum aktif, dan pengelola perlu memeriksa cadangan serta pilihan pemulihan sebelum memberi keputusan.', SET('Buat Backup Sekarang (Nonaktif)'), SET('Pilih File Backup (Nonaktif)')),
    step('**Klinik ditangguhkan atau pendaftaran belum aktif?** Baca keterangan layar, hubungi admin klinik agar berkoordinasi dengan tim Dentiva, lalu pilih **Periksa lagi** setelah ada pembaruan status. Tombol ini memeriksa ulang, bukan mengaktifkan klinik sendiri.', ref('auth/ClinicUnavailable', 'Periksa lagi'), ref('auth/ClinicUnavailable', 'refreshAccountStatus')),
], ['Saat melapor, berikan nama menu, waktu kejadian, jenis perangkat, dan pesan galat yang sudah disamarkan. Jangan mengirim sandi, token, NIK, atau rekam medis.',
    'Jangan membersihkan penyimpanan browser, memasang ulang aplikasi, atau menutup sesi saat ada pekerjaan yang belum tersimpan tanpa menilai dampaknya bersama admin.'],
    'sandi-dan-mfa,pembayaran-kunjungan,usulan-denti,privasi-dan-backup')

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def build():
    (OUT / 'artikel').mkdir(parents=True, exist_ok=True)
    byslug = {a['slug']: a for a in ARTICLES}
    assert len(byslug) == len(ARTICLES) == 25
    evidence, sources = [], {}
    for a in ARTICLES:
        text = [f"# {a['judul']}", '', '**Untuk siapa:** ' + ', '.join('resepsionis/kasir' if r == 'resepsionis' else r for r in a['peran']) + '.', '', a['pembuka'], '', '## Langkah', '']
        footnotes = []
        for n, s in enumerate(a['langkah'], 1):
            resolved = []
            for relative, anchor in s['sumber']:
                p = ROOT / relative
                lines = p.read_text(encoding='utf-8').splitlines()
                hits = [i for i, line in enumerate(lines, 1) if anchor in line]
                assert hits, (a['slug'], n, relative, anchor)
                line = hits[0]
                resolved.append({'berkas': relative, 'baris': line, 'penanda': anchor})
                sources[relative] = hashlib.sha256(p.read_bytes()).hexdigest()
            assert any(r['berkas'].startswith(C) for r in resolved)
            text.append(f"{n}. {s['teks']} [^langkah-{n}]")
            footnotes.append(f"[^langkah-{n}]: " + '; '.join(f"`{r['berkas']}:{r['baris']}`" for r in resolved) + '.')
            evidence.append({'slug': a['slug'], 'langkah': n, 'teks': s['teks'], 'rujukan': resolved})
        text += ['', '## Catatan keamanan', ''] + ['- ' + x for x in a['keamanan']]
        if a['catatan']:
            text += ['', '## Catatan penggunaan', '', a['catatan']]
        text += ['', '## Artikel terkait', ''] + [f"- [{byslug[x]['judul']}]({x}.md)" for x in a['terkait']]
        text += ['', '## Rujukan langkah untuk peninjau', '', f'Acuan kode: `{BASE}`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.', ''] + footnotes
        (OUT / 'artikel' / (a['slug'] + '.md')).write_text('\n'.join(text) + '\n', encoding='utf-8')
    dump(OUT / 'indeks.json', [{k: a[k] for k in ['slug', 'judul', 'peran', 'kata_kunci']} for a in ARTICLES])
    dump(OUT / 'sumber-langkah.json', {'versi': 1, 'commit_sumber': BASE, 'sha256_sumber': sources, 'langkah': evidence})
    print(f"Disusun: {len(ARTICLES)} artikel, {len(evidence)} langkah, {len(sources)} komponen.")

if __name__ == '__main__':
    build()
