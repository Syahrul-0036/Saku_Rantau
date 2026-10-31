/**
 * ============================================================
 * SAKU RANTAU — script.js
 * Manajemen Keuangan Anak Rantau
 * Vanilla JS · Chart.js · localStorage
 * ============================================================
 */

'use strict';

/* ============================================================
   1. KONSTANTA & KONFIGURASI
   ============================================================ */

/** Daftar kategori pengeluaran */
const EXPENSE_CATEGORIES = [
  { id: 'makan',       label: '🍚 Makan',              color: '#f59e0b' },
  { id: 'kos',         label: '🏠 Kos/Sewa',            color: '#8b5cf6' },
  { id: 'transportasi',label: '🚌 Transportasi',         color: '#3b82f6' },
  { id: 'kuliah',      label: '📚 Kuliah/Tugas',         color: '#06b6d4' },
  { id: 'pulsa',       label: '📱 Pulsa & Internet',     color: '#10b981' },
  { id: 'laundry',     label: '👕 Laundry',              color: '#ec4899' },
  { id: 'hiburan',     label: '🎮 Hiburan',              color: '#f97316' },
  { id: 'keluarga',    label: '💝 Kirim ke Keluarga',    color: '#e11d48' },
  { id: 'lainnya',     label: '🗂️ Lainnya',              color: '#94a3b8' },
];

