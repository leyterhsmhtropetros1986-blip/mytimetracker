"use strict";

import * as state from "./state.js";
import { statusLabel } from "./state.js";
import * as ui from "./ui.js";
import * as charts from "./charts.js";
import { renderCategoryDonut } from "./dashboard.js";
import {
  formatDateForInput,
  formatShortDate,
  formatDuration,
  formatHoursDecimal,
  parseDateInput,
  weekdayName
} from "./utils.js";

const XLSX_SRC = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const JSPDF_SRC = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
const JSPDF_AUTOTABLE_SRC =
  "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.js";
const GREEK_FONT_SRC = "https://cdn.jsdelivr.net/npm/pdfmake@0.1.68/build/vfs_fonts.js";

const SOURCE_LABELS = {
  manual: "Χειροκίνητη",
  edited: "Επεξεργασμένη",
  timer: "Χρονόμετρο",
  assistant: "Ψηφιακός Βοηθός"
};

const STATUS_COLOR_VARS = {
  scheduled: "var(--chart-series-1)",
  in_progress: "var(--status-warning)",
  done: "var(--status-good)",
  delayed: "var(--status-serious)",
  cancelled: "var(--status-critical)"
};

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || "—";
}

let exportExcelButton;
let exportPdfButton;
let exportCsvButton;
let printReportButton;

let summaryPeriod;
let summaryTotalTasks;
let summaryTotalHours;
let summaryAvg;

let cachedGreekFont = null;

export function init() {
  exportExcelButton = document.getElementById("export-excel-button");
  exportPdfButton = document.getElementById("export-pdf-button");
  exportCsvButton = document.getElementById("export-csv-button");
  printReportButton = document.getElementById("print-report-button");

  summaryPeriod = document.getElementById("report-summary-period");
  summaryTotalTasks = document.getElementById("report-summary-total-tasks");
  summaryTotalHours = document.getElementById("report-summary-total-hours");
  summaryAvg = document.getElementById("report-summary-avg");

  exportExcelButton.addEventListener("click", exportExcel);
  exportPdfButton.addEventListener("click", exportPdf);
  exportCsvButton.addEventListener("click", exportCsv);
  printReportButton.addEventListener("click", () => window.print());
}

export function render() {
  const entries = state.getExportEntries();

  summaryPeriod.textContent = computePeriodLabel(entries);
  summaryTotalTasks.textContent = String(entries.length);
  summaryTotalHours.textContent = formatDuration(state.calculateEntriesTotal(entries));
  summaryAvg.textContent =
    entries.length > 0 ? formatDuration(state.calculateEntriesTotal(entries) / entries.length) : "00:00:00";

  renderCategoryDonut(entries, document.getElementById("report-chart-category"));
  renderStatusChart(entries);
}

function renderStatusChart(entries) {
  const container = document.getElementById("report-chart-status");
  const totals = computeTotalsByKey(entries, (entry) => entry.status);

  const labels = Array.from(totals.keys()).map((status) => statusLabel(status));
  const values = Array.from(totals.values()).map((seconds) => Number(formatHoursDecimal(seconds)));
  const colors = Array.from(totals.keys()).map((status) => STATUS_COLOR_VARS[status] || charts.seriesColorVar(0));

  charts.renderBarChart(container, {
    labels,
    values,
    colors,
    formatValue: (value) => `${value.toFixed(1)}ω`,
    emptyMessage: "Δεν υπάρχουν δεδομένα."
  });
}

/* =========================
   Κοινά για exports
========================= */

function todayFileDateKey() {
  return formatDateForInput(new Date());
}

function computePeriodLabel(entries) {
  const active = state.areFiltersActive();
  const scopeLabel = active ? "φιλτραρισμένα αποτελέσματα" : "όλες οι καταχωρήσεις";

  if (entries.length === 0) {
    return `Χωρίς εγγραφές (${scopeLabel})`;
  }

  const sortedDates = entries.map((entry) => entry.date).sort();
  const from = formatShortDate(parseDateInput(sortedDates[0]));
  const to = formatShortDate(parseDateInput(sortedDates[sortedDates.length - 1]));

  return `${from} – ${to} (${scopeLabel})`;
}

function computeTotalsByKey(entries, keyFn) {
  const totals = new Map();

  entries.forEach((entry) => {
    const key = keyFn(entry);
    totals.set(key, (totals.get(key) || 0) + Number(entry.durationSeconds || 0));
  });

  return totals;
}

const loadedScripts = new Set();

function loadScript(src) {
  if (loadedScripts.has(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };

    script.onerror = () => {
      reject(new Error(`Αποτυχία φόρτωσης βιβλιοθήκης: ${src}`));
    };

    document.head.append(script);
  });
}

