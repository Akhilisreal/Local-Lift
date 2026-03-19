// js/report.js
// Powers the Report page: favorites PDF report, rating-over-time chart,
// and compare-businesses chart.

import { auth } from './auth.js';
import { database, usernameToKey } from './auth.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { businessData, resolveAssetPath } from './businesses.js';

// ---------- Helpers ----------

function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function starText(rating) {
    const r = Math.round(Number(rating) || 0);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function reviewerName(raw) {
    if (!raw) return 'Anonymous';
    const s = String(raw).trim();
    const at = s.indexOf('@');
    return at > 0 ? s.slice(0, at) : s;
}

// ---------- Firebase data fetchers ----------

async function getFavoriteIds(user) {
    const key = user.displayName ? usernameToKey(user.displayName) : user.uid;
    try {
        const snap = await get(ref(database, `users/${key}/favorites`));
        return (snap && snap.exists()) ? Object.keys(snap.val()) : [];
    } catch { return []; }
}

async function getReviews(bizId) {
    try {
        const snap = await get(ref(database, `businesses/${bizId}/reviews`));
        if (!snap || !snap.exists()) return [];
        return Object.values(snap.val()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } catch { return []; }
}

async function getAvg(bizId) {
    try {
        const snap = await get(ref(database, `businesses/${bizId}/averageRating`));
        return (snap && snap.exists()) ? Number(snap.val()) : null;
    } catch { return null; }
}

// ---------- Tab 1: Favorites list (HTML) ----------

export async function renderFavoritesReport(user) {
    const container = document.getElementById('favReportList');
    if (!container) return;
    container.innerHTML = '<p class="rpt-loading">Loading your favorites…</p>';

    const ids = await getFavoriteIds(user);
    if (!ids.length) {
        container.innerHTML = '<p class="rpt-empty">You have no favorited businesses yet.</p>';
        return;
    }

    container.innerHTML = '';
    for (const id of ids) {
        const biz = businessData.find(b => b.id === id);
        if (!biz) continue;
        const [avg, reviews] = await Promise.all([getAvg(id), getReviews(id)]);

        const section = document.createElement('div');
        section.className = 'rpt-biz';
        section.innerHTML = `
            <div class="rpt-biz-header">
                <img src="${resolveAssetPath(biz.img)}" alt="${esc(biz.name)}" class="rpt-biz-img">
                <div class="rpt-biz-meta">
                    <h3>${esc(biz.name)}</h3>
                    <p>${esc(biz.description)}</p>
                    <p><strong>Category:</strong> ${esc(biz.category)}</p>
                    <p><strong>Avg Rating:</strong> ${avg !== null ? Number(avg).toFixed(1) + ' / 5' : '—'}</p>
                    ${Array.isArray(biz.deals) && biz.deals.length
                        ? `<p><strong>Deals:</strong> ${biz.deals.map(d => esc(d)).join(' &bull; ')}</p>` : ''}
                </div>
            </div>
            <div class="rpt-reviews">
                <h4>Reviews (${reviews.length})</h4>
                ${reviews.length ? reviews.map(r => `
                    <div class="rpt-review-item">
                        <span class="rpt-reviewer">${esc(reviewerName(r.name))}</span>
                        <span class="rpt-stars">${starText(r.rating)}</span>
                        <span class="rpt-date">${fmtDate(r.timestamp)}</span>
                        <p class="rpt-review-text">${esc(r.text || '')}</p>
                    </div>`).join('')
                : '<p class="rpt-empty">No reviews yet.</p>'}
            </div>`;
        container.appendChild(section);
    }
}

// ---------- Tab 1: PDF generation ----------

export async function generatePDF(user) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();

    // Header banner
    doc.setFillColor(27, 21, 60);
    doc.rect(0, 0, pw, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('Local Lift', 14, 14);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text('Favorites Report', 14, 22);
    doc.setFontSize(9);
    doc.text(`Generated: ${fmtDate(Date.now())}`, 14, 29);
    doc.text(`User: ${user.displayName || user.email || 'Unknown'}`, pw - 14, 29, { align: 'right' });

    let y = 42;
    doc.setTextColor(20, 20, 20);

    const ids = await getFavoriteIds(user);
    if (!ids.length) {
        doc.setFontSize(12);
        doc.text('No favorited businesses found.', 14, y);
        doc.save('LocalLift_Favorites_Report.pdf');
        return;
    }

    for (let i = 0; i < ids.length; i++) {
        const biz = businessData.find(b => b.id === ids[i]);
        if (!biz) continue;
        const [avg, reviews] = await Promise.all([getAvg(ids[i]), getReviews(ids[i])]);

        if (y > 248) { doc.addPage(); y = 20; }

        // Business name bar
        doc.setFillColor(54, 154, 169);
        doc.rect(10, y - 5, pw - 20, 11, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text(biz.name, 14, y + 3);
        y += 13;

        doc.setTextColor(20, 20, 20);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(`Category: ${biz.category}   |   Avg Rating: ${avg !== null ? Number(avg).toFixed(1) + ' / 5.0' : 'No ratings yet'}`, 14, y);
        y += 5;

        const descLines = doc.splitTextToSize(biz.description, pw - 28);
        doc.text(descLines, 14, y);
        y += descLines.length * 5 + 2;

        if (Array.isArray(biz.deals) && biz.deals.length) {
            doc.setFont('helvetica', 'bold'); doc.text('Deals:', 14, y); y += 5;
            doc.setFont('helvetica', 'normal');
            for (const deal of biz.deals) {
                const lines = doc.splitTextToSize(`• ${deal}`, pw - 30);
                if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
                doc.text(lines, 16, y);
                y += lines.length * 5 + 1;
            }
        }
        y += 3;

        if (reviews.length) {
            const rows = reviews.map(r => [
                reviewerName(r.name),
                `${Math.round(r.rating || 0)}/5`,
                r.text || '',
                fmtDate(r.timestamp)
            ]);
            doc.autoTable({
                startY: y,
                head: [['Reviewer', 'Rating', 'Review', 'Date']],
                body: rows,
                margin: { left: 14, right: 14 },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [27, 21, 60], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [240, 240, 255] },
                columnStyles: {
                    0: { cellWidth: 28 },
                    1: { cellWidth: 14, halign: 'center' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 24, halign: 'center' }
                }
            });
            y = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFont('helvetica', 'italic'); doc.setTextColor(130, 130, 130);
            doc.text('No reviews yet.', 14, y);
            doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'normal');
            y += 10;
        }

        if (i < ids.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y - 3, pw - 14, y - 3);
        }
    }

    // — Trends chart page —
    if (includeTrendsInPDF) {
        const trendsCanvas = document.getElementById('trendsChart');
        doc.addPage();
        y = 20;
        doc.setFillColor(54, 154, 169);
        doc.rect(10, y - 5, pw - 20, 11, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        const trendsSelectEl = document.getElementById('trendsSelect');
        const trendsBiz = trendsSelectEl && trendsSelectEl.value
            ? businessData.find(b => b.id === trendsSelectEl.value) : null;
        doc.text('Rating Trends' + (trendsBiz ? ': ' + trendsBiz.name : ''), 14, y + 3);
        y += 16;
        if (trendsCanvas && trendsChart) {
            const imgData = trendsCanvas.toDataURL('image/png');
            const imgW = pw - 28;
            const imgH = Math.min(imgW * (trendsCanvas.height / trendsCanvas.width), 150);
            doc.setFillColor(240, 240, 255);
            doc.rect(14, y, imgW, imgH, 'F');
            doc.addImage(imgData, 'PNG', 14, y, imgW, imgH);
        } else {
            doc.setFontSize(10); doc.setTextColor(130, 130, 130);
            doc.text('No chart data — select a business on the Rating Trends tab first.', 14, y);
        }
    }

    // — Compare chart page —
    if (includeCompareInPDF) {
        const compareCanvas = document.getElementById('compareChart');
        doc.addPage();
        y = 20;
        doc.setFillColor(54, 154, 169);
        doc.rect(10, y - 5, pw - 20, 11, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text('Business Comparison', 14, y + 3);
        y += 16;
        if (compareCanvas && compareChart) {
            const imgData = compareCanvas.toDataURL('image/png');
            const imgW = pw - 28;
            const imgH = Math.min(imgW * (compareCanvas.height / compareCanvas.width), 150);
            doc.setFillColor(240, 240, 255);
            doc.rect(14, y, imgW, imgH, 'F');
            doc.addImage(imgData, 'PNG', 14, y, imgW, imgH);
            y += imgH + 8;
            if (compareSet.size) {
                doc.setTextColor(20, 20, 20);
                doc.setFontSize(9); doc.setFont('helvetica', 'bold');
                doc.text('Businesses Compared:', 14, y); y += 5;
                doc.setFont('helvetica', 'normal');
                for (const [id] of compareSet) {
                    const biz = businessData.find(b => b.id === id);
                    if (biz) { doc.text('• ' + biz.name, 18, y); y += 5; }
                }
            }
        } else {
            doc.setFontSize(10); doc.setTextColor(130, 130, 130);
            doc.text('No chart data — add businesses on the Compare tab first.', 14, y);
        }
    }

    // Page footers
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`Local Lift Favorites Report  •  Page ${p} of ${total}`, pw / 2, 292, { align: 'center' });
    }

    doc.save('LocalLift_Favorites_Report.pdf');
}