/** Daftar kategori pemasukan */
const INCOME_CATEGORIES = [
  { id: 'kiriman',     label: '💌 Kiriman Orang Tua',   color: '#16a34a' },
  { id: 'beasiswa',    label: '🎓 Beasiswa',             color: '#2563eb' },
  { id: 'kerja',       label: '💼 Kerja Sambilan',       color: '#0891b2' },
  { id: 'jual',        label: '🛍️ Jualan',               color: '#7c3aed' },
  { id: 'lainnya_in',  label: '💰 Lainnya',              color: '#65a30d' },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

/** Nama bulan Indonesia */
const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

/* ============================================================
   2. SEED DATA (contoh awal agar dashboard tidak kosong)
   ============================================================ */
const SEED_TRANSACTIONS = [
  { id: 's1', type: 'income',  amount: 1500000, category: 'kiriman',      date: thisMonthDate(1),  note: 'Kiriman bulan ini dari Ayah' },
  { id: 's2', type: 'income',  amount: 400000,  category: 'beasiswa',     date: thisMonthDate(3),  note: 'Beasiswa UKT' },
  { id: 's3', type: 'expense', amount: 600000,  category: 'kos',          date: thisMonthDate(2),  note: 'Bayar kos bulanan' },
  { id: 's4', type: 'expense', amount: 180000,  category: 'makan',        date: thisMonthDate(4),  note: 'Makan 3x sehari × 4 hari' },
  { id: 's5', type: 'expense', amount: 50000,   category: 'transportasi', date: thisMonthDate(5),  note: 'Naik angkot + grab' },
  { id: 's6', type: 'expense', amount: 35000,   category: 'pulsa',        date: thisMonthDate(6),  note: 'Isi pulsa & paket data' },
  { id: 's7', type: 'expense', amount: 25000,   category: 'laundry',      date: thisMonthDate(7),  note: 'Laundry 5 kg' },
  { id: 's8', type: 'expense', amount: 120000,  category: 'kuliah',       date: thisMonthDate(8),  note: 'Print tugas + fotokopi' },
  { id: 's9', type: 'expense', amount: 75000,   category: 'hiburan',      date: thisMonthDate(10), note: 'Nonton bioskop sama teman' },
  { id:'s10', type: 'expense', amount: 200000,  category: 'keluarga',     date: thisMonthDate(12), note: 'Transfer ke adik' },
  { id:'s11', type: 'expense', amount: 95000,   category: 'makan',        date: thisMonthDate(14), note: 'Makan siang + dinner' },
  { id:'s12', type: 'expense', amount: 45000,   category: 'transportasi', date: thisMonthDate(15), note: 'Bensin motor' },
];

/** Helper: buat tanggal di bulan sekarang */
function thisMonthDate(day) {
  const now = new Date();
  const d = String(day).padStart(2,'0');
  const m = String(now.getMonth()+1).padStart(2,'0');
  return `${now.getFullYear()}-${m}-${d}`;
}

const SEED_BUDGETS = {
  makan: 500000, kos: 700000, transportasi: 150000,
  kuliah: 200000, pulsa: 80000, laundry: 60000,
  hiburan: 150000, keluarga: 300000, lainnya: 100000,
};

const SEED_SAVINGS = [
  { id: 'sv1', name: 'Dana Darurat', target: 2000000, current: 350000, deadline: '' },
  { id: 'sv2', name: '🏠 Tiket Pulang Kampung', target: 500000, current: 120000, deadline: endOfNextMonth() },
];

const SEED_REMITTANCES = [
  { id: 'r1', sender: 'Ayah', amount: 1500000, date: thisMonthDate(1),  note: 'Rutin bulanan' },
];

function endOfNextMonth() {
  const d = new Date();
  d.setMonth(d.getMonth()+2, 0);
  return d.toISOString().split('T')[0];
}

/* ============================================================
   3. STATE (data aktif di memori)
   ============================================================ */
let transactions = [];
let budgets      = {};     // { categoryId: maxAmount }
let savingsGoals = [];
let remittances  = [];
let darkMode     = false;
let trendMode    = 'daily'; // 'daily' | 'weekly'
let pendingDeleteId = null;

// Filter state
let filterMonth    = currentYearMonth();
let filterCategory = 'all';
let filterType     = 'all';

// Chart instances
let chartCategory = null;
let chartBar      = null;
let chartTrend    = null;

/* ============================================================
   4. STORAGE HELPERS
   ============================================================ */
function save(key, data) {
  localStorage.setItem('sr_' + key, JSON.stringify(data));
}
function load(key, fallback) {
  const raw = localStorage.getItem('sr_' + key);
  return raw ? JSON.parse(raw) : fallback;
}

/** Muat semua data dari localStorage; pasang seed jika kosong */
function loadAll() {
  transactions = load('transactions', null);
  if (transactions === null) {
    // Pertama kali buka: pasang seed data
    transactions = SEED_TRANSACTIONS;
    save('transactions', transactions);
  }

  budgets = load('budgets', null);
  if (budgets === null) {
    budgets = SEED_BUDGETS;
    save('budgets', budgets);
  }

  savingsGoals = load('savings', null);
  if (savingsGoals === null) {
    savingsGoals = SEED_SAVINGS;
    save('savings', savingsGoals);
  }

  remittances = load('remittances', null);
  if (remittances === null) {
    remittances = SEED_REMITTANCES;
    save('remittances', remittances);
  }

  darkMode = load('darkMode', false);
}

/* ============================================================
   5. UTILITY / FORMAT
   ============================================================ */

/** Format angka ke Rupiah */
function formatRp(amount) {
  return 'Rp ' + Math.abs(amount).toLocaleString('id-ID');
}

/** Format tanggal ke format Indonesia */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m)-1]} ${y}`;
}

/** Ambil YYYY-MM dari Date sekarang */
function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

/** Generate ID unik */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

/** Ambil info kategori berdasarkan id */
function getCategoryInfo(id) {
  return ALL_CATEGORIES.find(c => c.id === id) || { id, label: id, color: '#94a3b8' };
}

/** Hitung sisa hari hingga tanggal tertentu dari hari ini */
function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const today  = new Date();
  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

/* ============================================================
   6. FILTER HELPERS
   ============================================================ */

/** Ambil transaksi yang sesuai filter aktif */
function getFiltered() {
  return transactions.filter(tx => {
    const txMonth = tx.date.slice(0,7);
    if (filterMonth !== 'all' && txMonth !== filterMonth) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
    return true;
  });
}

/** Transaksi bulan aktif (untuk chart & budget — TANPA filter kategori/jenis) */
function getMonthTx(month) {
  return transactions.filter(tx => tx.date.slice(0,7) === month);
}

/* ============================================================
   7. SUMMARY CARDS
   ============================================================ */
function renderSummaryCards() {
  const filtered = getFiltered();

  const totalIncome  = filtered.filter(t=>t.type==='income') .reduce((s,t)=>s+t.amount,0);
  const totalExpense = filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance      = totalIncome - totalExpense;

  // Uang harian: dari semua transaksi (tidak difilter by bulan) karena saldo kumulatif
  const allIncome  = transactions.filter(t=>t.type==='income') .reduce((s,t)=>s+t.amount,0);
  const allExpense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const realBalance = allIncome - allExpense;

  // Sisa hari di bulan ini
  const now   = new Date();
  const eom   = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const today = now.getDate();
  const daysLeft = eom - today + 1;
  const daily = daysLeft > 0 ? Math.floor(realBalance / daysLeft) : 0;

  el('card-balance').textContent = formatRp(balance);
  el('card-balance').className = `text-xl font-bold truncate ${balance < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`;

  el('card-income').textContent  = formatRp(totalIncome);
  el('card-expense').textContent = formatRp(totalExpense);
  el('card-daily').textContent   = formatRp(daily);
  el('card-daily-sub').textContent = `per hari · ${daysLeft} hari lagi`;
}

/* ============================================================
   8. TRANSACTION LIST
   ============================================================ */
function renderTransactions() {
  const list    = el('transaction-list');
  const empty   = el('transaction-empty');
  const filtered = getFiltered().slice().sort((a,b) => b.date.localeCompare(a.date));

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = filtered.map(tx => {
    const cat  = getCategoryInfo(tx.category);
    const sign = tx.type === 'income' ? '+' : '-';
    const amtClass = tx.type === 'income' ? 'text-green-600 font-bold' : 'text-red-500 font-bold';
    return `
      <div class="tx-item" data-id="${tx.id}">
        <div class="tx-icon ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}">
          ${cat.label.split(' ')[0]}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              ${cat.label.replace(/^[^ ]+ /,'')}
            </span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
              ${tx.type === 'income' ? 'Masuk' : 'Keluar'}
            </span>
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            ${formatDate(tx.date)}${tx.note ? ' · ' + escHtml(tx.note) : ''}
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="${amtClass} text-sm">${sign} ${formatRp(tx.amount)}</div>
          <div class="flex gap-1 mt-1 justify-end">
            <button onclick="openEditModal('${tx.id}')"
              class="p-1 text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition text-xs" title="Edit">✏️</button>
            <button onclick="openDeleteConfirm('${tx.id}')"
              class="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-xs" title="Hapus">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ============================================================
   9. CHARTS
   ============================================================ */

/** Warna tema Chart.js berdasarkan dark mode */
function chartTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    grid:  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    label: isDark ? '#9ca3af' : '#6b7280',
    bg:    isDark ? '#111827'  : '#ffffff',
  };
}