function buildExportRows(entries) {
  return entries.map((entry) => ({
    Ημερομηνία: entry.date,
    Ημέρα: weekdayName(parseDateInput(entry.date)),
    Task: entry.taskName,
    Κατηγορία: entry.category,
    Status: statusLabel(entry.status),
    "Ώρα έναρξης": entry.startTime,
    "Ώρα λήξης": entry.endTime,
    "Διάρκεια σε ώρες": Number(formatHoursDecimal(entry.durationSeconds)),
    "Διάρκεια σε λεπτά": Math.round(entry.durationSeconds / 60),
    Σημειώσεις: entry.notes || "",
    "Πηγή καταχώρησης": sourceLabel(entry.source)
  }));
}

/* =========================
   Εξαγωγή Excel
========================= */

async function exportExcel() {
  const entries = state.getExportEntries();

  if (entries.length === 0) {
    ui.toast("Δεν υπάρχουν καταχωρήσεις για εξαγωγή.", "error");
    return;
  }

  ui.setButtonLoading(exportExcelButton, true, "Excel…");

  try {
    if (!window.XLSX) {
      await loadScript(XLSX_SRC);
    }

    const rows = buildExportRows(entries);

    const workbook = window.XLSX.utils.book_new();
    const entriesSheet = window.XLSX.utils.json_to_sheet(rows);
    window.XLSX.utils.book_append_sheet(workbook, entriesSheet, "Καταχωρήσεις");

    const totalSeconds = state.calculateEntriesTotal(entries);
    const byCategory = computeTotalsByKey(entries, (entry) => entry.category);
    const byStatus = computeTotalsByKey(entries, (entry) => statusLabel(entry.status));

    const summaryRows = [
      ["My Time Tracker — Summary"],
      [],
      ["Περίοδο αναφοράς", computePeriodLabel(entries)],
      ["Συνολικός αριθμός εγγραφών", entries.length],
      ["Συνολικές ώρες", Number(formatHoursDecimal(totalSeconds))],
      [],
      ["Ώρες ανά κατηγορία"],
      ...Array.from(byCategory.entries()).map(([category, seconds]) => [category, Number(formatHoursDecimal(seconds))]),
      [],
      ["Ώρες ανά status"],
      ...Array.from(byStatus.entries()).map(([status, seconds]) => [status, Number(formatHoursDecimal(seconds))])
    ];

    const summarySheet = window.XLSX.utils.aoa_to_sheet(summaryRows);
    window.XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    window.XLSX.writeFile(workbook, `my-time-tracker-${todayFileDateKey()}.xlsx`);

    ui.toast("Το αρχείο Excel δημιουργήθηκε.", "success");
  } catch (error) {
    console.error(error);
    ui.toast("Η εξαγωγή Excel απέτυχε. Χρειάζεται σύνδεση στο internet.", "error");
  } finally {
    ui.setButtonLoading(exportExcelButton, false);
  }
}

/* =========================
   Εξαγωγή CSV (χωρίς εξωτερική βιβλιοθήκη)
========================= */

