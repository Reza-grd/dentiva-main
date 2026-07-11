import re

filepath = r'd:\perobaan\17\neurodent-main\src\components\medical-record\MedicalRecordList.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update states
state_target = '''  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');'''

state_replacement = '''  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');'''

content = content.replace(state_target, state_replacement)

# 2. Update useEffect and loadRecords
effect_target = '''  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    // Get all patients - getAllPatients does not return medical_records relation
    // so we show all patients and let them navigate to individual records
    const { success, data } = await patientService.getAllPatients();
    if (success) {
      setRecords(data || []);
    }
    setLoading(false);
  };'''

effect_replacement = '''  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadRecords();
  }, [page, pageSize, debouncedSearch]);

  const loadRecords = async () => {
    setLoading(true);
    // We rely on patientService.getAllPatients for server-side pagination and search
    const { success, data, count } = await patientService.getAllPatients({
      page,
      limit: pageSize,
      searchTerm: debouncedSearch
    });
    if (success) {
      setRecords(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };'''

content = content.replace(effect_target, effect_replacement)

# 3. Prevent client-side truncation by bypassing getFilteredRecords for searchTerm
# Wait, getFilteredRecords still exists. Let's just return `records` directly, maybe applying dateFilter locally.
filter_target = '''  const getFilteredRecords = () => {
    let filtered = records;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.nama_lengkap?.toLowerCase().includes(term) ||
          r.no_rm?.toLowerCase().includes(term) ||
          r.no_wa?.toLowerCase().includes(term)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((r) => {
        const recordDate = new Date(r.created_at);
        if (dateFilter === 'today') {
          return recordDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return recordDate >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return recordDate >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  };'''

filter_replacement = '''  const getFilteredRecords = () => {
    let filtered = records;
    // searchTerm is already handled by server-side query.
    // Date filter is handled client-side on the fetched page.
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((r) => {
        const recordDate = new Date(r.created_at);
        if (dateFilter === 'today') {
          return recordDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return recordDate >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return recordDate >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  };'''

content = content.replace(filter_target, filter_replacement)

# 4. Add pagination footer. We append it after </tbody></table></div>
footer_target = '''              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );'''

footer_replacement = '''              </tbody>
            </table>
          </div>
        )}

        {/* Pagination UI */}
        {!loading && totalCount > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Menampilkan <span className="text-gray-900 dark:text-white font-bold">{(page - 1) * pageSize + 1}</span> - <span className="text-gray-900 dark:text-white font-bold">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-gray-900 dark:text-white font-bold">{totalCount}</span> pasien
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
  );'''

content = content.replace(footer_target, footer_replacement)

# Fix statistics to use totalCount
stats_target = '''      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pasien</p>
            <p className="text-xl md:text-3xl font-bold text-primary-600">{filteredRecords.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pasien Aktif</p>
            <p className="text-xl md:text-3xl font-bold text-green-600">
              {filteredRecords.length}
            </p>
          </div>
        </div>'''
stats_replacement = '''      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pasien</p>
            <p className="text-xl md:text-3xl font-bold text-primary-600">{totalCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pasien Aktif</p>
            <p className="text-xl md:text-3xl font-bold text-green-600">
              {totalCount}
            </p>
          </div>
        </div>'''
content = content.replace(stats_target, stats_replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished patching MedicalRecordList.jsx")