/** 9a. Doughnut: pengeluaran per kategori */
function renderCategoryChart() {
  const expenses = getFiltered().filter(t => t.type === 'expense');
  const emptyEl  = el('chart-category-empty');

  if (expenses.length === 0) {
    emptyEl.classList.remove('hidden');
    if (chartCategory) { chartCategory.destroy(); chartCategory = null; }
    return;
  }
  emptyEl.classList.add('hidden');

  // Hitung total per kategori
  const totals = {};
  expenses.forEach(t => { totals[t.category] = (totals[t.category]||0) + t.amount; });

  const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  const labels = sorted.map(([id]) => getCategoryInfo(id).label);
  const data   = sorted.map(([,v]) => v);
  const colors = sorted.map(([id]) => getCategoryInfo(id).color);
  const theme  = chartTheme();

  const cfg = {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2,
      borderColor: theme.bg, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position:'bottom', labels:{ color: theme.label, font:{size:11}, padding:12, boxWidth:12 } },
        tooltip: { callbacks: { label: ctx => ` ${formatRp(ctx.raw)}` } }
      }
    }
  };

  if (chartCategory) { chartCategory.destroy(); }
  chartCategory = new Chart(el('chart-category'), cfg);
}

/** 9b. Bar: Pemasukan vs Pengeluaran per bulan */
function renderBarChart() {
  const emptyEl = el('chart-bar-empty');
  const theme   = chartTheme();

  // Ambil 6 bulan terakhir
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }

  const incomeData  = months.map(m => getMonthTx(m).filter(t=>t.type==='income') .reduce((s,t)=>s+t.amount,0));
  const expenseData = months.map(m => getMonthTx(m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  const hasData     = incomeData.some(v=>v>0) || expenseData.some(v=>v>0);

  if (!hasData) {
    emptyEl.classList.remove('hidden');
    if (chartBar) { chartBar.destroy(); chartBar = null; }
    return;
  }
  emptyEl.classList.add('hidden');

  const labels = months.map(m => { const [y,mo] = m.split('-'); return MONTH_NAMES[parseInt(mo)-1].slice(0,3) + ' ' + y.slice(2); });

  const cfg = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Pemasukan',   data: incomeData,  backgroundColor:'rgba(22,163,74,0.8)',  borderRadius:6 },
        { label:'Pengeluaran', data: expenseData, backgroundColor:'rgba(220,38,38,0.75)', borderRadius:6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels:{ color: theme.label, font:{size:12}, boxWidth:14, padding:16 } },
        tooltip: { callbacks: { label: ctx => ` ${formatRp(ctx.raw)}` } }
      },
      scales: {
        x: { ticks:{ color: theme.label, font:{size:11} }, grid:{ color: theme.grid } },
        y: { ticks:{ color: theme.label, font:{size:11},
              callback: v => 'Rp ' + (v>=1000000 ? (v/1000000).toFixed(1)+'jt' : (v/1000).toFixed(0)+'rb') },
             grid:{ color: theme.grid } }
      }
    }
  };
  if (chartBar) { chartBar.destroy(); }
  chartBar = new Chart(el('chart-bar'), cfg);
}

