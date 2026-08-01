/**
 * Printer Log Parser Utility
 * Parses XML event logs from Roland VersaWorks and extracts key metrics.
 */

function parseXmlNode(xml, nodeName) {
    const regex = new RegExp(`<${nodeName}>(.*?)</${nodeName}>`, 's');
    const match = xml.match(regex);
    return match ? match[1] : null;
}

function parseSpanishNode(xml, nodeName) {
    const parent = parseXmlNode(xml, nodeName);
    if (!parent) return null;
    const match = parent.match(/<Spanish>(.*?)<\/Spanish>/);
    return match ? match[1] : null;
}

function parseDate(xml, nodeName) {
    const node = parseXmlNode(xml, nodeName);
    if (!node) return null;

    const year = parseInt(parseXmlNode(node, 'year'));
    if (!year || year === 0) return null;

    const month = parseInt(parseXmlNode(node, 'month')) - 1;
    const day = parseInt(parseXmlNode(node, 'day'));
    const hour = parseInt(parseXmlNode(node, 'hour'));
    const minute = parseInt(parseXmlNode(node, 'minute'));
    const second = parseInt(parseXmlNode(node, 'second'));

    return new Date(year, month, day, hour, minute, second).toISOString();
}

function parseLogs(xmlContent) {
    const items = [];
    // Split by EventLogItem
    const itemRegex = /<EventLogItem>(.*?)<\/EventLogItem>/gs;
    let match;

    while ((match = itemRegex.exec(xmlContent)) !== null) {
        const itemXml = match[1];
        const jobName = parseXmlNode(itemXml, 'strJobName') || '';

        // Extract orderId from jobName (format: ID_filename or ID-filename)
        // Compatibility: Matches ID prefix before any technical or client suffix (---REF_CLIENTE---)
        const orderIdMatch = jobName.match(/^(?:OT-)?(\d+)[_-]/i);
        const orderId = orderIdMatch ? parseInt(orderIdMatch[1]) : null;

        const eventId = parseXmlNode(itemXml, 'eventID');

        // CRITICAL FIX: Only process successful print completion (Event ID 25)
        // IDs like 24 (RIP) contain preliminary estimates and cause data duplication.
        if (eventId !== '25') continue;

        // Check for error codes
        const errorCode = parseXmlNode(itemXml, 'dwErrorCode');
        if (errorCode !== '0' && errorCode !== null) continue;

        const inkVolumes = [];
        const inkVolumeNode = parseXmlNode(itemXml, 'afConsumptionInkVolume_nl');
        if (inkVolumeNode) {
            const volRegex = /<value\d+>(.*?)<\/value\d+>/g;
            let volMatch;
            while ((volMatch = volRegex.exec(inkVolumeNode)) !== null) {
                // Convert nanoliters to milliliters (1 ml = 1,000,000 nl)
                inkVolumes.push(parseFloat(volMatch[1]) / 1000000);
            }
        }

        const printSizeX = parseFloat(parseXmlNode(parseXmlNode(itemXml, 'printSize_mm') || '', 'x')) || 0;
        const printSizeY = parseFloat(parseXmlNode(parseXmlNode(itemXml, 'printSize_mm') || '', 'y')) || 0;
        const sizeM2 = (printSizeX * printSizeY) / 1000000;

        const startTime = parseDate(itemXml, 'printStartTime');
        const endTime = parseDate(itemXml, 'printCompleteTime');

        let durationMinutes = 0;
        if (startTime && endTime && startTime.startsWith('20') && endTime.startsWith('20')) {
            durationMinutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
        }

        // Only include if it has actual production data
        if (sizeM2 > 0) {
            items.push({
                jobName,
                orderId,
                machine: parseXmlNode(itemXml, 'strNickName'),
                material: parseSpanishNode(itemXml, 'strMediaName') || 'Desconocido',
                copyCount: parseInt(parseXmlNode(itemXml, 'nCopyCount')) || 1,
                sizeM2: parseFloat(sizeM2.toFixed(4)),
                ink: {
                    c: parseFloat((inkVolumes[1] || 0).toFixed(4)),
                    m: parseFloat((inkVolumes[2] || 0).toFixed(4)),
                    y: parseFloat((inkVolumes[3] || 0).toFixed(4)),
                    k: parseFloat((inkVolumes[0] || 0).toFixed(4))
                },
                startTime,
                endTime,
                durationMinutes: parseFloat(durationMinutes.toFixed(2))
            });
        }
    }

    return items;
}

module.exports = { parseLogs };
