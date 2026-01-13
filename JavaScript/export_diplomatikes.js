document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('export-button');
  const preview = document.getElementById('export-preview');

  if (!btn) return;

  // Build format selector (JSON/CSV)
let formatSelect = document.getElementById('export-format');
if (!formatSelect) {
  formatSelect = document.createElement('select');
  formatSelect.id = 'export-format';
  formatSelect.title = 'Export format';

  const optJson = new Option('JSON', 'json', true, true);
  const optCsv = new Option('CSV', 'csv');
  formatSelect.add(optJson);
  formatSelect.add(optCsv);

  formatSelect.style.marginLeft = '10px';
  formatSelect.style.padding = '6px';
  formatSelect.style.fontSize = '14px';
}

// Build filter selector (epivlepontas/ melos trimelous)
let filterSelect = document.getElementById('export-filter');
if (!filterSelect) {
  filterSelect = document.createElement('select');
  filterSelect.id = 'export-filter';
  filterSelect.title = 'Filter by user/column';

  const opts = [
  { text: 'Επιβλέπων', value: 'epivlepontas' },
  { text: 'Μέλος τριμελούς', value: 'trimelis' },
];

  opts.forEach((o, idx) => {
    const opt = new Option(o.text, o.value, idx === 0, idx === 0);
    filterSelect.add(opt);
  });

  filterSelect.style.marginLeft = '10px';
  filterSelect.style.padding = '6px';
  filterSelect.style.fontSize = '14px';
}

const dropdownRow = document.getElementById('dropdown-row');
dropdownRow.appendChild(filterSelect);
dropdownRow.appendChild(formatSelect);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Ανάκτηση...';

    const chosenFormat = (formatSelect && formatSelect.value) ? formatSelect.value.toLowerCase() : 'json';
    const chosenFilter = (filterSelect && filterSelect.value) ? filterSelect.value : 'epivlepontas';

    try {
      const res = await fetch(`../PHP/kathigitisdiplomatikes.php?filter=${encodeURIComponent(chosenFilter)}`, {
        credentials: 'same-origin'
      });

      // if non-OK, try to parse JSON error body
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson && (errJson.error || errJson.message)) {
            errMsg = errJson.error || errJson.message;
          }
        } catch (e) {
          // ignore parse error
        }
        throw new Error(errMsg);
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      let dataArray = [];

      if (contentType.includes('application/json')) {
        const json = await res.json();
        dataArray = normalizeJson(json);
      } else if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
        const csvText = await res.text();
        dataArray = csvToArray(csvText);
      } else {
        // treat as HTML/text and try to extract table rows first
        const text = await res.text();
        dataArray = parseHtmlToArray(text);
      }

      if (!Array.isArray(dataArray)) dataArray = [dataArray];

      // show preview according to chosen format
      if (preview) {
        preview.style.display = 'block';
        if (chosenFormat === 'json') {
          preview.textContent = JSON.stringify(dataArray.slice(0, 20), null, 2);
        } else {
          const csvPreview = arrayToCSV(dataArray.slice(0, 20));
          preview.textContent = csvPreview || '(No CSV data)';
        }
      }

      // download result in selected format
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      if (chosenFormat === 'json') {
        const jsonStr = JSON.stringify(dataArray, null, 2);
        downloadFile(jsonStr, `theses_export_${chosenFilter}_${ts}.json`, 'application/json;charset=utf-8;');
      } else {
        const csv = arrayToCSV(dataArray);
        downloadFile(csv, `theses_export_${chosenFilter}_${ts}.csv`, 'text/csv;charset=utf-8;');
      }

      btn.textContent = 'Επιτυχής εξαγωγή ✔';
      setTimeout(() => {
        btn.textContent = originalText || 'Εξαγωγή διπλωματικών (Export)';
        btn.disabled = false;
      }, 1400);

    } catch (err) {
      console.error(err);
      alert('Σφάλμα στην ανάκτηση: ' + err.message + '\n(Έλεγξε CORS / διεύθυνση PHP / δικαιώματα)');
      btn.disabled = false;
      btn.textContent = originalText || 'Εξαγωγή διπλωματικών (Export)';
    }
  });
});