/** 9c. Line: Tren pengeluaran harian/mingguan */
function renderTrendChart() {
  const emptyEl = el('chart-trend-empty');
  const theme   = chartTheme();

  // Ambil pengeluaran bulan aktif
  const expenses = getMonthTx(filterMonth !== 'all' ? filterMonth : currentYearMonth())
    .filter(t => t.type === 'expense');

  if (expenses.length === 0) {
    emptyEl.classList.remove('hidden');
    if (chartTrend) { chartTrend.destroy(); chartTrend = null; }
    return;
  }
  emptyEl.classList.add('hidden');

  let labels, data;

  if (trendMode === 'daily') {
    // Hitung total per tanggal
    const byDate = {};
    expenses.forEach(t => { byDate[t.date] = (byDate[t.date]||0) + t.amount; });
    const sorted = Object.keys(byDate).sort();
    labels = sorted.map(d => parseInt(d.split('-')[2]) + ' ' + MONTH_NAMES[parseInt(d.split('-')[1])-1].slice(0,3));
    data   = sorted.map(d => byDate[d]);
  } else {
    // Mingguan: kelompokkan per minggu ke-N bulan itu
    const byWeek = { '1':0,'2':0,'3':0,'4':0,'5':0 };
    expenses.forEach(t => {
      const day = parseInt(t.date.split('-')[2]);
      const wk  = Math.ceil(day/7);
      byWeek[String(wk)] = (byWeek[String(wk)]||0) + t.amount;
    });
    labels = ['Minggu 1','Minggu 2','Minggu 3','Minggu 4','Minggu 5'];
    data   = Object.values(byWeek);
  }

  const cfg = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Pengeluaran',
        data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels:{ color: theme.label } },
        tooltip: { callbacks: { label: ctx => ` ${formatRp(ctx.raw)}` } }
      },
      scales: {
        x: { ticks:{ color: theme.label, font:{size:11} }, grid:{ color: theme.grid } },
        y: { ticks:{ color: theme.label, font:{size:11},
              callback: v => 'Rp ' + (v>=1000000 ? (v/1000000).toFixed(1)+'jt' : (v/1000).toFixed(0)+'rb') },
             grid:{ color: theme.grid }, beginAtZero: true }
      }
    }
  };
  if (chartTrend) { chartTrend.destroy(); }
  chartTrend = new Chart(el('chart-trend'), cfg);
}

/* ============================================================
   10. TOP 5 PENGELUARAN
   ============================================================ */
