import re

filepath = r'd:\perobaan\17\neurodent-main\src\components\medical-record\MedicalRecordForm.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        <div className="space-y-6 w-full">
          
          
              </div>
            </div>

            {/* Keluhan Utama (Chief Complaint) */}"""

replacement = """        <div className="space-y-6 w-full">
            {/* Riwayat Penyakit Medis */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Riwayat Penyakit Medis</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                  {[
                    {key:'hipertensi',label:'Hipertensi'},{key:'jantung',label:'Jantung'},{key:'asma',label:'Asma'},{key:'diabetes',label:'Diabetes'},{key:'alergi',label:'Alergi'},
                    {key:'stroke',label:'Stroke'},{key:'ginjal',label:'Ginjal'},{key:'hepatitis',label:'Hepatitis'},{key:'tuberkulosis',label:'Tuberkulosis (TB)'},
                    {key:'hiv',label:'HIV/AIDS'},{key:'thalassemia',label:'Thalassemia'},{key:'hemofilia',label:'Hemofilia'},{key:'osteoporosis',label:'Osteoporosis'},{key:'tiroid',label:'Gangguan Tiroid'},
                    {key:'epilepsi',label:'Epilepsi'}
                  ].map(({key,label}) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer bg-gray-50/80 dark:bg-gray-800/50 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                      <input type="checkbox" checked={medicalHistory[key]} onChange={e => setMedicalHistory({...medicalHistory, [key]: e.target.checked})} className="w-4 h-4 text-[var(--color-accent)] rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[var(--color-accent)]"/>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
                {medicalHistory.alergi && (
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Detail Alergi</label>
                    <input type="text" value={medicalHistory.alergi_detail} onChange={e => setMedicalHistory({...medicalHistory, alergi_detail: e.target.value})} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Sebutkan jenis obat/makanan pemicu alergi..."/>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Konsumsi Obat Saat Ini</label>
                    <textarea value={medicalHistory.konsumsi_obat} onChange={e => setMedicalHistory({...medicalHistory, konsumsi_obat: e.target.value})} className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24" placeholder="Misal: Amlodipine, Metformin, Warfarin, dll."/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Riwayat Penyakit Lainnya</label>
                    <textarea value={medicalHistory.riwayat_lain} onChange={e => setMedicalHistory({...medicalHistory, riwayat_lain: e.target.value})} className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24" placeholder="Tuliskan riwayat penyakit sistemik lainnya..."/>
                  </div>
                </div>
              </div>
            </div>

            {/* Keluhan Utama (Chief Complaint) */}"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed Medical History section.")
else:
    print("Target string not found. Please check exact spacing.")
