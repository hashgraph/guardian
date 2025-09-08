export const parseCsv = (data: string) => {
  const lines = data.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const records = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = values[i] ?? '';
    });

    return record;
  });

  return records;
}