function renderTop5() {
  const listEl  = el('top5-list');
  const emptyEl = el('top5-empty');

  const expenses = getFiltered().filter(t => t.type === 'expense')
    .slice().sort((a,b) => b.amount - a.amount).slice(0,5);

  if (expenses.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const max = expenses[0].amount;
  listEl.innerHTML = expenses.map((tx, i) => {
    const cat  = getCategoryInfo(tx.category);
    const pct  = Math.round((tx.amount / max) * 100);
    const rank = ['🥇','🥈','🥉','4️⃣','5️⃣'][i] || (i+1);
    return `
      <div class="top5-item">
        <span class="text-lg w-7 text-center flex-shrink-0">${rank}</span>
        <span class="w-6 text-base flex-shrink-0">${cat.label.split(' ')[0]}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              ${escHtml(tx.note) || cat.label.replace(/^[^ ]+ /,'')}
            </span>
            <span class="text-sm font-bold text-red-500 ml-2 flex-shrink-0">${formatRp(tx.amount)}</span>
          </div>
          <div class="top5-bar-track">
            <div class="top5-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ============================================================
   11. BUDGET PER KATEGORI
   ============================================================ */
function renderBudget() {
  const listEl  = el('budget-list');
  const emptyEl = el('budget-empty');

  const hasBudget = Object.values(budgets).some(v => v > 0);
  if (!hasBudget) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  // Hitung pengeluaran bulan aktif per kategori
  const activeMonth = filterMonth !== 'all' ? filterMonth : currentYearMonth();
  const monthExpenses = getMonthTx(activeMonth).filter(t => t.type === 'expense');
  const spent = {};
  monthExpenses.forEach(t => { spent[t.category] = (spent[t.category]||0) + t.amount; });

  listEl.innerHTML = EXPENSE_CATEGORIES
    .filter(cat => budgets[cat.id] > 0)
    .map(cat => {
      const max     = budgets[cat.id];
      const used    = spent[cat.id] || 0;
      const pct     = Math.min(Math.round((used / max) * 100), 100);
      const over    = used > max;
      const warning = pct >= 80 && !over;

      let barColor  = 'bg-green-500';
      let badge     = '';
      if (over)    { barColor = 'bg-red-500'; badge = '<span class="text-xs text-red-500 font-bold ml-1 animate-pulse">⚠️ Melebihi!</span>'; }
      else if (warning) { barColor = 'bg-yellow-400'; badge = '<span class="text-xs text-yellow-500 font-semibold ml-1">⚠️ Hampir habis</span>'; }

      return `
        <div>
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">${cat.label}</span>
              ${badge}
            </div>
            <span class="text-xs text-gray-400 dark:text-gray-500">${formatRp(used)} / ${formatRp(max)}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${barColor}" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
}

/** Isi form budget di modal */
function renderBudgetForm() {
  el('budget-form-list').innerHTML = EXPENSE_CATEGORIES.map(cat => `
    <div class="flex items-center gap-3">
      <label class="w-40 text-sm text-gray-700 dark:text-gray-200 flex-shrink-0">${cat.label}</label>
      <input type="number" min="0" data-cat="${cat.id}"
        value="${budgets[cat.id] || ''}"
        placeholder="Tidak dibatasi"
        class="input-field flex-1" />
    </div>
  `).join('');
}

/* ============================================================
   12. TARGET TABUNGAN
   ============================================================ */
function renderSavings() {
  const listEl  = el('savings-list');
  const emptyEl = el('savings-empty');

  if (savingsGoals.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  listEl.innerHTML = savingsGoals.map(sv => {
    const pct  = Math.min(Math.round((sv.current / sv.target) * 100), 100);
    const done = sv.current >= sv.target;
    const deadline = sv.deadline ? `· Deadline: ${formatDate(sv.deadline)}` : '';
    const daysLeft = sv.deadline ? daysUntil(sv.deadline) : null;
    const urgency  = daysLeft !== null && daysLeft <= 7 && !done ?
      `<span class="text-xs text-orange-500 font-semibold ml-1">⏰ ${daysLeft} hari lagi!</span>` : '';

    return `
      <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <div>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">${escHtml(sv.name)}</span>
            ${urgency}
            ${done ? '<span class="ml-1 text-xs text-green-600 font-bold">✅ Tercapai!</span>' : ''}
          </div>
          <div class="flex gap-1">
            <button onclick="openEditSavings('${sv.id}')" class="p-1 text-gray-400 hover:text-primary rounded-lg transition text-xs" title="Edit">✏️</button>
            <button onclick="deleteSavings('${sv.id}')" class="p-1 text-gray-400 hover:text-red-500 rounded-lg transition text-xs" title="Hapus">🗑️</button>
          </div>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-2">
          <span>${formatRp(sv.current)} terkumpul</span>
          <span>${formatRp(sv.target)} target ${deadline}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${done ? 'bg-green-500' : 'bg-blue-500'}" style="width:${pct}%"></div>
        </div>
        <div class="text-right text-xs font-semibold mt-1 ${done ? 'text-green-600':'text-blue-600'}">${pct}%</div>
      </div>`;
  }).join('');
}

/* ============================================================
   13. TRACKER KIRIMAN ORANG TUA
   ============================================================ */
function renderRemittances() {
  const listEl  = el('remittance-list');
  const emptyEl = el('remittance-empty');

  if (remittances.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const sorted = remittances.slice().sort((a,b) => b.date.localeCompare(a.date));
  listEl.innerHTML = sorted.map(r => `
    <div class="remittance-item">
      <div>
        <div class="text-sm font-semibold text-gray-800 dark:text-yellow-200">
          💌 ${escHtml(r.sender || 'Orang tua')}
        </div>
        <div class="text-xs text-gray-500 dark:text-yellow-300/60">
          ${formatDate(r.date)} ${r.note ? '· ' + escHtml(r.note) : ''}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-green-700 dark:text-green-400">${formatRp(r.amount)}</span>
        <button onclick="deleteRemittance('${r.id}')"
          class="p-1 text-gray-400 hover:text-red-500 rounded-lg transition text-xs" title="Hapus">🗑️</button>
      </div>
    </div>`).join('');
}

/* ============================================================
   14. FILTER BAR
   ============================================================ */
function initFilterBar() {
  // Bulan: unik dari data + bulan sekarang
  const monthSet = new Set(transactions.map(t => t.date.slice(0,7)));
  monthSet.add(currentYearMonth());
  const months = Array.from(monthSet).sort().reverse();

  const filterMonthEl = el('filter-month');
  filterMonthEl.innerHTML =
    '<option value="all">Semua Bulan</option>' +
    months.map(m => {
      const [y,mo] = m.split('-');
      return `<option value="${m}" ${m === filterMonth ? 'selected':''}>
        ${MONTH_NAMES[parseInt(mo)-1]} ${y}
      </option>`;
    }).join('');

  // Kategori
  const filterCatEl = el('filter-category');
  filterCatEl.innerHTML = '<option value="all">Semua Kategori</option>' +
    ALL_CATEGORIES.map(c => `<option value="${c.id}" ${c.id===filterCategory?'selected':''}>${c.label}</option>`).join('');
}

function bindFilterEvents() {
  el('filter-month').addEventListener('change', e => {
    filterMonth = e.target.value;
    refreshAll();
  });
  el('filter-category').addEventListener('change', e => {
    filterCategory = e.target.value;
    refreshAll();
  });
  el('filter-type').addEventListener('change', e => {
    filterType = e.target.value;
    refreshAll();
  });
  el('btn-reset-filter').addEventListener('click', () => {
    filterMonth    = currentYearMonth();
    filterCategory = 'all';
    filterType     = 'all';
    el('filter-month').value    = filterMonth;
    el('filter-category').value = 'all';
    el('filter-type').value     = 'all';
    refreshAll();
  });
}

/* ============================================================
   15. REFRESH ALL — satu fungsi memanggil semua render
   ============================================================ */
function refreshAll() {
  renderSummaryCards();
  renderTransactions();
  renderCategoryChart();
  renderBarChart();
  renderTrendChart();
  renderTop5();
  renderBudget();
  renderSavings();
  renderRemittances();
}

/* ============================================================
   16. MODAL: TAMBAH / EDIT TRANSAKSI
   ============================================================ */

/** Isi select kategori berdasarkan jenis transaksi */
function populateCategorySelect(type) {
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  el('form-category').innerHTML =
    '<option value="">-- Pilih Kategori --</option>' +
    cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
}

function openAddModal() {
  el('form-transaction').reset();
  el('form-id').value = '';
  el('modal-title').textContent = 'Tambah Transaksi';
  el('form-error').classList.add('hidden');

  // Default: pengeluaran terpilih
  el('form-transaction').querySelector('input[value="expense"]').checked = true;
  updateTypeLabels('expense');

  // Default tanggal hari ini
  el('form-date').value = new Date().toISOString().split('T')[0];

  showModal('modal-transaction');
}

function openEditModal(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  el('form-id').value     = tx.id;
  el('modal-title').textContent = 'Edit Transaksi';
  el('form-amount').value = tx.amount;
  el('form-date').value   = tx.date;
  el('form-note').value   = tx.note || '';
  el('form-error').classList.add('hidden');

  el('form-transaction').querySelector(`input[value="${tx.type}"]`).checked = true;
  updateTypeLabels(tx.type);
  el('form-category').value = tx.category;

  showModal('modal-transaction');
}

el('form-transaction').addEventListener('submit', e => {
  e.preventDefault();
  const errorEl = el('form-error');
  errorEl.classList.add('hidden');

  const type     = el('form-transaction').querySelector('input[name="type"]:checked')?.value;
  const amount   = parseFloat(el('form-amount').value);
  const category = el('form-category').value;
  const date     = el('form-date').value;
  const note     = el('form-note').value.trim();

  // Validasi
  if (!type)           { showError(errorEl, 'Pilih jenis transaksi.'); return; }
  if (!amount || amount <= 0) { showError(errorEl, 'Nominal harus lebih dari 0.'); return; }
  if (!category)       { showError(errorEl, 'Pilih kategori.'); return; }
  if (!date)           { showError(errorEl, 'Pilih tanggal.'); return; }

  const id = el('form-id').value;
  if (id) {
    // Edit existing
    const idx = transactions.findIndex(t => t.id === id);
    if (idx !== -1) { transactions[idx] = { id, type, amount, category, date, note }; }
    showToast('✅ Transaksi diperbarui!', 'success');
  } else {
    // Add new
    transactions.unshift({ id: genId(), type, amount, category, date, note });
    showToast('✅ Transaksi ditambahkan!', 'success');
  }

  save('transactions', transactions);
  hideModal('modal-transaction');
  initFilterBar();
  refreshAll();
});

// Update kategori & active label saat jenis berubah
function updateTypeLabels(type) {
  if (type === 'income') {
    el('label-income').classList.add('active');
    el('label-expense').classList.remove('active');
  } else {
    el('label-expense').classList.add('active');
    el('label-income').classList.remove('active');
  }
  populateCategorySelect(type);
}

el('form-transaction').querySelectorAll('input[name="type"]').forEach(radio => {
  radio.addEventListener('change', e => updateTypeLabels(e.target.value));
});

/* ============================================================
   17. DELETE TRANSAKSI
   ============================================================ */
function openDeleteConfirm(id) {
  pendingDeleteId = id;
  showModal('modal-confirm');
}

el('btn-confirm-delete').addEventListener('click', () => {
  if (!pendingDeleteId) return;
  transactions = transactions.filter(t => t.id !== pendingDeleteId);
  save('transactions', transactions);
  pendingDeleteId = null;
  hideModal('modal-confirm');
  initFilterBar();
  refreshAll();
  showToast('🗑️ Transaksi dihapus.', 'warning');
});

el('btn-cancel-delete').addEventListener('click', () => {
  pendingDeleteId = null;
  hideModal('modal-confirm');
});

/* ============================================================
   18. BUDGET MODAL
   ============================================================ */
el('btn-open-budget').addEventListener('click', () => {
  renderBudgetForm();
  showModal('modal-budget');
});

el('btn-save-budget').addEventListener('click', () => {
  el('modal-budget').querySelectorAll('input[data-cat]').forEach(inp => {
    const val = parseFloat(inp.value);
    budgets[inp.dataset.cat] = isNaN(val) || val <= 0 ? 0 : val;
  });
  save('budgets', budgets);
  hideModal('modal-budget');
  renderBudget();
  showToast('✅ Budget disimpan!', 'success');
});

el('btn-close-budget').addEventListener('click', () => hideModal('modal-budget'));
el('btn-cancel-budget').addEventListener('click', () => hideModal('modal-budget'));

/* ============================================================
   19. SAVINGS MODAL
   ============================================================ */
el('btn-open-savings').addEventListener('click', () => {
  el('form-savings').reset();
  el('savings-id').value = '';
  el('savings-modal-title').textContent = '🐷 Tambah Target Tabungan';
  showModal('modal-savings');
});

function openEditSavings(id) {
  const sv = savingsGoals.find(s => s.id === id);
  if (!sv) return;
  el('savings-id').value      = sv.id;
  el('savings-name').value    = sv.name;
  el('savings-target').value  = sv.target;
  el('savings-current').value = sv.current;
  el('savings-deadline').value= sv.deadline || '';
  el('savings-modal-title').textContent = '✏️ Edit Target Tabungan';
  showModal('modal-savings');
}

function deleteSavings(id) {
  savingsGoals = savingsGoals.filter(s => s.id !== id);
  save('savings', savingsGoals);
  renderSavings();
  showToast('🗑️ Target dihapus.', 'warning');
}

el('form-savings').addEventListener('submit', e => {
  e.preventDefault();
  const id       = el('savings-id').value;
  const name     = el('savings-name').value.trim();
  const target   = parseFloat(el('savings-target').value);
  const current  = parseFloat(el('savings-current').value) || 0;
  const deadline = el('savings-deadline').value;

  if (!name || !target || target <= 0) {
    showToast('⚠️ Isi nama dan target dengan benar.', 'error'); return;
  }

  if (id) {
    const idx = savingsGoals.findIndex(s => s.id === id);
    if (idx !== -1) savingsGoals[idx] = { id, name, target, current, deadline };
  } else {
    savingsGoals.push({ id: genId(), name, target, current, deadline });
  }
  save('savings', savingsGoals);
  hideModal('modal-savings');
  renderSavings();
  showToast('✅ Target tabungan disimpan!', 'success');
});

el('btn-close-savings').addEventListener('click', () => hideModal('modal-savings'));
el('btn-cancel-savings').addEventListener('click', () => hideModal('modal-savings'));

/* ============================================================
   20. REMITTANCE MODAL
   ============================================================ */
el('btn-open-remittance').addEventListener('click', () => {
  el('form-remittance').reset();
  el('remittance-date').value = new Date().toISOString().split('T')[0];
  showModal('modal-remittance');
});

function deleteRemittance(id) {
  remittances = remittances.filter(r => r.id !== id);
  save('remittances', remittances);
  renderRemittances();
  showToast('🗑️ Kiriman dihapus.', 'warning');
}

el('form-remittance').addEventListener('submit', e => {
  e.preventDefault();
  const sender = el('remittance-sender').value.trim();
  const amount = parseFloat(el('remittance-amount').value);
  const date   = el('remittance-date').value;
  const note   = el('remittance-note').value.trim();

  if (!amount || amount <= 0 || !date) {
    showToast('⚠️ Isi nominal dan tanggal.', 'error'); return;
  }

  remittances.unshift({ id: genId(), sender, amount, date, note });
  save('remittances', remittances);
  hideModal('modal-remittance');
  renderRemittances();
  showToast('✅ Kiriman dicatat!', 'success');
});

el('btn-close-remittance').addEventListener('click', () => hideModal('modal-remittance'));
el('btn-cancel-remittance').addEventListener('click', () => hideModal('modal-remittance'));

/* ============================================================
   21. KALKULATOR UANG HARIAN
   ============================================================ */
el('btn-calc').addEventListener('click', () => {
  const balance  = parseFloat(el('calc-balance').value) || 0;
  const nextDate = el('calc-next-date').value;
  const fixed    = parseFloat(el('calc-fixed').value) || 0;
  const resultEl = el('calc-result');

  if (!nextDate) {
    showToast('⚠️ Pilih tanggal kiriman berikutnya.', 'error'); return;
  }

  const days = daysUntil(nextDate);
  if (days <= 0) {
    resultEl.innerHTML = '⚠️ Tanggal kiriman sudah lewat! Pilih tanggal yang akan datang.';
    resultEl.classList.remove('hidden'); return;
  }

  const available = balance - fixed;
  const daily     = available > 0 ? Math.floor(available / days) : 0;

  resultEl.innerHTML = `
    <div class="space-y-1">
      <div class="flex justify-between"><span>Saldo tersedia:</span><strong>${formatRp(balance)}</strong></div>
      <div class="flex justify-between"><span>Pengeluaran wajib:</span><strong>- ${formatRp(fixed)}</strong></div>
      <div class="flex justify-between"><span>Saldo bebas:</span><strong>${formatRp(available)}</strong></div>
      <div class="flex justify-between"><span>Sisa hari:</span><strong>${days} hari</strong></div>
      <hr class="border-blue-200 dark:border-blue-700 my-1"/>
      <div class="flex justify-between text-base">
        <span class="font-bold">Uang per hari:</span>
        <strong class="${daily > 0 ? 'text-green-600' : 'text-red-500'} text-lg">${formatRp(daily)}</strong>
      </div>
      ${daily < 30000 ? '<p class="text-orange-500 text-xs mt-1">⚠️ Uang harian sangat sedikit. Pertimbangkan untuk berhemat!</p>' : ''}
    </div>`;
  resultEl.classList.remove('hidden');
});

/* ============================================================
   22. EXPORT CSV
   ============================================================ */
function exportCSV() {
  const filtered = getFiltered();
  if (filtered.length === 0) { showToast('⚠️ Tidak ada data untuk di-export.', 'warning'); return; }

  const rows = [
    ['Tanggal','Jenis','Kategori','Nominal','Catatan'],
    ...filtered.map(tx => [
      tx.date,
      tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      getCategoryInfo(tx.category).label.replace(/^[^ ]+ /,''),
      tx.amount,
      tx.note || '',
    ])
  ];

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `saku-rantau-${filterMonth !== 'all' ? filterMonth : 'semua'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 CSV berhasil didownload!', 'success');
}

el('btn-export-csv').addEventListener('click', exportCSV);
el('btn-export-csv-mobile').addEventListener('click', exportCSV);

/* ============================================================
   23. DARK MODE
   ============================================================ */
function applyDarkMode() {
  if (darkMode) {
    document.documentElement.classList.add('dark');
    el('btn-dark-mode').textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    el('btn-dark-mode').textContent = '🌙';
  }
  // Re-render charts untuk update warna
  if (chartCategory || chartBar || chartTrend) {
    renderCategoryChart();
    renderBarChart();
    renderTrendChart();
  }
}

el('btn-dark-mode').addEventListener('click', () => {
  darkMode = !darkMode;
  save('darkMode', darkMode);
  applyDarkMode();
});

/* ============================================================
   24. TREND TOGGLE
   ============================================================ */
el('btn-trend-daily').addEventListener('click', () => {
  trendMode = 'daily';
  el('btn-trend-daily').className  = 'px-3 py-1 text-xs font-semibold rounded-lg bg-primary text-white transition';
  el('btn-trend-weekly').className = 'px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition';
  renderTrendChart();
});

el('btn-trend-weekly').addEventListener('click', () => {
  trendMode = 'weekly';
  el('btn-trend-weekly').className = 'px-3 py-1 text-xs font-semibold rounded-lg bg-primary text-white transition';
  el('btn-trend-daily').className  = 'px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition';
  renderTrendChart();
});

/* ============================================================
   25. MODAL HELPERS
   ============================================================ */
function showModal(id) { el(id).classList.remove('hidden'); }
function hideModal(id) { el(id).classList.add('hidden'); }

// Tutup modal saat klik overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

el('btn-open-modal').addEventListener('click', openAddModal);
el('btn-close-modal').addEventListener('click', () => hideModal('modal-transaction'));
el('btn-cancel-form').addEventListener('click', () => hideModal('modal-transaction'));
el('btn-open-modal-empty').addEventListener('click', openAddModal);

/* ============================================================
   26. TOAST NOTIFICATION
   ============================================================ */
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = el('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

/* ============================================================
   27. MISC HELPERS
   ============================================================ */

/** Shorthand getElementById */
function el(id) { return document.getElementById(id); }

/** Escape HTML untuk mencegah XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

/* ============================================================
   28. INIT — jalankan saat DOM siap
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Muat data
  loadAll();

  // Terapkan dark mode tersimpan
  applyDarkMode();

  // Inisialisasi filter bar
  initFilterBar();
  bindFilterEvents();

  // Set default tanggal kalkulator (akhir bulan)
  const eom = new Date();
  eom.setMonth(eom.getMonth()+1, 1);
  el('calc-next-date').value = eom.toISOString().split('T')[0];

  // Set saldo kalkulator ke saldo sekarang
  const allIncome  = transactions.filter(t=>t.type==='income') .reduce((s,t)=>s+t.amount,0);
  const allExpense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  el('calc-balance').value = allIncome - allExpense;

  // Render semua komponen
  refreshAll();

  // Pesan selamat datang
  showToast('👋 Selamat datang di Saku Rantau!');
});

// Expose ke global scope untuk onclick di HTML
window.openEditModal    = openEditModal;
window.openDeleteConfirm = openDeleteConfirm;
window.openEditSavings  = openEditSavings;
window.deleteSavings    = deleteSavings;
window.deleteRemittance = deleteRemittance;
