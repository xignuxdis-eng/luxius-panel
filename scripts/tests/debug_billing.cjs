const fs = require('fs');
const path = require('path');

function debugBilling() {
    const ordenesPath = path.join(__dirname, 'server', 'data', 'ordenes.json');
    const orders = JSON.parse(fs.readFileSync(ordenesPath, 'utf8'));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const clientBilling = {};
    const details = [];
    thisMonthOrders.forEach(o => {
        const cName = o.clienteNombre || o.cliente || (o.clientId ? `Cliente ${o.clientId}` : "Desconocido");
        clientBilling[cName] = (clientBilling[cName] || 0) + (o.subtotal || 0);
        details.push({ id: o.id, subtotal: o.subtotal, cName, rawName: o.clienteNombre });
    });

    console.log("Client Billing Summary:");
    console.log(JSON.stringify(clientBilling, null, 2));

    console.log("\nOrder Details:");
    details.forEach(d => console.log(`OT-${d.id}: $${d.subtotal} -> ${d.cName} (Raw: ${d.rawName})`));
}

debugBilling();
