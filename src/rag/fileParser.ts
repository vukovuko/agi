import { readFile } from "node:fs/promises";
import { extname } from "node:path";

export interface ParseResult {
  text: string;
  pageCount: number;
}

const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xlsx",
  ".xls",
];

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(extname(filePath).toLowerCase());
}

export function getSupportedExtensions(): string[] {
  return SUPPORTED_EXTENSIONS;
}

export async function parseFile(filePath: string): Promise<ParseResult> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePdf(filePath);
    case ".xlsx":
    case ".xls":
      return parseExcel(filePath);
    case ".csv":
    case ".txt":
    case ".md":
    case ".json":
      return parseText(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parsePdf(filePath: string): Promise<ParseResult> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return { text: result.text, pageCount: result.total };
}

async function parseText(filePath: string): Promise<ParseResult> {
  const text = await readFile(filePath, "utf-8");
  return { text, pageCount: 1 };
}

async function parseExcel(filePath: string): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`--- ${sheetName} ---\n${csv}`);
  }

  return { text: sheets.join("\n\n"), pageCount: workbook.SheetNames.length };
}
