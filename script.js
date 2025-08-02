const SHEET_ID = '1eF4Ct_Q3B2LUoJaGwcjUMeLcIIvKv_TqgnqlLPu1I28';
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?`;

const SHEETS = {
  siswa: 'Siswa',
  pelajaran: 'Pelajaran',
  agenda: 'Agenda',
  jadwal: 'Jadwal'
};

const store = {};

async function fetchSheet(name) {
  const url = `${BASE_URL}sheet=${encodeURIComponent(name)}&tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();

  try {
    const json = JSON.parse(text.match(/setResponse\(([\s\S]+)\)/)[1]);
    const cols = json.table.cols.map((c, i) => c.label || `col${i}`);

    return json.table.rows.map(row =>
      row.c.reduce((obj, cell, i) => {
        obj[cols[i]] = cell && cell.v != null ? cell.v : '';
        return obj;
      }, {})
    );
  } catch (err) {
    console.error(`Gagal parsing sheet "${name}":`, err);
    return [];
  }
}

function validRows(arr, key) {
  return arr.filter(r => r[key] && String(r[key]).trim() !== '');
}

function countUp(el, target) {
  let current = 0;
  const step = Math.max(1, Math.floor(target / 60));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = current;
    }
  }, 16);
}

/**
 * Format Date object menjadi "1 Juni 2025".
 */
function formatTanggalIndonesia(date) {
  if (!date || isNaN(date.getTime())) {
    return 'Tanggal Tidak Valid';
  }

  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const hariKe = date.getDate();
  const namaBulan = bulan[date.getMonth()];
  const tahun = date.getFullYear();

  return `${hariKe} ${namaBulan} ${tahun}`;
}

/**
 * Mengonversi input tanggal (serial number, Date object, atau string)
 * menjadi Date object lokal pada tengah malam.
 */
function parseTanggal(input) {
  if (input == null || input === '') return null;

  let dateObj = null;

  // 1) Jika input adalah serial number Google Sheets (days since 1899-12-30)
  if (typeof input === 'number') {
    dateObj = new Date((input - 25569) * 86400000);
  }
  // 2) Jika input sudah Date object
  else if (Object.prototype.toString.call(input) === '[object Date]') {
    dateObj = new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  // 3) Jika input adalah string
  else if (typeof input === 'string') {
    // 3a) Tangani format "Date(2025,5,1)"
    const match = input.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const yy = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10);
      const dd = parseInt(match[3], 10);
      dateObj = new Date(yy, mm, dd);
    }
    // 3b) Tangani "dd/mm/yyyy" atau "dd-mm-yyyy"
    else {
      const parts = input.split(/[-\/]/).map(p => parseInt(p, 10));
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        const [dd, mm, yyyy] = parts;
        dateObj = new Date(yyyy, mm - 1, dd);
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    console.warn("Invalid date parsed:", input);
    return null;
  }

  return dateObj;
}

