const { readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { mkdirSync } = require("node:fs");

const sourcePath = resolve(__dirname, "../docs/API_SYSTEM_DOCUMENTATION.md");
const outputPath = resolve(__dirname, "../docs/API_SYSTEM_DOCUMENTATION.pdf");

const pageWidth = 612;
const pageHeight = 792;
const marginX = 48;
const marginY = 48;
const fontSize = 9;
const leading = 12;
const maxCharsPerLine = 94;
const linesPerPage = Math.floor((pageHeight - marginY * 2) / leading);

function escapePdfText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(line) {
  if (line.length <= maxCharsPerLine) {
    return [line];
  }

  const wrapped = [];
  let remaining = line;

  while (remaining.length > maxCharsPerLine) {
    const slice = remaining.slice(0, maxCharsPerLine + 1);
    const lastSpace = slice.lastIndexOf(" ");
    const breakAt = lastSpace > 20 ? lastSpace : maxCharsPerLine;

    wrapped.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }

  if (remaining.length) {
    wrapped.push(remaining);
  }

  return wrapped;
}

function markdownToLines(markdown) {
  const lines = [];

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine
      .replace(/^#{1,6}\s*/, "")
      .replace(/^- /, "  - ")
      .replace(/\*\*/g, "")
      .replace(/`/g, "");

    lines.push(...wrapLine(line));
  }

  return lines;
}

function chunkLines(lines) {
  const pages = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  return pages;
}

function createContentStream(lines) {
  const commands = [
    "BT",
    `/F1 ${fontSize} Tf`,
    `${marginX} ${pageHeight - marginY} Td`,
    `${leading} TL`,
  ];

  for (const line of lines) {
    commands.push(`(${escapePdfText(line)}) Tj`);
    commands.push("T*");
  }

  commands.push("ET");

  return commands.join("\n");
}

function createPdf(markdown) {
  const pages = chunkLines(markdownToLines(markdown));
  const objects = [];
  const pageObjectIds = [];
  const contentObjectIds = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let objectId = 4;

  for (const pageLines of pages) {
    const pageObjectId = objectId++;
    const contentObjectId = objectId++;
    const content = createContentStream(pageLines);

    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(contentObjectId);

    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] =
      `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`;
  }

  objects[2] =
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] ` +
    `/Count ${pageObjectIds.length} >>`;

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(chunks.join(""), "utf8");
    chunks.push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length}\n`);
  chunks.push("0000000000 65535 f \n");

  for (let id = 1; id < objects.length; id++) {
    chunks.push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return chunks.join("");
}

mkdirSync(dirname(outputPath), { recursive: true });
const markdown = readFileSync(sourcePath, "utf8");
writeFileSync(outputPath, createPdf(markdown), "utf8");
console.log(outputPath);