function csvEscape(value) {
  const text = String(value === null || value === undefined ? "" : value);

  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportCsv() {
  const entries = state.getExportEntries();

  if (entries.length === 0) {
    ui.toast("Δεν υπάρχουν καταχωρήσεις για εξαγωγή.", "error");
    return;
  }

  const rows = buildExportRows(entries);
  const headers = Object.keys(rows[0]);

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ];

  const csvContent = `﻿${lines.join("\r\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `my-time-tracker-${todayFileDateKey()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  ui.toast("Το αρχείο CSV δημιουργήθηκε.", "success");
}

/* =========================
   Εξαγωγή PDF
========================= */

async function loadGreekFont() {
  if (cachedGreekFont) {
    return cachedGreekFont;
  }

  const response = await fetch(GREEK_FONT_SRC);

  if (!response.ok) {
    throw new Error("Αποτυχία λήψης γραμματοσειράς");
  }

  const text = await response.text();

  const regularMatch = text.match(/"Roboto-Regular\.ttf"\s*:\s*"([A-Za-z0-9+/=]+)"/);
  const boldMatch = text.match(/"Roboto-Medium\.ttf"\s*:\s*"([A-Za-z0-9+/=]+)"/);

  if (!regularMatch) {
    throw new Error("Δεν βρέθηκε γραμματοσειρά Roboto");
  }

  cachedGreekFont = {
    regular: regularMatch[1],
    bold: boldMatch ? boldMatch[1] : regularMatch[1]
  };

  return cachedGreekFont;
}

async function exportPdf() {
  const entries = state.getExportEntries();

  if (entries.length === 0) {
    ui.toast("Δεν υπάρχουν καταχωρήσεις για εξαγωγή.", "error");
    return;
  }

  ui.setButtonLoading(exportPdfButton, true, "PDF…");

  try {
    if (!window.jspdf) {
      await loadScript(JSPDF_SRC);
    }

    if (typeof window.jspdf.jsPDF.API.autoTable !== "function") {
      await loadScript(JSPDF_AUTOTABLE_SRC);
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    let fontFamily = "helvetica";
    let greekFontLoaded = false;

    try {
      const font = await loadGreekFont();

      doc.addFileToVFS("Roboto-Regular.ttf", font.regular);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

      doc.addFileToVFS("Roboto-Bold.ttf", font.bold);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

      fontFamily = "Roboto";
      greekFontLoaded = true;
    } catch (fontError) {
      console.error(fontError);
      ui.toast(
        "Δεν φορτώθηκε γραμματοσειρά για ελληνικά — οι τόνοι ίσως δεν εμφανιστούν σωστά στο PDF.",
        "warning"
      );
    }

    buildPdfDocument(doc, entries, fontFamily);

    const totalPages = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      doc.setPage(pageIndex);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Σελίδα ${pageIndex} από ${totalPages}`, pageWidth / 2, pageHeight - 22, { align: "center" });
    }

    doc.save(`my-time-tracker-${todayFileDateKey()}.pdf`);

    ui.toast(
      greekFontLoaded ? "Το αρχείο PDF δημιουργήθηκε." : "Το PDF δημιουργήθηκε (χωρίς πλήρη υποστήριξη ελληνικών).",
      "success"
    );
  } catch (error) {
    console.error(error);
    ui.toast("Η εξαγωγή PDF απέτυχε. Χρειάζεται σύνδεση στο internet.", "error");
  } finally {
    ui.setButtonLoading(exportPdfButton, false);
  }
}

function buildPdfDocument(doc, entries, fontFamily) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalSeconds = state.calculateEntriesTotal(entries);
  const marginX = 40;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text("My Time Tracker Report", marginX, 50);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);

  const metaLines = [
    `Περίοδος αναφοράς: ${computePeriodLabel(entries)}`,
    `Ημερομηνία δημιουργίας: ${formatShortDate(new Date())}`,
    `Συνολικές ώρες: ${formatHoursDecimal(totalSeconds)} ώρες (${formatDuration(totalSeconds)})`,
    `Συνολικός αριθμός tasks: ${entries.length}`
  ];

  metaLines.forEach((line, index) => {
    doc.text(line, marginX, 74 + index * 16);
  });

  const tableStartY = 74 + metaLines.length * 16 + 16;

  const tableRows = entries.map((entry) => [
    entry.date,
    entry.taskName,
    entry.category,
    statusLabel(entry.status),
    entry.startTime,
    entry.endTime,
    formatHoursDecimal(entry.durationSeconds)
  ]);

  doc.autoTable({
    startY: tableStartY,
    head: [["Ημερομηνία", "Task", "Κατηγορία", "Status", "Από", "Έως", "Ώρες"]],
    body: tableRows,
    styles: { font: fontFamily, fontSize: 9, cellPadding: 5, textColor: [31, 41, 55] },
    headStyles: { font: fontFamily, fontStyle: "bold", fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: marginX, right: marginX, bottom: 40 }
  });

  const byCategory = computeTotalsByKey(entries, (entry) => entry.category);

  const categoryRows = Array.from(byCategory.entries()).map(([category, seconds]) => [
    category,
    `${formatHoursDecimal(seconds)} ώρες`
  ]);

  let categoryTotalsY = doc.lastAutoTable.finalY + 24;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (categoryTotalsY + 40 + categoryRows.length * 20 > pageHeight - 40) {
    doc.addPage();
    categoryTotalsY = 40;
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("Σύνολα ανά κατηγορία", marginX, categoryTotalsY);

  doc.autoTable({
    startY: categoryTotalsY + 10,
    head: [["Κατηγορία", "Ώρες"]],
    body: categoryRows,
    styles: { font: fontFamily, fontSize: 9, cellPadding: 5 },
    headStyles: { font: fontFamily, fontStyle: "bold", fillColor: [17, 24, 39], textColor: 255 },
    margin: { left: marginX, right: marginX, bottom: 40 },
    tableWidth: pageWidth - marginX * 2 > 300 ? 300 : pageWidth - marginX * 2
  });
}
