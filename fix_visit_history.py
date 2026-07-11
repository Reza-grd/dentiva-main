import re

filepath = r'd:\perobaan\17\neurodent-main\src\components\schedule\VisitHistory.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update states
state_target = '''  const [visits, setVisits] = useState([]);
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
  const [groupByPatient, setGroupByPatient] = useState(false);'''

state_replacement = '''  const [visits, setVisits] = useState([]);
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
  const [totalCount, setTotalCount] = useState(0);'''

content = content.replace(state_target, state_replacement)

# 2. Update loadData to pass page and limit
load_target = '''      visitService.getAllVisitsWithPayments({
        patientId: patientFilter || undefined,
        dokterIdFilter: dokterFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),'''

load_replacement = '''      visitService.getAllVisitsWithPayments({
        patientId: patientFilter || undefined,
        dokterIdFilter: dokterFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: pageSize
      }),'''
content = content.replace(load_target, load_replacement)

# 3. Handle dependency array and totalCount
dep_target = '''    if (!visitsRes.success) setError(visitsRes.error);
    else setVisits(visitsRes.data || []);

    if (patientsRes.success) setPatients(patientsRes.data || []);
    if (doctorsRes.success) setDoctors(doctorsRes.data || []);

    setLoading(false);
  }, [patientFilter, dokterFilter, dateFrom, dateTo]);'''

dep_replacement = '''    if (!visitsRes.success) setError(visitsRes.error);
    else {
      setVisits(visitsRes.data || []);
      setTotalCount(visitsRes.count || 0);
    }

    if (patientsRes.success) setPatients(patientsRes.data || []);
    if (doctorsRes.success) setDoctors(doctorsRes.data || []);

    setLoading(false);
  }, [patientFilter, dokterFilter, dateFrom, dateTo, page, pageSize]);'''
content = content.replace(dep_target, dep_replacement)

# 4. Add pagination footer
footer_target = '''              <div className="flex justify-center p-4">
                <button
                  onClick={() => loadData()}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={16} />
                  Muat Ulang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedVisitId && ('''

footer_replacement = '''              <div className="flex justify-center p-4">
                <button
                  onClick={() => loadData()}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={16} />
                  Muat Ulang
                </button>
              </div>

              {/* Pagination UI */}
              {!loading && totalCount > 0 && (
                <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Menampilkan <span className="text-gray-900 dark:text-white font-bold">{(page - 1) * pageSize + 1}</span> - <span className="text-gray-900 dark:text-white font-bold">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-gray-900 dark:text-white font-bold">{totalCount}</span> kunjungan
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Sebelumnya
                    </button>

                    <button
                      onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalCount / pageSize)))}
                      disabled={page === Math.ceil(totalCount / pageSize) || totalCount === 0}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedVisitId && ('''
content = content.replace(footer_target, footer_replacement)

# Reset page when filters change (handle locally)
content = content.replace('setPatientFilter(val)', 'setPatientFilter(val); setPage(1);')
content = content.replace('setDokterFilter(e.target.value)', '{ setDokterFilter(e.target.value); setPage(1); }')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished patching VisitHistory.jsx")
