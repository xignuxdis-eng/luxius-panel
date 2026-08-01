const { parse } = require('path');
const fs = require('fs');

const materiales = [
    {
        id: 1,
        codigo: "VIN-ML-TEST",
        descripcion: "Vinilo de Prueba ML",
        tipoCobro: "ml",
        bobinas: [
            { ancho: 1.05, precioML: 1200 },
            { ancho: 1.37, precioML: 1500 }
        ]
    }
];

const calculateOrderSubtotal = (orderItem) => {
    const mat = materiales.find(m => m.codigo === orderItem.material);
    if (!mat) throw new Error(`Material no encontrado: ${orderItem.material}`);
    const h = parseFloat(orderItem.alto) || 0;
    const w = parseFloat(orderItem.ancho) || 0;
    const c = parseInt(orderItem.copias) || 0;

    const MARGIN = 0.01;
    const options = [];
    mat.bobinas.forEach(bobina => {
        const usefulWidth = bobina.ancho - MARGIN;
        if (w <= usefulWidth) options.push({ cost: h * c * bobina.precioML, unitPrice: bobina.precioML, rotated: false, bobina: bobina.ancho });
        if (h <= usefulWidth) options.push({ cost: w * c * bobina.precioML, unitPrice: bobina.precioML, rotated: true, bobina: bobina.ancho });
    });
    if (options.length === 0) throw new Error('Excede ancho máximo / Requiere panelizado');
    const bestOption = options.sort((a, b) => a.cost - b.cost)[0];
    return { subtotal: Math.round(bestOption.cost), unitPrice: bestOption.unitPrice, detail: bestOption };
};

const runTest = (name, item, expectedSubtotal, expectedRotated) => {
    try {
        const result = calculateOrderSubtotal(item);
        const pass = result.subtotal === expectedSubtotal && (expectedRotated === undefined || result.detail.rotated === expectedRotated);
        console.log(`${pass ? '✅' : '❌'} ${name}: Result=${result.subtotal}, Expected=${expectedSubtotal} (Rotated: ${result.detail?.rotated})`);
    } catch (e) {
        if (expectedSubtotal === 'error') {
            console.log(`✅ ${name}: Expected error caught: ${e.message}`);
        } else {
            console.log(`❌ ${name}: Unexpected error: ${e.message}`);
        }
    }
};

console.log("--- Final Testing ml Pricing Logic ---");

// 1. Fits in small bobbin without rotation
runTest("Small file (no rotation)", { material: "VIN-ML-TEST", ancho: 0.5, alto: 0.5, copias: 1 }, 600, false);

// 2. Rotate to fit small bobbin (Cheaper than large)
// Item: 1.041 x 0.9
// Bobina 1.37 ($1500): W=1.041 (Fits) -> 0.9 * 1500 = 1350
// Bobina 1.05 ($1200): W=1.041 (Fail), H=0.9 (Fits) -> 1.041 * 1200 = 1249.2 -> 1249
runTest("Rotate to fit small bobbin", { material: "VIN-ML-TEST", ancho: 1.041, alto: 0.9, copias: 1 }, 1249, true);

// 3. Select larger bobbin (cheaper than rotating)
// Item: 1.3 x 0.5
// Bobina 1.05 ($1200): Rotate -> 1.3 * 1200 = 1560
// Bobina 1.37 ($1500): 0.5 * 1500 = 750 (Better)
runTest("Select larger bobbin (cheaper)", { material: "VIN-ML-TEST", ancho: 1.3, alto: 0.5, copias: 1 }, 750, false);