// Fungsi pembantu untuk membandingkan hanya tanggal (tanpa waktu)
function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function renderHome() {
  const siswaData = validRows(store.siswa, 'Nama');
  const pelajaranData = validRows(store.pelajaran, 'Pelajaran');
  const agendaData = validRows(store.agenda, 'Tanggal');

  countUp(document.getElementById('count-siswa'), siswaData.length);
  countUp(document.getElementById('count-pelajaran'), pelajaranData.length);

  const listToday = document.getElementById('list-agenda-today');
  const listTomorrow = document.getElementById('list-agenda-tomorrow');
  listToday.innerHTML = '';
  listTomorrow.innerHTML = '';

  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowLocal = new Date(todayLocal);
  tomorrowLocal.setDate(todayLocal.getDate() + 1);

  const todayLabel = document.createElement('li');
  todayLabel.textContent = formatTanggalIndonesia(todayLocal);
  todayLabel.style.fontWeight = 'bold';
  listToday.appendChild(todayLabel);

  const tomorrowLabel = document.createElement('li');
  tomorrowLabel.textContent = formatTanggalIndonesia(tomorrowLocal);
  tomorrowLabel.style.fontWeight = 'bold';
  listTomorrow.appendChild(tomorrowLabel);

  let foundToday = false;
  let foundTomorrow = false;

  agendaData.forEach(item => {
    const agendaDate = parseTanggal(item.Tanggal);
    if (!agendaDate) return;

    const li = document.createElement('li');
    li.textContent = `${item.MataPelajaran}: ${item.Keterangan}`;
    li.classList.add('agenda-item');

    if (isSameDay(agendaDate, todayLocal)) {
      listToday.appendChild(li);
      foundToday = true;
    }
    if (isSameDay(agendaDate, tomorrowLocal)) {
      listTomorrow.appendChild(li);
      foundTomorrow = true;
    }
  });

  if (!foundToday) {
    const li = document.createElement('li');
    li.textContent = 'Tidak ada agenda untuk hari ini.';
    li.classList.add('agenda-item');
    listToday.appendChild(li);
  }
  if (!foundTomorrow) {
    const li = document.createElement('li');
    li.textContent = 'Tidak ada agenda untuk besok.';
    li.classList.add('agenda-item');
    listTomorrow.appendChild(li);
  }

  const listRoles = document.getElementById('list-roles');
  listRoles.innerHTML = '';
  siswaData
    .filter(item => item.Role)
    .sort((a, b) => a.Role.localeCompare(b.Role))
    .forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.Role} – ${item.Nama}`;
      listRoles.appendChild(li);
    });
}

function renderTable(tableId, data, columns) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      if (col === 'Tanggal' && row[col]) {
        const parsedDate = parseTanggal(row[col]);
        td.textContent = parsedDate
          ? formatTanggalIndonesia(parsedDate)
          : row[col];
      } else {
        td.textContent = row[col] || '';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderSiswa() {
  const data = validRows(store.siswa, 'Nama');
  renderTable('table-siswa', data, ['NIS', 'Nama', 'Role', 'Piket']);

  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('#table-siswa tbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    });
  }

  const filterSelect = document.getElementById('filter-piket');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      const filterVal = filterSelect.value.toLowerCase();
      document.querySelectorAll('#table-siswa tbody tr').forEach(tr => {
        const piket = tr.children[3]?.textContent.toLowerCase();
        const role = tr.children[2]?.textContent.toLowerCase();
        const isVisible = !filterVal || piket.includes(filterVal) || role.includes(filterVal) ;
        tr.style.display = isVisible ? '' : 'none';
      });
    });
  }
}

function renderAgendaSection() {
  const data = validRows(store.agenda, 'Tanggal')
    .map(item => ({ ...item, _parsed: parseTanggal(item.Tanggal) }))
    .sort((b, a) => a._parsed - b._parsed);

  renderTable('table-agenda', data, ['Tanggal', 'MataPelajaran', 'Keterangan']);

  const filterInput = document.getElementById('filter-agenda-tanggal');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      const selected = filterInput.value;
      if (!selected) {
        renderTable('table-agenda', data, ['Tanggal', 'MataPelajaran', 'Keterangan']);
        return;
      }

      const selectedDate = new Date(selected + 'T00:00:00');
      const filtered = data.filter(item =>
        item._parsed && isSameDay(item._parsed, selectedDate)
      );

      renderTable('table-agenda', filtered, ['Tanggal', 'MataPelajaran', 'Keterangan']);
    });
  }
}

function renderJadwal() {
  const data = validRows(store.jadwal, 'Jam');
  renderTable('table-jadwal', data, ['Jam', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
}

function initNav() {
  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('nav__link--active'));
      link.classList.add('nav__link--active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('section--active'));
      const target = link.getAttribute('href').substring(1);
      const section = document.getElementById(target);
      if (section) section.classList.add('section--active');

      if (target === 'home') renderHome();
      if (target === 'siswa') renderSiswa();
      if (target === 'agenda') renderAgendaSection();
      if (target === 'jadwal') renderJadwal();
    });
  });
}

async function init() {
  const promises = Object.values(SHEETS).map(fetchSheet);
  const results = await Promise.all(promises);
  Object.keys(SHEETS).forEach((key, i) => store[key] = results[i]);

  renderHome();
  renderSiswa();
  renderAgendaSection();
  renderJadwal();
  initNav();

  const homeLink = document.querySelector('.nav__link[href="#home"]');
  if (homeLink) {
    homeLink.classList.add('nav__link--active');
    document.getElementById('home').classList.add('section--active');
  }

  console.log(store);
}

/// JAM SEKOLAH
async function isHoliday(dateStr) {
  const response = await fetch("https://raw.githubusercontent.com/guangrei/APIHariLibur_V2/main/holidays.json");
  const holidays = await response.json();
  return holidays.hasOwnProperty(dateStr);
}

async function updateSchoolStatus() {
  const nowUTC = new Date();
  const wibOffset = 7 * 60;
  const now = new Date(nowUTC.getTime() + wibOffset * 60000);

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const isLibur = await isHoliday(dateStr);
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour + minute / 60;

  let message = "";

  if (day === 0 || day === 6 || isLibur) {
    message = "🎉 Hari ini libur.";
  } else {
    const startTime = 6.5;
    const endTime = (day === 5) ? 12.0 : 15.0;

    if (currentTime < startTime) {
      const hoursLeft = (startTime - currentTime).toFixed(1);
      message = `🏫 Sekolah dimulai dalam ${hoursLeft} jam lagi.`;
    } else if (currentTime < endTime) {
      const hoursLeft = (endTime - currentTime).toFixed(1);
      message = `⏰ Sekolah akan selesai dalam ${hoursLeft} jam lagi.`;
    } else {
      message = "✅ Sekolah sudah selesai hari ini.";
    }
  }

  document.getElementById("school-status").innerText = message;
}

updateSchoolStatus();

document.addEventListener('DOMContentLoaded', init);