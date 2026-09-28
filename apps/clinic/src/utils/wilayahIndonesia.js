// Data wilayah Indonesia (Provinsi, Kabupaten/Kota, Kecamatan, Desa)
// Sumber: Kemendagri - data representatif utama per provinsi

export const PROVINSI = [
  "Aceh","Sumatera Utara","Sumatera Barat","Riau","Jambi","Sumatera Selatan",
  "Bengkulu","Lampung","Kepulauan Bangka Belitung","Kepulauan Riau",
  "DKI Jakarta","Jawa Barat","Jawa Tengah","DI Yogyakarta","Jawa Timur","Banten",
  "Bali","Nusa Tenggara Barat","Nusa Tenggara Timur",
  "Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara",
  "Sulawesi Utara","Sulawesi Tengah","Sulawesi Selatan","Sulawesi Tenggara","Gorontalo","Sulawesi Barat",
  "Maluku","Maluku Utara","Papua Barat","Papua","Papua Selatan","Papua Tengah","Papua Pegunungan","Papua Barat Daya"
];

export const KABUPATEN_BY_PROVINSI = {
  "Sumatera Utara": [
    "Kota Medan","Kota Binjai","Kota Tebing Tinggi","Kota Pematangsiantar","Kota Tanjungbalai",
    "Kota Sibolga","Kota Padangsidimpuan","Kota Gunungsitoli",
    "Kab. Deli Serdang","Kab. Langkat","Kab. Karo","Kab. Simalungun","Kab. Asahan",
    "Kab. Labuhanbatu","Kab. Tapanuli Utara","Kab. Tapanuli Tengah","Kab. Tapanuli Selatan",
    "Kab. Mandailing Natal","Kab. Nias","Kab. Nias Selatan","Kab. Nias Utara","Kab. Nias Barat",
    "Kab. Dairi","Kab. Pakpak Bharat","Kab. Toba","Kab. Humbang Hasundutan","Kab. Samosir",
    "Kab. Serdang Bedagai","Kab. Batu Bara","Kab. Padang Lawas","Kab. Padang Lawas Utara",
    "Kab. Labuhanbatu Selatan","Kab. Labuhanbatu Utara"
  ],
  "Aceh": [
    "Kota Banda Aceh","Kota Sabang","Kota Langsa","Kota Lhokseumawe","Kota Subulussalam",
    "Kab. Aceh Besar","Kab. Pidie","Kab. Pidie Jaya","Kab. Bireuen","Kab. Aceh Utara",
    "Kab. Aceh Timur","Kab. Aceh Tamiang","Kab. Aceh Tengah","Kab. Bener Meriah",
    "Kab. Gayo Lues","Kab. Aceh Tenggara","Kab. Aceh Selatan","Kab. Aceh Singkil",
    "Kab. Simeulue","Kab. Nagan Raya","Kab. Aceh Barat","Kab. Aceh Barat Daya","Kab. Aceh Jaya"
  ],
  "DKI Jakarta": [
    "Kota Jakarta Pusat","Kota Jakarta Utara","Kota Jakarta Barat",
    "Kota Jakarta Selatan","Kota Jakarta Timur","Kab. Kepulauan Seribu"
  ],
  "Jawa Barat": [
    "Kota Bandung","Kota Bogor","Kota Bekasi","Kota Depok","Kota Cirebon","Kota Sukabumi",
    "Kota Tasikmalaya","Kota Banjar","Kota Cimahi",
    "Kab. Bandung","Kab. Bandung Barat","Kab. Bogor","Kab. Bekasi","Kab. Karawang",
    "Kab. Purwakarta","Kab. Subang","Kab. Indramayu","Kab. Cirebon","Kab. Kuningan",
    "Kab. Majalengka","Kab. Sumedang","Kab. Garut","Kab. Tasikmalaya","Kab. Ciamis",
    "Kab. Pangandaran","Kab. Sukabumi","Kab. Cianjur"
  ],
  "Jawa Tengah": [
    "Kota Semarang","Kota Solo","Kota Magelang","Kota Salatiga","Kota Pekalongan","Kota Tegal",
    "Kab. Semarang","Kab. Kendal","Kab. Demak","Kab. Grobogan","Kab. Kudus","Kab. Jepara",
    "Kab. Pati","Kab. Rembang","Kab. Blora","Kab. Boyolali","Kab. Klaten","Kab. Sukoharjo",
    "Kab. Wonogiri","Kab. Karanganyar","Kab. Sragen","Kab. Purworejo","Kab. Kebumen",
    "Kab. Banyumas","Kab. Cilacap","Kab. Purbalingga","Kab. Banjarnegara","Kab. Wonosobo",
    "Kab. Magelang","Kab. Temanggung","Kab. Batang","Kab. Pekalongan","Kab. Pemalang","Kab. Tegal","Kab. Brebes"
  ],
  "DI Yogyakarta": [
    "Kota Yogyakarta","Kab. Sleman","Kab. Bantul","Kab. Gunungkidul","Kab. Kulonprogo"
  ],
  "Jawa Timur": [
    "Kota Surabaya","Kota Malang","Kota Kediri","Kota Blitar","Kota Madiun","Kota Mojokerto",
    "Kota Probolinggo","Kota Pasuruan","Kota Batu",
    "Kab. Gresik","Kab. Sidoarjo","Kab. Mojokerto","Kab. Jombang","Kab. Nganjuk","Kab. Madiun",
    "Kab. Magetan","Kab. Ngawi","Kab. Bojonegoro","Kab. Tuban","Kab. Lamongan","Kab. Blitar",
    "Kab. Tulungagung","Kab. Trenggalek","Kab. Ponorogo","Kab. Pacitan","Kab. Kediri","Kab. Malang",
    "Kab. Lumajang","Kab. Jember","Kab. Bondowoso","Kab. Situbondo","Kab. Probolinggo",
    "Kab. Pasuruan","Kab. Sampang","Kab. Pamekasan","Kab. Sumenep","Kab. Bangkalan","Kab. Banyuwangi"
  ],
  "Banten": [
    "Kota Tangerang","Kota Tangerang Selatan","Kota Serang","Kota Cilegon",
    "Kab. Tangerang","Kab. Serang","Kab. Lebak","Kab. Pandeglang"
  ],
  "Bali": [
    "Kota Denpasar","Kab. Badung","Kab. Gianyar","Kab. Tabanan","Kab. Bangli",
    "Kab. Klungkung","Kab. Karangasem","Kab. Buleleng","Kab. Jembrana"
  ],
  "Sulawesi Selatan": [
    "Kota Makassar","Kota Parepare","Kota Palopo",
    "Kab. Gowa","Kab. Maros","Kab. Pangkajene dan Kepulauan","Kab. Barru","Kab. Bone",
    "Kab. Soppeng","Kab. Wajo","Kab. Sinjai","Kab. Bulukumba","Kab. Bantaeng","Kab. Jeneponto",
    "Kab. Takalar","Kab. Selayar","Kab. Pinrang","Kab. Enrekang","Kab. Tana Toraja",
    "Kab. Toraja Utara","Kab. Sidenreng Rappang","Kab. Luwu","Kab. Luwu Utara","Kab. Luwu Timur"
  ],
  "Kalimantan Timur": [
    "Kota Samarinda","Kota Balikpapan","Kota Bontang",
    "Kab. Kutai Kartanegara","Kab. Kutai Barat","Kab. Kutai Timur","Kab. Berau",
    "Kab. Paser","Kab. Penajam Paser Utara","Kab. Mahakam Ulu"
  ],
  "Sumatera Barat": [
    "Kota Padang","Kota Bukittinggi","Kota Payakumbuh","Kota Pariaman","Kota Padang Panjang",
    "Kota Sawahlunto","Kota Solok",
    "Kab. Agam","Kab. Lima Puluh Kota","Kab. Tanah Datar","Kab. Padang Pariaman","Kab. Pesisir Selatan",
    "Kab. Solok","Kab. Solok Selatan","Kab. Sijunjung","Kab. Dharmasraya","Kab. Pasaman",
    "Kab. Pasaman Barat","Kab. Kepulauan Mentawai"
  ],
  "Riau": [
    "Kota Pekanbaru","Kota Dumai",
    "Kab. Kampar","Kab. Rokan Hulu","Kab. Rokan Hilir","Kab. Bengkalis","Kab. Siak",
    "Kab. Pelalawan","Kab. Indragiri Hulu","Kab. Indragiri Hilir","Kab. Kuantan Singingi","Kab. Kepulauan Meranti"
  ],
  "Sumatera Selatan": [
    "Kota Palembang","Kota Prabumulih","Kota Lubuklinggau","Kota Pagar Alam",
    "Kab. Ogan Komering Ulu","Kab. Ogan Komering Ilir","Kab. Muara Enim","Kab. Lahat","Kab. Musi Rawas",
    "Kab. Musi Rawas Utara","Kab. Musi Banyuasin","Kab. Banyuasin","Kab. Ogan Ilir",
    "Kab. Ogan Komering Ulu Timur","Kab. Ogan Komering Ulu Selatan","Kab. Empat Lawang","Kab. Penukal Abab Lematang Ilir"
  ],
  "Nusa Tenggara Timur": [
    "Kota Kupang",
    "Kab. Kupang","Kab. Timor Tengah Selatan","Kab. Timor Tengah Utara","Kab. Belu","Kab. Malaka",
    "Kab. Alor","Kab. Flores Timur","Kab. Sikka","Kab. Ende","Kab. Ngada","Kab. Nagekeo",
    "Kab. Manggarai","Kab. Manggarai Barat","Kab. Manggarai Timur","Kab. Sumba Timur",
    "Kab. Sumba Barat","Kab. Sumba Barat Daya","Kab. Sumba Tengah","Kab. Lembata","Kab. Sabu Raijua","Kab. Rote Ndao"
  ],
  "Papua": [
    "Kota Jayapura",
    "Kab. Jayapura","Kab. Keerom","Kab. Sarmi","Kab. Mamberamo Raya","Kab. Waropen",
    "Kab. Biak Numfor","Kab. Kepulauan Yapen","Kab. Supiori","Kab. Nabire"
  ],
  "Maluku": [
    "Kota Ambon","Kota Tual",
    "Kab. Maluku Tengah","Kab. Maluku Tenggara","Kab. Maluku Tenggara Barat","Kab. Seram Bagian Barat",
    "Kab. Seram Bagian Timur","Kab. Buru","Kab. Buru Selatan","Kab. Kepulauan Aru",
    "Kab. Maluku Barat Daya","Kab. Kepulauan Tanimbar"
  ],
};

