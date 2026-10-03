import jsPDF from "jspdf";

import refrigerationLogo from "../assets/logo1.png?inline";
import blueStarLogo from "../assets/bluelogo.png?inline";

const COLORS = {
  ink: [31, 41, 55],
  muted: [100, 116, 139],
  navy: [24, 48, 79],
  border: [203, 213, 225],
  stripe: [247, 249, 252],
  highlight: [232, 240, 248],
  headerPink: [240, 228, 236],
  titleBlue: [200, 222, 246],
  white: [255, 255, 255],
};
const PAGE_MARGIN = 16;

const getCellText = (cell, uppercase = false) => {
  const text = (cell.innerText || cell.textContent || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return uppercase ? text.toUpperCase() : text;
};

const fitImageToBox = (imageWidth, imageHeight, boxWidth, boxHeight) => {
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  return { width: imageWidth * scale, height: imageHeight * scale };
};

const readTable = (table) => {
  const header = table.querySelector("thead tr");
  if (!header) throw new Error("A quotation table is missing its header row.");

  const headers = Array.from(header.cells, (cell) => ({
    text: getCellText(cell),
    className: cell.className,
  }));
  const rows = Array.from(table.querySelectorAll("tbody tr")).map((row) => ({
    className: row.className,
    cells: Array.from(row.cells).map((cell) => ({
      text: getCellText(cell, true),
      span: cell.colSpan || 1,
      className: cell.className,
    })),
  }));

  return { headers, rows };
};

const getColumnWidthLimits = (header, contentWidth) => {
  const className = header.className;
  const label = header.text.toLowerCase();
  if (className.includes("col-particular") || label.includes("particular")) {
    return { min: 40, max: contentWidth * 0.66 };
  }
  if (className.includes("col-action") || label.includes("action")) {
    return { min: 14, max: 20 };
  }
  if (className.includes("col-sr") || label.includes("sr")) {
    return { min: 13, max: 20 };
  }
  if (className.includes("col-annexure") || label.includes("annexure")) {
    return { min: 20, max: 30 };
  }
  if (className.includes("col-tr") || label.includes("tr")) {
    return { min: 20, max: 32 };
  }
  if (className.includes("col-qty") || label.includes("qty")) {
    return { min: 20, max: 34 };
  }
  if (
    className.includes("col-rate") ||
    className.includes("col-total") ||
    label.includes("rate") ||
    label.includes("total")
  ) {
    return { min: 25, max: 42 };
  }
  return { min: 22, max: 40 };
};

const calculateColumnWidths = (pdf, headers, rows, contentWidth) => {
  const columns = headers.map((header, columnIndex) => {
    const limits = getColumnWidthLimits(header, contentWidth);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    let demand = pdf.getTextWidth(header.text) + 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    rows.forEach((row) => {
      if (row.cells.length !== headers.length) return;
      const cell = row.cells[columnIndex];
      if (!cell || cell.span !== 1) return;
      const textWidth = cell.text
        .split(/\r?\n/)
        .reduce((width, line) => Math.max(width, pdf.getTextWidth(line)), 0);
      demand = Math.max(demand, textWidth + 8);
    });

    return {
      min: limits.min,
      max: limits.max,
      desired: Math.min(limits.max, Math.max(limits.min, demand)),
    };
  });

  const minTotal = columns.reduce((total, column) => total + column.min, 0);
  if (minTotal >= contentWidth) {
    return columns.map((column) => (column.min / minTotal) * contentWidth);
  }

  const widths = columns.map((column) => column.min);
  let remaining = contentWidth - minTotal;
  let activeColumns = columns
    .map((column, index) => ({ ...column, index }))
    .filter((column) => column.max > column.min);

  while (remaining > 0.01 && activeColumns.length > 0) {
    const totalWeight = activeColumns.reduce(
      (total, column) =>
        total + Math.max(1, column.desired - column.min) * (column.index === 1 ? 2 : 1),
      0,
    );
    let allocated = 0;
    activeColumns = activeColumns.filter((column) => {
      const weight =
        Math.max(1, column.desired - column.min) * (column.index === 1 ? 2 : 1);
      const share = remaining * (weight / totalWeight);
      const addition = Math.min(column.max - widths[column.index], share);
      widths[column.index] += addition;
      allocated += addition;
      return column.max - widths[column.index] > 0.01;
    });
    remaining -= allocated;
    if (allocated < 0.01) break;
  }

  if (remaining > 0) {
    const descriptionIndex = headers.findIndex(
      (header) =>
        header.className.includes("col-particular") ||
        header.text.toLowerCase().includes("particular"),
    );
    if (descriptionIndex >= 0) widths[descriptionIndex] += remaining;
  }

  const widthTotal = widths.reduce((total, width) => total + width, 0);
  widths[widths.length - 1] += contentWidth - widthTotal;
  return widths;
};

const getRowCellGeometry = (row, widths, x) => {
  const rowCells = [];
  let columnIndex = 0;

  row.cells.forEach((cell) => {
    const span = Math.min(cell.span, widths.length - columnIndex);
    if (span <= 0) return;
    const width = widths
      .slice(columnIndex, columnIndex + span)
      .reduce((sum, value) => sum + value, 0);
    rowCells.push({
      ...cell,
      x:
        x + widths.slice(0, columnIndex).reduce((sum, value) => sum + value, 0),
      width,
    });
    columnIndex += span;
  });
  return rowCells;
};

const getRowHeight = (pdf, row, widths, x) => {
  const cells = getRowCellGeometry(row, widths, x);
  const lineHeight = 3.7;
  const paddingX = 2.4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const cellLines = cells.map((cell) =>
    pdf.splitTextToSize(cell.text, Math.max(cell.width - paddingX * 2, 8)),
  );
  const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
  return Math.max(8, lineCount * lineHeight + 4);
};

const drawTableHeader = (pdf, headers, widths, x, y, rowHeight) => {
  let cellX = x;
  headers.forEach((_, index) => {
    const width = widths[index];
    pdf.setFillColor(...COLORS.headerPink);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.25);
    pdf.rect(cellX, y, width, rowHeight, "FD");
    cellX += width;
  });

  cellX = x;
  pdf.setTextColor(...COLORS.navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  headers.forEach((label, index) => {
    const width = widths[index];
    const lines = pdf.splitTextToSize(label.text, width - 4);
    const textY = y + (rowHeight - lines.length * 4) / 2 + 3.2;
    const align = getCellAlignment(label.className, label.text, true);
    const textX =
      align === "left" ? cellX + 2
      : align === "right" ? cellX + width - 2
      : cellX + width / 2;
    pdf.text(lines, textX, textY, { align });
    cellX += width;
  });
  pdf.setTextColor(...COLORS.ink);
  return y + rowHeight;
};

const getCellAlignment = (className, text, isHeader = false) => {
  if (isHeader) {
    return className.includes("col-particular") ||
      text.toLowerCase().includes("particular")
      ? "left"
      : "center";
  }
  if (className.includes("text-right")) return "right";
  if (
    className.includes("col-total") ||
    className.includes("col-rate")
  ) {
    return "right";
  }
  if (
    className.includes("col-qty") ||
    className.includes("col-tr") ||
    className.includes("col-sr") ||
    className.includes("col-annexure") ||
    className.includes("col-action") ||
    className.includes("empty-row")
  ) {
    return "center";
  }
  if (
    text.toLowerCase().includes("particular") ||
    className.includes("col-particular")
  ) {
    return "left";
  }
  return "left";
};

const drawRow = (
  pdf,
  row,
  widths,
  x,
  y,
  pageBottom,
  startNewPage,
  rowIndex,
) => {
  const paddingX = 2.4;
  const lineHeight = 3.7;
  const rowCells = getRowCellGeometry(row, widths, x);
  const cellLines = rowCells.map((cell) =>
    pdf.splitTextToSize(cell.text, Math.max(cell.width - paddingX * 2, 8)),
  );
  const rowHeight = getRowHeight(pdf, row, widths, x);

  if (y + rowHeight > pageBottom) {
    y = startNewPage();
  }

  const isGrandTotal = row.className.includes("row-grand");
  const isSubtotal =
    row.className.includes("row-subtotal") || row.className.includes("row-gst");
  const fill =
    isGrandTotal ? COLORS.highlight
    : isSubtotal ? [241, 245, 249]
    : null;

  rowCells.forEach((cell, index) => {
    if (fill) {
      pdf.setFillColor(...fill);
      pdf.rect(cell.x, y, cell.width, rowHeight, "F");
    } else if (rowIndex % 2 === 1) {
      pdf.setFillColor(...COLORS.stripe);
      pdf.rect(cell.x, y, cell.width, rowHeight, "F");
    }

    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.rect(cell.x, y, cell.width, rowHeight);
    pdf.setFont("helvetica", isGrandTotal || isSubtotal ? "bold" : "normal");
    pdf.setFontSize(isGrandTotal ? 8.5 : 8);
    pdf.setTextColor(...COLORS.ink);

    const align = getCellAlignment(cell.className, cell.text);
    const textX =
      align === "right" ? cell.x + cell.width - paddingX
      : align === "center" ? cell.x + cell.width / 2
      : cell.x + paddingX;
    const lines = cellLines[index];
    const textY = y + (rowHeight - lines.length * lineHeight) / 2 + 2.8;
    pdf.text(lines, textX, textY, { align, lineHeightFactor: 1.15 });
  });

  return y + rowHeight;
};

const drawPageHeading = (
  pdf,
  pageWidth,
  logos = {},
  logoSizes = {
    left: { width: 25, height: 25 },
    right: { width: 42, height: 18 },
  },
) => {
  const barHeight = 31;
  const barY = PAGE_MARGIN;

  // Place the existing left logo on the right side of the header.
  if (logos.left) {
    const { width, height } = logoSizes.left;
    pdf.addImage(
      logos.left,
      "PNG",
      pageWidth - PAGE_MARGIN - 2 - width,
      barY + (barHeight - height) / 2,
      width,
      height,
      undefined,
      "FAST",
    );
  }

  // Place the uploaded/default right logo on the left side, preserving its aspect ratio.
  if (logos.right?.data) {
    const imageSize = fitImageToBox(
      logos.right.width,
      logos.right.height,
      logoSizes.right.width,
      logoSizes.right.height,
    );
    pdf.addImage(
      logos.right.data,
      logos.right.format,
      PAGE_MARGIN + 2 + (logoSizes.right.width - imageSize.width) / 2,
      barY + (barHeight - imageSize.height) / 2,
      imageSize.width,
      imageSize.height,
      undefined,
      "FAST",
    );
  }

  pdf.setTextColor(...COLORS.navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  // pdf.text("PROJECT QUOTATION", pageWidth / 2, barY + 13, {
  //   align: "center",
  // });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.muted);
  // pdf.text("BlueStar 27.5 TR", pageWidth / 2, barY + 20, {
  //   align: "center",
  // });

  return barY + barHeight + 1;
};

const drawSectionHeading = (pdf, title, subtitle, pageWidth, y) => {
  const bandHeight = 8;
  const bandWidth = pageWidth - PAGE_MARGIN * 2;
  pdf.setFillColor(...COLORS.titleBlue);
  pdf.rect(PAGE_MARGIN, y, bandWidth, bandHeight, "F");
  pdf.setTextColor(...COLORS.navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text(title, pageWidth / 2, y + 5.4, { align: "center" });
  pdf.setTextColor(...COLORS.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  const subtitleLines = pdf.splitTextToSize(
    subtitle,
    pageWidth - PAGE_MARGIN * 2,
  );
  const subtitleY = y + bandHeight + 4;
  pdf.text(subtitleLines, pageWidth / 2, subtitleY, { align: "center" });
  return subtitleY + subtitleLines.length * 3.5 + 2;
};

export const downloadElementsAsPdf = async (
  elements,
  filename = "quotation.pdf",
  options = {},
) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error("At least one quotation page is required to export a PDF.");
  }

  const {
    companyLogo = null,
    logos = {
      left: refrigerationLogo,
      right: {
        data: blueStarLogo,
        format: "PNG",
        width: 346,
        height: 117,
      },
    },
    logoSizes = {
      left: { width: 25, height: 25 },
      right: { width: 42, height: 18 },
    },
  } = options;
  const pageLogos = {
    ...logos,
    right: companyLogo
      ? {
          data: companyLogo.dataUrl,
          format: companyLogo.format,
          width: companyLogo.width,
          height: companyLogo.height,
        }
      : logos.right,
  };

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const pageBottom = pageHeight - PAGE_MARGIN - 10;
  const getSectionHeadingHeight = (subtitle) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    const lines = pdf.splitTextToSize(subtitle, contentWidth);
    return 14 + lines.length * 3.5;
  };
  const newPage = () => {
    pdf.addPage("a4", "portrait");
    return drawPageHeading(pdf, pageWidth, pageLogos, logoSizes);
  };
  const readSection = (element, index) => {
    if (
      typeof HTMLElement !== "undefined" &&
      !(element instanceof HTMLElement)
    ) {
      throw new TypeError(
        `Quotation page ${index + 1} is not a valid HTML element.`,
      );
    }
    const title = element.querySelector(".quote-header")?.textContent?.trim();
    const subtitleElement = element.querySelector(".quote-subheader");
    const subtitleInput = subtitleElement?.querySelector("input");
    const subtitle =
      subtitleInput ?
        subtitleInput.value
      : subtitleElement?.textContent?.trim() || "";
    const table = element.querySelector(".quote-table");
    if (!title || !subtitleElement || !table) {
      throw new Error(
        `Quotation page ${index + 1} is missing its title, subtitle, or table.`,
      );
    }
    return { title, subtitle, table };
  };

  let y = drawPageHeading(pdf, pageWidth, pageLogos, logoSizes);
  const firstSectionY = y;

  for (let index = 0; index < elements.length; index += 1) {
    const { title, subtitle, table } = readSection(elements[index], index);
    const { headers, rows } = readTable(table);
    const widths = calculateColumnWidths(pdf, headers, rows, contentWidth);
    const sectionHeight =
      getSectionHeadingHeight(subtitle) +
      11 +
      rows.reduce(
        (height, row) => height + getRowHeight(pdf, row, widths, PAGE_MARGIN),
        0,
      ) +
      6;

    if (y + sectionHeight > pageBottom && y > firstSectionY) {
      y = newPage();
    }

    const drawActiveSectionHeading = (startY) =>
      drawSectionHeading(pdf, title, subtitle, pageWidth, startY);
    y = drawActiveSectionHeading(y);

    if (y + getSectionHeadingHeight(subtitle) + 11 + 8 > pageBottom) {
      y = newPage();
      y = drawActiveSectionHeading(y);
    }

    y = drawTableHeader(pdf, headers, widths, PAGE_MARGIN, y, 11);
    const startNewPage = () => {
      let nextY = newPage();
      nextY = drawActiveSectionHeading(nextY);
      return drawTableHeader(pdf, headers, widths, PAGE_MARGIN, nextY, 11);
    };

    for (const [rowIndex, row] of rows.entries()) {
      y = drawRow(
        pdf,
        row,
        widths,
        PAGE_MARGIN,
        y,
        pageBottom,
        startNewPage,
        rowIndex,
      );
    }
    y += 6;
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(
      PAGE_MARGIN,
      pageHeight - PAGE_MARGIN,
      pageWidth - PAGE_MARGIN,
      pageHeight - PAGE_MARGIN,
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.muted);

    pdf.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - PAGE_MARGIN,
      pageHeight - PAGE_MARGIN + 5,
      { align: "right" },
    );
  }

  // ✅ Open in a new browser tab (no download)
  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob) + "#view=FitH";
  window.open(pdfUrl, "_blank");

  // Free the blob URL once the new tab has loaded it
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);

  void filename;
};

export const generateQuotation = async (pages) => {
  await downloadElementsAsPdf(pages, "quotation.pdf", {
    logos: {
      left: refrigerationLogo,
      right: {
        data: blueStarLogo,
        format: "PNG",
        width: 346,
        height: 117,
      },
    },
    logoSizes: {
      left: { width: 25, height: 25 },
      right: { width: 42, height: 18 },
    },
  });
};
