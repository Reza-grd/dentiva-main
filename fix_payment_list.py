import re

filepath = r'd:\perobaan\17\neurodent-main\src\components\payment\PaymentList.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update states
state_target = '''  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const navigate = useNavigate();'''

state_replacement = '''  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const navigate = useNavigate();

  // Server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');'''
content = content.replace(state_target, state_replacement)

# 2. Update useEffect and loadPayments
effect_target = '''  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const { success, data } = await paymentService.getAllPayments();
    if (success) {
      setPayments(data || []);
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
    loadPayments();
  }, [page, pageSize, debouncedSearch, statusFilter, dateFilter]);

  const loadPayments = async () => {
    setLoading(true);
    const { success, data, count } = await paymentService.getAllPayments({
      page,
      limit: pageSize,
      searchTerm: debouncedSearch,
      statusFilter,
      dateFilter
    });
    if (success) {
      setPayments(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };'''
content = content.replace(effect_target, effect_replacement)

# 3. Prevent client-side filtering by replacing getFilteredPayments
filter_target = '''  const getFilteredPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.invoice_number?.toLowerCase().includes(term) ||
        p.patient?.nama_lengkap?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        const pDate = new Date(p.created_at);
        if (dateFilter === 'today') {
          return pDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return pDate >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return pDate >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredPayments = getFilteredPayments();'''

filter_replacement = '''  // Filters are now handled server-side.
  const filteredPayments = payments;'''
content = content.replace(filter_target, filter_replacement)

# 4. Add pagination footer
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
              Menampilkan <span className="text-gray-900 dark:text-white font-bold">{(page - 1) * pageSize + 1}</span> - <span className="text-gray-900 dark:text-white font-bold">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-gray-900 dark:text-white font-bold">{totalCount}</span> pembayaran
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

# Reset page when filters change (handle locally in select onChange)
content = content.replace('onChange={(e) => setStatusFilter(e.target.value)}', 'onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}')
content = content.replace('onChange={(e) => setDateFilter(e.target.value)}', 'onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished patching PaymentList.jsx")