// ---------- PDF chart inclusion state ----------

let includeTrendsInPDF = false;
let includeCompareInPDF = false;

// ---------- Tab 2: Rating trends chart ----------

let trendsChart = null;

export async function renderTrendsChart(bizId) {
    const canvas = document.getElementById('trendsChart');
    const noData = document.getElementById('trendsNoData');
    if (!canvas) return;

    if (trendsChart) { trendsChart.destroy(); trendsChart = null; }

    const reviews = await getReviews(bizId);
    if (!reviews.length) {
        if (noData) noData.style.display = '';
        return;
    }
    if (noData) noData.style.display = 'none';

    const labels = reviews.map(r => fmtDate(r.timestamp));
    const ratings = reviews.map(r => r.rating);
    let sum = 0;
    const runAvg = reviews.map((r, i) => { sum += r.rating; return +(sum / (i + 1)).toFixed(2); });

    trendsChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Individual Ratings',
                    data: ratings,
                    borderColor: 'rgba(54,154,169,0.8)',
                    backgroundColor: 'rgba(54,154,169,0.15)',
                    pointRadius: 5, pointHoverRadius: 7,
                    borderWidth: 1.5, tension: 0, fill: true
                },
                {
                    label: 'Running Average',
                    data: runAvg,
                    borderColor: '#f0a500',
                    backgroundColor: 'transparent',
                    pointRadius: 0, borderWidth: 2.5,
                    tension: 0.4, fill: false
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            scales: {
                y: { min: 0, max: 5, ticks: { stepSize: 1, color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.08)' }, title: { display: true, text: 'Rating', color: '#ccc' } },
                x: { ticks: { color: '#ccc', maxRotation: 40 }, grid: { color: 'rgba(255,255,255,0.06)' } }
            },
            plugins: {
                legend: { labels: { color: '#ddd' } },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

// ---------- Tab 3: Compare businesses ----------

let compareChart = null;
const compareSet = new Map(); // bizId -> reviews[]
const COLORS = ['#36a2eb','#ff6384','#4bc0c0','#ff9f40','#9966ff','#ffcd56'];

export async function addToCompare(bizId) {
    if (compareSet.has(bizId)) return;
    const reviews = await getReviews(bizId);
    compareSet.set(bizId, reviews);
    _refreshCompareUI();
}

export function removeFromCompare(bizId) {
    compareSet.delete(bizId);
    _refreshCompareUI();
}

function _refreshCompareUI() {
    // Update tags
    const list = document.getElementById('compareList');
    if (list) {
        list.innerHTML = '';
        let i = 0;
        for (const [id] of compareSet) {
            const biz = businessData.find(b => b.id === id);
            if (!biz) { i++; continue; }
            const color = COLORS[i % COLORS.length];
            const tag = document.createElement('span');
            tag.className = 'compare-tag';
            tag.style.cssText = `border-color:${color}`;
            tag.innerHTML = `<span style="color:${color};font-weight:bold">${esc(biz.name)}</span><button class="compare-rm" data-id="${id}" title="Remove">✕</button>`;
            tag.querySelector('.compare-rm').onclick = () => removeFromCompare(id);
            list.appendChild(tag);
            i++;
        }
    }

    // Rebuild chart
    const canvas = document.getElementById('compareChart');
    const noData = document.getElementById('compareNoData');
    if (!canvas) return;
    if (compareChart) { compareChart.destroy(); compareChart = null; }

    if (!compareSet.size) {
        if (noData) noData.style.display = '';
        return;
    }
    if (noData) noData.style.display = 'none';

    const datasets = [];
    let ci = 0;
    let maxLen = 0;
    const tooltipDates = []; // parallel arrays per dataset

    for (const [id, reviews] of compareSet) {
        const biz = businessData.find(b => b.id === id);
        if (!biz) { ci++; continue; }
        const color = COLORS[ci % COLORS.length];

        let sum = 0;
        const vals = reviews.map((r, i) => { sum += r.rating; return +(sum / (i + 1)).toFixed(2); });
        const dates = reviews.map(r => fmtDate(r.timestamp));
        if (vals.length > maxLen) maxLen = vals.length;
        tooltipDates.push(dates);

        datasets.push({
            label: biz.name, data: vals,
            borderColor: color, backgroundColor: 'transparent',
            pointRadius: 3, borderWidth: 2, tension: 0.4
        });
        ci++;
    }

    const xLabels = Array.from({ length: maxLen }, (_, i) => `#${i + 1}`);

    compareChart = new Chart(canvas, {
        type: 'line',
        data: { labels: xLabels, datasets },
        options: {
            responsive: true, maintainAspectRatio: true,
            scales: {
                y: { min: 0, max: 5, ticks: { stepSize: 1, color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.08)' }, title: { display: true, text: 'Running Avg Rating', color: '#ccc' } },
                x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Review Number', color: '#ccc' } }
            },
            plugins: {
                legend: { labels: { color: '#ddd' } },
                tooltip: {
                    mode: 'index', intersect: false,
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            const dsIdx = items[0].datasetIndex;
                            const d = tooltipDates[dsIdx];
                            return d && d[idx] ? d[idx] : `Review #${idx + 1}`;
                        }
                    }
                }
            }
        }
    });
}

// ---------- Page init ----------

export function initReportPage() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    // Populate business selects
    businessData.forEach(biz => {
        ['trendsSelect', 'compareSelect'].forEach(selId => {
            const sel = document.getElementById(selId);
            if (!sel) return;
            const opt = document.createElement('option');
            opt.value = biz.id; opt.textContent = biz.name;
            sel.appendChild(opt);
        });
    });

    // Trends select change
    const trendsSelect = document.getElementById('trendsSelect');
    if (trendsSelect) {
        trendsSelect.addEventListener('change', () => {
            if (trendsSelect.value) renderTrendsChart(trendsSelect.value);
        });
    }

    // Compare add button
    const addBtn = document.getElementById('compareAddBtn');
    const compareSelect = document.getElementById('compareSelect');
    if (addBtn && compareSelect) {
        addBtn.addEventListener('click', () => {
            if (compareSelect.value) addToCompare(compareSelect.value);
        });
    }

    // Add-to-PDF toggle buttons
    const addTrendsBtn = document.getElementById('addTrendsToPdfBtn');
    if (addTrendsBtn) {
        addTrendsBtn.addEventListener('click', () => {
            includeTrendsInPDF = !includeTrendsInPDF;
            addTrendsBtn.textContent = includeTrendsInPDF ? '✓ Added to PDF' : '＋ Add Chart to PDF';
            addTrendsBtn.classList.toggle('added', includeTrendsInPDF);
        });
    }
    const addCompareBtn = document.getElementById('addCompareToPdfBtn');
    if (addCompareBtn) {
        addCompareBtn.addEventListener('click', () => {
            includeCompareInPDF = !includeCompareInPDF;
            addCompareBtn.textContent = includeCompareInPDF ? '✓ Added to PDF' : '＋ Add Chart to PDF';
            addCompareBtn.classList.toggle('added', includeCompareInPDF);
        });
    }

    // PDF button
    const pdfBtn = document.getElementById('generatePdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;
            pdfBtn.disabled = true;
            pdfBtn.textContent = 'Generating…';
            try { await generatePDF(user); }
            finally { pdfBtn.disabled = false; pdfBtn.textContent = 'Download PDF Report'; }
        });
    }

    // Wait for auth then load favorites list
    auth.onAuthStateChanged(user => {
        if (!user) return;
        renderFavoritesReport(user);
    });
}
