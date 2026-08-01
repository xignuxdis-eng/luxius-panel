const fs = require('fs');
const path = require('path');

// Mocking readCollection as used in server
const DATA_DIR = 'f:/Backup sistema Imprima/luxius_project/server/data';
function readCollection(name) {
    try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
    } catch (e) {
        return [];
    }
}

// Emulating the logic added to server/index.js
const stats = readCollection('printer_stats');
const orders = readCollection('ordenes');
const materiales = readCollection('materiales');

const intelligence = {
    // 1. Stock Forecast
    stockForecast: materiales.filter(m => m.habilitado !== false).map(m => {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const recentLogs = stats.filter(s => s.material === m.nombre && new Date(s.startTime) >= last30Days);
        const totalConsumed = recentLogs.reduce((sum, s) => sum + (s.sizeM2 || 0), 0);
        const avgDaily = totalConsumed / 30;
        const daysRemaining = avgDaily > 0 ? Math.floor((m.stockActual || 0) / avgDaily) : 999;
        return {
            material: m.nombre,
            stockActual: m.stockActual,
            avgDaily: parseFloat(avgDaily.toFixed(3)),
            daysRemaining,
            status: daysRemaining < 7 ? 'danger' : (daysRemaining < 15 ? 'warning' : 'success')
        };
    }).filter(m => m.avgDaily > 0).sort((a, b) => a.daysRemaining - b.daysRemaining),

    // 2. Efficiency
    efficiencyByMaterial: Object.entries(stats.reduce((acc, s) => {
        const mat = s.material || 'Otro';
        if (!acc[mat]) acc[mat] = { sold: 0, printed: 0 };
        acc[mat].printed += s.sizeM2 || 0;
        const order = orders.find(o => o.id === s.orderId);
        if (order) acc[mat].sold += order.consumoEstimado || 0;
        return acc;
    }, {})).map(([name, d]) => {
        const eff = d.printed > 0 ? (d.sold / d.printed) * 100 : 0;
        return {
            name,
            efficiency: parseFloat(eff.toFixed(1)),
            status: eff > 95 ? 'success' : (eff > 90 ? 'warning' : 'danger')
        };
    }).sort((a, b) => a.efficiency - b.efficiency),

    // 3. Leakage
    leakage: Object.entries(stats.reduce((acc, s) => {
        if (!s.orderId) return acc;
        if (!acc[s.orderId]) acc[s.orderId] = [];
        acc[s.orderId].push(s);
        return acc;
    }, {})).map(([id, logs]) => {
        const order = orders.find(o => String(o.id) === id);
        const printedM2 = logs.reduce((sum, l) => sum + l.sizeM2, 0);
        const soldM2 = order ? (order.consumoEstimado || 0) : 0;
        const overprintRatio = soldM2 > 0 ? (printedM2 - soldM2) / soldM2 : 0;
        return {
            ot: `OT-${id}`,
            overprintRatio: parseFloat((overprintRatio * 100).toFixed(1)),
            events: logs.length,
            isLeakage: logs.length > 1 && overprintRatio > 0.1
        };
    }).filter(l => l.isLeakage).sort((a, b) => b.overprintRatio - a.overprintRatio),

    // 4. Profitability
    profitability: Object.entries(orders.reduce((acc, o) => {
        const c = o.clienteNombre || 'Genérico';
        if (!acc[c]) acc[c] = { billing: 0, printed: 0 };
        acc[c].billing += o.subtotal || 0;
        const orderLogs = stats.filter(s => s.orderId === o.id);
        acc[c].printed += orderLogs.reduce((sum, l) => sum + l.sizeM2, 0);
        return acc;
    }, {})).map(([name, d]) => ({
        name,
        index: d.printed > 0 ? parseFloat((d.billing / d.printed).toFixed(2)) : 0,
        billing: d.billing
    })).filter(c => c.index > 0).sort((a, b) => b.index - a.index).slice(0, 10)
};

console.log(JSON.stringify(intelligence, null, 2));
