(async function () {
  const chartsContainer = document.getElementById('grades-stats-charts');
  const summaryContainer = document.getElementById('grades-stats-summary');
  if (!chartsContainer || !summaryContainer) return;

  chartsContainer.innerHTML = `
    <div class="info-card" style="padding:24px;">
      <h2 class="card-title">Στατιστικά διπλωματικών εργασιών</h2>
      <div class="chart-grid">
        <div class="chart-card"><canvas id="avgChart"></canvas></div>
        <div class="chart-card"><canvas id="totalsChart"></canvas></div>
        <div class="chart-card"><canvas id="completionChart"></canvas></div>
      </div>
    </div>
  `;

  summaryContainer.innerHTML = `
    <div class="info-card" style="padding:24px;">
      <div id="grades-summary" class="summary-text"></div>
    </div>
  `;

  // load Chart.js (pinned version)
  async function loadChartJs() {
    if (window.Chart) return;
    const url = 'https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js';
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load Chart.js'));
      document.head.appendChild(s);
    });
  }

  try {
    await loadChartJs();
  } catch (err) {
    document.getElementById('grades-summary').textContent = 'Σφάλμα φόρτωσης γραφημάτων: ' + err.message;
    console.error(err);
    return;
  }

  async function fetchStats() {
    const resp = await fetch('../PHP/stats_avg_grades.php', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });

    const raw = await resp.text();
    console.log("Raw response:", raw); // 👈 Add this

    try {
      const parsed = JSON.parse(raw);
      return { ok: resp.ok, data: parsed, raw };
    } catch (e) {
      console.error("JSON parse error:", e.message);
      throw new Error('Server returned invalid JSON: ' + raw.slice(0, 500));
    }
  }

  let payload;
  try {
    const { ok, data } = await fetchStats();
    if (!ok) throw new Error(data.error || data.message || 'Server error');
    payload = data;
    console.log("Payload received:", payload);
  } catch (err) {
    document.getElementById('grades-summary').textContent = 'Σφάλμα φόρτωσης δεδομένων: ' + err.message;
    console.error("Fetch failed:", err.message);
    return;
  }

  // Build data for avgChart (Finished only)
  const finishedLabel = 'Ολοκληρωμένες διπλωματικές';
  const supFinished = payload.avg_finished && payload.avg_finished.supervised ? payload.avg_finished.supervised : { avg: null, diplomas: 0, grade_count: 0 };
  const comFinished = payload.avg_finished && payload.avg_finished.committee ? payload.avg_finished.committee : { avg: null, diplomas: 0, grade_count: 0 };

  // Convert nulls to 0 for plotting but keep original for tooltip
  const supPlotVal = supFinished.avg == null ? 0 : Number(supFinished.avg);
  const comPlotVal = comFinished.avg == null ? 0 : Number(comFinished.avg);

  // create averages grouped bar chart (Finished only)
  const avgCtx = document.getElementById('avgChart').getContext('2d');
  if (window._avgChart) try { window._avgChart.destroy(); } catch(e){}
  window._avgChart = new Chart(avgCtx, {
    type: 'bar',
    data: {
      labels: [finishedLabel],
      datasets: [
        {
          label: 'Μέσος όρος ως επιβλέπων',
          data: [supPlotVal],
          backgroundColor: '#014d20'
        },
        {
          label: 'Μέσος όρος ως μέλος τριμελούς',
          data: [comPlotVal],
          backgroundColor: '#05bd4fff'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: true },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 10,
          title: { display: true, text: 'Μέσος βαθμός' }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const dsIdx = ctx.datasetIndex;
              const original = dsIdx === 0 ? supFinished.avg : comFinished.avg;
              const diplomas = dsIdx === 0 ? supFinished.diplomas : comFinished.diplomas;
              const gradeCount = dsIdx === 0 ? supFinished.grade_count : comFinished.grade_count;
              if (original == null) return ctx.dataset.label + ': Δεν υπάρχουν δεδομένα (0 διπλωματικές με βαθμολογίες)';
              return ctx.dataset.label + ': ' + Number(original).toFixed(2) + ` — (διπλωματικές: ${diplomas}; συνολικές βαθμολογήσεις: ${gradeCount})`;
            }
          }
        },
        legend: {
          labels: {
            color: '#111'
          },
          position: 'top'
        },
        scales: {
          x: {
            ticks: { color: '#111' }
          },
          y: {
            ticks: { color: '#111' }
          }
        }
      }
    }
  });

  //Totals stacked chart
  const statusTranslations = {
    "Finished": "Ολοκληρωμένες",
    "Accepted": "Ενεργές",
    "Does not meet requirements": "Υπό ανάθεση",
    "Under exam": "Υπό εξέταση"
  };

  const statusesRaw = payload.statuses || ['Finished','Accepted','Does not meet requirements','Under exam'];
  const statuses = statusesRaw.map(s => statusTranslations[s] || s); // Greek labels for chart

  const supervisedTotals = statusesRaw.map(s => (payload.totals && payload.totals.supervised && typeof payload.totals.supervised[s] !== 'undefined') ? Number(payload.totals.supervised[s]) : 0);
  const committeeTotals  = statusesRaw.map(s => (payload.totals && payload.totals.committee && typeof payload.totals.committee[s] !== 'undefined') ? Number(payload.totals.committee[s]) : 0);

  const totalsCtx = document.getElementById('totalsChart').getContext('2d');
  if (window._totalsChart) try { window._totalsChart.destroy(); } catch(e){}
  window._totalsChart = new Chart(totalsCtx, {
    type: 'bar',
    data: {
      labels: statuses,
      datasets: [
        {
          label: 'Σύνολο ως επιβλέπων',
          data: supervisedTotals,
          backgroundColor: '#014d20'
        },
        {
          label: 'Σύνολο ως μέλος τριμελούς',
          data: committeeTotals,
          backgroundColor: '#05bd4fff'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {display: true, text: 'Πλήθος διπλωματικών'},
          ticks: {stepSize: 1}
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y; }
          }
        },
        legend: {
          labels: {
            color: '#111'
          },
          position: 'top'
        },
        scales: {
          x: {
            ticks: { color: '#111' }
          },
          y: {
            ticks: { color: '#111' }
          }
        }
      }
    }
  });

  // Completion time chart
  const compSup = payload.avg_completion && payload.avg_completion.supervised ? payload.avg_completion.supervised : { avg_days: null, diplomas: 0 };
  const compCom = payload.avg_completion && payload.avg_completion.committee ? payload.avg_completion.committee : { avg_days: null, diplomas: 0 };

  const compLabels = ['Μέσος χρόνος περάτωσης'];
  const compSupVal = compSup.avg_days == null ? 0 : Number(compSup.avg_days);
  const compComVal = compCom.avg_days == null ? 0 : Number(compCom.avg_days);

  // compute suggestedMax based on data
  const maxComp = Math.max(compSupVal, compComVal);
  const suggestedMaxComp = maxComp > 0 ? Math.ceil(maxComp * 1.25) : 30;

  const completionCtx = document.getElementById('completionChart').getContext('2d');
  if (window._completionChart) try { window._completionChart.destroy(); } catch(e){}
  window._completionChart = new Chart(completionCtx, {
    type: 'bar',
    data: {
      labels: compLabels,
      datasets: [
        {
          label: 'Ως επιβλέπων',
          data: [compSupVal],
          backgroundColor: '#014d20'
        },
        {
          label: 'Ως μέλος τριμελούς',
          data: [compComVal],
          backgroundColor: '#05bd4fff'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: true },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: suggestedMaxComp,
          title: { display: true, text: 'Ημέρες' }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const dsIdx = ctx.datasetIndex;
              const days = ctx.parsed.y;
              const original = dsIdx === 0 ? compSup.avg_days : compCom.avg_days;
              const diplomas = dsIdx === 0 ? compSup.diplomas : compCom.diplomas;
              if (original == null) return ctx.dataset.label + ': Δεν υπάρχουν δεδομένα (0 διπλωματικές ολοκληρωμένες)';
              const monthsApprox = (Number(original) / 30).toFixed(1);
              return ctx.dataset.label + ': ' + Number(original).toFixed(1) + ` ημέρες (~${monthsApprox} μήνες) — διπλωματικές: ${diplomas}`;
            }
          }
        },
        legend: {
          labels: {
            color: '#111'
          },
          position: 'top'
        },
        scales: {
          x: {
            ticks: { color: '#111' }
          },
          y: {
            ticks: { color: '#111' }
          }
        }
      }
    }
  });

  // Summary text below
  function humanizeDays(days) {
    if (days == null) return '—';
    const d = Number(days);
    if (d < 1) return '< 1 ημέρα';
    const months = (d / 30).toFixed(1);
    return `${d} ημέρες (~${months} μήνες)`;
  }

  const summaryEl = document.getElementById('grades-summary');
  const lines = [];
  lines.push('<strong>Σύνοψη:</strong>');
  lines.push(`<div style="margin-top:8px"><strong>Μέσος όρος ως επιβλέπων:</strong> ${supFinished.avg != null ? Number(supFinished.avg).toFixed(2) : '—'} (διπλωματικές: ${supFinished.diplomas}; βαθμολογήσεις: ${supFinished.grade_count})</div>`);
  lines.push(`<div style="margin-top:4px"><strong>Μέσος όρος ως μέλος τριμελούς:</strong> ${comFinished.avg != null ? Number(comFinished.avg).toFixed(2) : '—'} (διπλωματικές: ${comFinished.diplomas}; βαθμολογήσεις: ${comFinished.grade_count})</div>`);

  lines.push('<hr style="margin-top:10px;margin-bottom:10px">');
  lines.push('<strong>Μέσος χρόνος περάτωσης:</strong>');
  lines.push(`<div style="margin-top:6px">α) Ως επιβλέπων: ${compSup.avg_days != null ? humanizeDays(compSup.avg_days) : '—'} (διπλωματικές: ${compSup.diplomas})</div>`);
  lines.push(`<div style="margin-top:4px">β) Ως μέλος τριμελούς: ${compCom.avg_days != null ? humanizeDays(compCom.avg_days) : '—'} (διπλωματικές: ${compCom.diplomas})</div>`);

  lines.push('<hr style="margin-top:10px;margin-bottom:10px">');
  lines.push('<strong>Πλήθος ανά κατάσταση:</strong>');
  statuses.forEach((s, i) => {
    const st = supervisedTotals[i] || 0;
    const ct = committeeTotals[i] || 0;
    lines.push(`<div style="margin-bottom:6px"><strong>${s}</strong> — Επιβλέπων: ${st} | Μέλος τριμελούς: ${ct}</div>`);
  });

  summaryEl.innerHTML = lines.join('');
})();
