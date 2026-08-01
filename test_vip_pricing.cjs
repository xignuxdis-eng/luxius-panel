// Use built-in fetch (Node.js 18+)

const API_URL = 'http://localhost:5000/api';

async function testVipPricing() {
    console.log('--- TEST: GRANULAR VIP PRICING SYSTEM ---');

    // 1. Create a Test Client with Granular Prices
    const testClient = {
        id: 9999,
        nombre: 'CLIENTE TEST GRANULAR',
        empresa: 'VIP GRANULAR LTD.',
        vip: true,
        preciosEspeciales: {
            'VV:1.37': 14000, // Specific width
            'VV': 16000      // General fallback
        }
    };

    console.log('Creating test client...');
    await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testClient)
    });

    // Case A: Should use the 1.37 bobina because 1.0m fits, and it has the 14000 price.
    const orderA = {
        clientId: 9999, material: 'VV', ancho: 1.0, alto: 1.0, copias: 1,
        category: 'impresion', servicios: {}, id: 8881
    };

    console.log('Testing Case A: Width 1.0m (should hit VV:1.37 override)...');
    const resA = await fetch(`${API_URL}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderA)
    });
    const resultA = await resA.json();
    console.log(`> Price used: ${resultA.precioUnitarioUsado} (Expected 14000)`);

    // Case B: Should use the 1.52 bobina because 1.4m doesn't fit in 1.37.
    // Should fall back to 16000 (general VV override).
    const orderB = {
        clientId: 9999, material: 'VV', ancho: 1.4, alto: 1.0, copias: 1,
        category: 'impresion', servicios: {}, id: 8882
    };

    console.log('Testing Case B: Width 1.4m (should hit general VV override)...');
    const resB = await fetch(`${API_URL}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderB)
    });
    const resultB = await resB.json();
    console.log(`> Price used: ${resultB.precioUnitarioUsado} (Expected 16000)`);

    if (resultA.precioUnitarioUsado === 14000 && resultB.precioUnitarioUsado === 16000) {
        console.log('\n✅ SUCCESS: Granular pricing logic works perfectly!');
    } else {
        console.log('\n❌ FAILURE: Pricing mismatch.');
    }

    // Cleanup
    await fetch(`${API_URL}/clientes/9999`, { method: 'DELETE' });
    await fetch(`${API_URL}/orders/8881`, { method: 'DELETE' });
    await fetch(`${API_URL}/orders/8882`, { method: 'DELETE' });
}

testVipPricing().catch(console.error);