// If PHP returns an object, try to find an array inside it (common patterns)
function normalizeJson(json) {
  if (Array.isArray(json)) return json;
  if (json == null) return [];
  // Common keys that may contain arrays
  const candidateKeys = ['data', 'items', 'theses', 'results', 'diplomatikes'];
  for (const k of candidateKeys) {
    if (Array.isArray(json[k])) return json[k];
  }
  // If object has numeric keys
  const numericKeys = Object.keys(json).filter(k => /^\d+$/.test(k));
  if (numericKeys.length >= 1) {
    return numericKeys.sort((a,b)=>a-b).map(k => json[k]);
  }
  // fallback: wrap the object
  return [json];
}

// Parse returned HTML: look for table and extract headers/rows. If none, return the whole page text
function parseHtmlToArray(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  const table = doc.querySelector('table');
  if (table) {
    let headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (headers.length === 0) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        headers = Array.from(firstRow.children).map(c => c.textContent.trim());
      }
    }

    const rows = [];
    const trList = table.querySelectorAll('tbody tr');
    const rowNodes = trList.length ? trList : table.querySelectorAll('tr');

    rowNodes.forEach((tr, idx) => {
      if (idx === 0 && headers.length && Array.from(tr.children).length === headers.length && tr.parentElement.tagName !== 'TBODY') {
        return; // header row
      }
      const cells = Array.from(tr.children).map(td => td.textContent.trim());
      if (headers.length === cells.length) {
        const obj = {};
        headers.forEach((h, i) => obj[h || `col${i+1}`] = cells[i] || '');
        rows.push(obj);
      } else {
        rows.push({ row: cells.join(' | ') });
      }
    });

    return rows;
  }

  const items = doc.querySelectorAll('.thesis, .item, .result, .entry');
  if (items.length) {
    return Array.from(items).map(node => {
      const obj = {};
      Array.from(node.children).forEach((child, i) => {
        const key = child.getAttribute('data-key') || child.className || `field${i+1}`;
        obj[key] = child.textContent.trim();
      });
      obj._text = node.textContent.trim();
      return obj;
    });
  }

  return [{ htmlText: doc.body ? doc.body.innerText.trim() : htmlText.trim() }];
}

// Convert array-of-objects to CSV
function arrayToCSV(arr) {
  if (!arr || arr.length === 0) return '';

  const headersSet = new Set();
  arr.forEach(r => {
    if (typeof r === 'object' && r !== null) {
      Object.keys(r).forEach(k => headersSet.add(k));
    }
  });
  const headers = Array.from(headersSet);

  function esc(val) {
    if (val == null) return '';
    if (typeof val === 'object') val = JSON.stringify(val);
    const s = String(val).replace(/"/g, '""');
    if (s.search(/("|,|\n|\r)/g) >= 0) return `"${s}"`;
    return s;
  }

  const lines = [];
  lines.push(headers.join(','));
  arr.forEach(row => {
    const rowLine = headers.map(h => esc(row && row[h] !== undefined ? row[h] : '')).join(',');
    lines.push(rowLine);
  });
  return lines.join('\r\n');
}

// Trigger browser download
function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// CSV parser to array of objects
function csvToArray(csvText) {
  if (!csvText) return [];

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  function parseLine(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        if (inQuotes && i + 1 < line.length && line[i+1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  const headerFields = parseLine(lines[0]).map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    if (fields.length === headerFields.length) {
      const obj = {};
      for (let j = 0; j < headerFields.length; j++) obj[headerFields[j] || `col${j+1}`] = fields[j];
      data.push(obj);
    } else {
      const obj = {};
      for (let j = 0; j < fields.length; j++) obj[`col${j+1}`] = fields[j];
      data.push(obj);
    }
  }

  return data;
}
