const fs = require('fs');
const path = require('path');

function checkData() {
    const ordenesPath = path.join(__dirname, 'server', 'data', 'ordenes.json');
    const ordenes = JSON.parse(fs.readFileSync(ordenesPath, 'utf8'));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthOrders = ordenes.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    console.log(`Total orders this month: ${thisMonthOrders.length}`);
    thisMonthOrders.forEach(o => {
        console.log(`Order ${o.id}: clienteNombre=${o.clienteNombre}, cliente=${o.cliente}, clientId=${o.clientId}, subtotal=${o.subtotal}`);
        const cName = o.clienteNombre || o.cliente || (o.clientId ? `Cliente ${o.clientId}` : "Desconocido");
        console.log(`  -> resolved name: ${cName}`);
    });
}

checkData();