// Kecamatan contoh untuk beberapa kabupaten/kota populer
export const KECAMATAN_BY_KABUPATEN = {
  "Kota Medan": [
    "Medan Kota","Medan Baru","Medan Barat","Medan Timur","Medan Utara","Medan Selatan",
    "Medan Johor","Medan Amplas","Medan Denai","Medan Area","Medan Kota","Medan Marelan",
    "Medan Labuhan","Medan Deli","Medan Belawan","Medan Sunggal","Medan Helvetia",
    "Medan Petisah","Medan Barat","Medan Polonia","Medan Maimun","Medan Selayang","Medan Tuntungan"
  ],
  "Kota Bandung": [
    "Andir","Antapani","Arcamanik","Astana Anyar","Babakan Ciparay","Bandung Kidul",
    "Bandung Kulon","Bandung Wetan","Batununggal","Bojongloa Kaler","Bojongloa Kidul",
    "Buahbatu","Cibeunying Kaler","Cibeunying Kidul","Cibiru","Cicendo","Cidadap",
    "Cinambo","Coblong","Gedebage","Kiaracondong","Lengkong","Mandalajati","Panyileukan",
    "Rancasari","Regol","Sukajadi","Sukasari","Sumur Bandung","Ujungberung"
  ],
  "Kota Surabaya": [
    "Asemrowo","Benowo","Bubutan","Bulak","Dukuh Pakis","Gayungan","Genteng","Gubeng",
    "Gunung Anyar","Jambangan","Karang Pilang","Kenjeran","Krembangan","Lakarsantri",
    "Mulyorejo","Pabean Cantian","Pakal","Rungkut","Sambikerep","Sawahan","Semampir",
    "Simokerto","Sukolilo","Sukomanunggal","Tambaksari","Tandes","Tegalsari","Tenggilis Mejoyo","Wiyung","Wonokromo"
  ],
  "Kab. Deli Serdang": [
    "Batang Kuis","Beringin","Biru-Biru","Deli Tua","Galang","Gunung Meriah","Hamparan Perak",
    "Hilir","Labuhan Deli","Lubuk Pakam","Namo Rambe","Pagar Merbau","Pancur Batu",
    "Pantai Labu","Patumbak","Percut Sei Tuan","Sinembah Tanjung Muda Hilir","STM Hilir","STM Hulu",
    "Sunggal","Tanjung Morawa"
  ],
};

