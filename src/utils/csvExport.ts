/**
 * Utility to export JSON data to CSV
 */
export const exportToCSV = (data: any[], fileName: string) => {
    if (!data || !data.length) return;

    // Get headers from first object keys
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            // Handle strings with commas or newlines
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    // Create blobs and trigger download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
