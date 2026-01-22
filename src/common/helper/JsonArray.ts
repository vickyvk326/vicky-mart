import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';

// Improved types for better performance
type ExportOptions = {
  dateFormat?: string;
  nullValue?: string;
};

class JsonArray<T extends Record<string, any>> {
  private data: T[];

  constructor(
    initialData: T[] = [],
    private logger: (message: string) => void,
  ) {
    // Only clone once at the start if necessary, or just take the reference
    this.data = initialData;
  }

  // OPTIMIZED: Remove structuredClone. Trust the scraper to pass data.
  add(item: T): this {
    this.data.push(item);
    return this;
  }

  addMultiple(items: T[]): this {
    this.data.push(...items);
    return this;
  }

  // Get raw data for performance, or use slice() for a shallow copy
  getArray(): T[] {
    return this.data;
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async exportToExcel(
    filePath: string,
    options: ExportOptions & { sheetName?: string; columns?: Partial<ExcelJS.Column>[] } = {},
  ): Promise<string | undefined> {
    try {
      this.logger(`[INFO] Saving ${this.data.length} rows as XLSX...`);

      // FIX: Added await
      await this.ensureDirectoryExists(filePath);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet 1');

      const headers = Object.keys(this.data[0] || {});
      worksheet.columns = options.columns || headers.map((h) => ({ header: h, key: h }));

      // OPTIMIZED: Use a standard for-loop to avoid closure overhead in large sets
      for (const row of this.data) {
        const formattedRow: Record<string, any> = {};
        for (const key of headers) {
          formattedRow[key] = this.formatCellValue(row[key], options);
        }
        worksheet.addRow(formattedRow);
      }

      await workbook.xlsx.writeFile(filePath);
      return filePath;
    } catch (error) {
      this.logger(`[ERROR] Excel Export Failed: ${error.message}`);
    }
  }

  async exportToCsv(
    filePath: string,
    options: ExportOptions & { header?: string[]; append?: boolean } = {},
  ): Promise<void> {
    try {
      await this.ensureDirectoryExists(filePath);

      const headers = options.header || Object.keys(this.data[0] || {});
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: headers.map((h) => ({ id: h, title: h })),
        append: options.append || false,
      });

      // OPTIMIZED: Avoid .map() + .reduce() nested logic.
      // Write in chunks if data is massive (though csv-writer handles records well)
      const records: Record<string, any>[] = [];
      for (const row of this.data) {
        const rec: Record<string, any> = {};
        for (const key of headers) {
          rec[key] = this.formatCellValue(row[key], options);
        }
        records.push(rec);
      }

      await csvWriter.writeRecords(records);
    } catch (error) {
      this.logger(`[ERROR] CSV Export Failed: ${error.message}`);
    }
  }

  private formatCellValue(value: any, options: ExportOptions): any {
    if (value == null) return options.nullValue || '';
    if (value instanceof Date && options.dateFormat) {
      return value.toLocaleDateString(options.dateFormat);
    }
    return value;
  }

  get count(): number {
    return this.data.length;
  }
}

export default JsonArray;