// Desa/Kelurahan contoh untuk beberapa kecamatan
export const DESA_BY_KECAMATAN = {
  "Medan Kota": ["Pasar Baru","Sekip","Hamdan","Sungai Rengas","Pusat Pasar"],
  "Medan Sunggal": ["Sunggal","Sei Sikambing B","Sei Sikambing C II","Babura","Tanjung Rejo","Lalang","Sei Agul"],
  "Medan Helvetia": ["Helvetia","Helvetia Timur","Helvetia Tengah","Dwi Kora","Cinta Damai","Sei Sikambing C","Tanjung Gusta"],
  "Medan Johor": ["Kwala Bekala","Gedung Johor","Suka Maju","Titi Kuning","Pangkalan Masyhur"],
  "Sunggal": ["Helvetia","Sei Beras Sekata","Sunggal","Tanjung Gusta","Suka Maju","Muliorejo","Sei Mencirim","Purwodadi"],
  "Lubuk Pakam": ["Lubuk Pakam I-II","Lubuk Pakam III","Syahmad","Paluh Kemiri","Cemara","Bakaran Batu","Sekip"],
  "Percut Sei Tuan": ["Kenangan","Kenangan Baru","Laut Dendang","Medan Estate","Percut","Sei Rotan","Sampali","Tembung","Bandar Khalifah"],
  "Andir": ["Garuda","Dungus Cariang","Kebon Jeruk","Ciroyom","Maleber"],
  "Coblong": ["Dago","Lebak Gede","Lebak Siliwangi","Cipaganti","Sadang Serang","Sekeloa"],
};

export function getKabupatenByProvinsi(provinsi) {
  return KABUPATEN_BY_PROVINSI[provinsi] || [];
}

export function getKecamatanByKabupaten(kabupaten) {
  return KECAMATAN_BY_KABUPATEN[kabupaten] || [];
}

export function getDesaByKecamatan(kecamatan) {
  return DESA_BY_KECAMATAN[kecamatan] || [];
}
