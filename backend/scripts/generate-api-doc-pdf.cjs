const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const sourcePath = resolve(__dirname, "../docs/API_SYSTEM_DOCUMENTATION.md");
const outputPath = resolve(__dirname, "../docs/API_SYSTEM_DOCUMENTATION.pdf");

const pageWidth = 612;
const pageHeight = 792;
const marginX = 48;
const marginTop = 54;
const marginBottom = 48;
const contentWidth = pageWidth - marginX * 2;

const fonts = {
  regular: { id: 3, name: "Helvetica" },
  bold: { id: 4, name: "Helvetica-Bold" },
  mono: { id: 5, name: "Courier" },
};

function escapePdfText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function textWidth(text, fontSize, mono = false) {
  return text.length * fontSize * (mono ? 0.6 : 0.52);
}

function wrapText(text, fontSize, mono = false, indent = 0) {
  const maxWidth = contentWidth - indent;

  if (!text.trim()) {
    return [""];
  }

  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (textWidth(candidate, fontSize, mono) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function parseMarkdown(markdown) {
  const blocks = [];
  let inCode = false;

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(/\t/g, "  ");

    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      blocks.push({
        type: "code",
        text: line || " ",
      });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);

    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      continue;
    }

    if (line.startsWith("- ")) {
      blocks.push({
        type: "bullet",
        text: line.slice(2),
      });
      continue;
    }

    blocks.push({
      type: line.trim() ? "paragraph" : "blank",
      text: line,
    });
  }

  return blocks;
}

function blockStyle(block) {
  if (block.type === "heading") {
    if (block.level === 1) {
      return { font: fonts.bold, size: 18, leading: 24, before: 0, after: 12 };
    }

    if (block.level === 2) {
      return { font: fonts.bold, size: 14, leading: 19, before: 10, after: 6 };
    }

    return { font: fonts.bold, size: 11, leading: 15, before: 7, after: 3 };
  }

  if (block.type === "code") {
    return { font: fonts.mono, size: 8.5, leading: 11, before: 0, after: 0, indent: 10 };
  }

  if (block.type === "bullet") {
    return { font: fonts.regular, size: 9.5, leading: 13, before: 1, after: 1, indent: 16 };
  }

  if (block.type === "blank") {
    return { font: fonts.regular, size: 9.5, leading: 9, before: 0, after: 0 };
  }

  return { font: fonts.regular, size: 9.5, leading: 13, before: 1, after: 2 };
}

function layoutBlocks(blocks) {
  const pages = [];
  let page = [];
  let y = pageHeight - marginTop;

  function addPage() {
    pages.push(page);
    page = [];
    y = pageHeight - marginTop;
  }

  for (const block of blocks) {
    const style = blockStyle(block);
    const mono = style.font === fonts.mono;
    const indent = style.indent ?? 0;
    const prefix = block.type === "bullet" ? "- " : "";
    const wrapIndent = block.type === "bullet" ? indent + 10 : indent;
    const text = block.type === "bullet" ? block.text : block.text.replace(/\*\*/g, "").replace(/`/g, "");
    const lines = wrapText(text, style.size, mono, wrapIndent);
    const blockHeight = style.before + lines.length * style.leading + style.after;

    if (y - blockHeight < marginBottom && page.length) {
      addPage();
    }

    y -= style.before;

    for (let index = 0; index < lines.length; index += 1) {
      const linePrefix = index === 0 ? prefix : "";
      page.push({
        x: marginX + indent,
        y,
        text: `${linePrefix}${lines[index]}`,
        font: style.font,
        size: style.size,
      });
      y -= style.leading;
    }

    y -= style.after;
  }

  if (page.length) {
    pages.push(page);
  }

  return pages;
}

function createTextCommand(item) {
  return [
    "BT",
    `/F${item.font.id} ${item.size} Tf`,
    `${item.x.toFixed(2)} ${item.y.toFixed(2)} Td`,
    `(${escapePdfText(item.text)}) Tj`,
    "ET",
  ].join("\n");
}

function createPageContent(items, pageNumber, pageCount) {
  const commands = [];

  for (const item of items) {
    commands.push(createTextCommand(item));
  }

  commands.push(
    createTextCommand({
      x: marginX,
      y: 28,
      text: "Vishwavrinda Ayurveda API Documentation",
      font: fonts.regular,
      size: 8,
    })
  );
  commands.push(
    createTextCommand({
      x: pageWidth - marginX - 58,
      y: 28,
      text: `Page ${pageNumber} of ${pageCount}`,
      font: fonts.regular,
      size: 8,
    })
  );

  return commands.join("\n");
}

function createPdf(markdown) {
  const pages = layoutBlocks(parseMarkdown(markdown));
  const objects = [];
  const pageObjectIds = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[fonts.regular.id] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[fonts.bold.id] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[fonts.mono.id] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let objectId = 6;

  pages.forEach((pageItems, pageIndex) => {
    const pageObjectId = objectId++;
    const contentObjectId = objectId++;
    const content = createPageContent(pageItems, pageIndex + 1, pages.length);

    pageObjectIds.push(pageObjectId);
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F3 3 0 R /F4 4 0 R /F5 5 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] =
      `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`;
  });

  objects[2] =
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] ` +
    `/Count ${pageObjectIds.length} >>`;

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(chunks.join(""), "utf8");
    chunks.push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length}\n`);
  chunks.push("0000000000 65535 f \n");

  for (let id = 1; id < objects.length; id += 1) {
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
