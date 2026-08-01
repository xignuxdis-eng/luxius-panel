const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// Helper to fetch data directly from files to ensure we have valid refs
const DATA_DIR = path.join(__dirname, 'server/data');
function readCollection(name) {
    try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
    } catch (e) {
        return [];
    }
}

async function runTests() {
    console.log("🚀 Starting Structural Validation Security Tests...\n");

    const clientes = readCollection('clientes');
    const materiales = readCollection('materiales');

    if (clientes.length === 0 || materiales.length === 0) {
        console.error("❌ Pre-requisite failed: Need at least one client and material in DB.");
        return;
    }

    const validClient = clientes[0];
    const validMaterial = materiales[0];

    console.log(`ℹ️ Using Client ID: ${validClient.id} (${validClient.nombre})`);
    console.log(`ℹ️ Using Material: ${validMaterial.codigo}`);

    const validOrder = {
        clientId: validClient.id,
        material: validMaterial.codigo,
        category: 'impresion',
        alto: 1,
        ancho: 1,
        copias: 1,
        servicios: {},
        archivos: []
    };

    // Test Helper
    async function test(name, payload, method = 'POST', endpoint = '/ordenes', expectedStatus = 200) {
        process.stdout.write(`Tests: ${name.padEnd(50)} `);
        try {
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.status === expectedStatus) {
                console.log(`✅ PASS (${res.status})`);
                return true;
            } else {
                console.log(`❌ FAIL (Expected ${expectedStatus}, got ${res.status})`);
                console.log(`   Response:`, data);
                return false;
            }
        } catch (err) {
            console.log(`❌ ERROR: ${err.message}`);
            return false;
        }
    }

    console.log("\n--- POST CREATE VALIDATION ---");
    await test('1. Create Valid Order', validOrder, 'POST', '/ordenes', 200);

    await test('2. Missing Client ID', { ...validOrder, clientId: undefined }, 'POST', '/ordenes', 400);

    await test('3. Invalid Client ID (Non-existent)', { ...validOrder, clientId: 999999 }, 'POST', '/ordenes', 400);

    await test('4. Invalid Material Code', { ...validOrder, material: 'FAKE-MAT-123' }, 'POST', '/ordenes', 400);

    await test('5. Negative Dimensions', { ...validOrder, ancho: -5 }, 'POST', '/ordenes', 400);

    await test('6. zero copies', { ...validOrder, copias: 0 }, 'POST', '/ordenes', 400);

    await test('7. Invalid Category', { ...validOrder, category: 'hacking' }, 'POST', '/ordenes', 400);

    // PUT TESTS
    // Create a temp order to update
    const createRes = await fetch(`${BASE_URL}/ordenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validOrder)
    });
    const createdOrder = await createRes.json();
    const orderId = createdOrder.id;

    if (orderId) {
        console.log("\n--- PUT UPDATE VALIDATION ---");
        await test('8. Valid Update', { ...validOrder, copias: 5 }, 'PUT', `/ordenes/${orderId}`, 200);

        await test('9. Update with Negative Dim', { ...validOrder, alto: -10 }, 'PUT', `/ordenes/${orderId}`, 400);

        await test('10. Update with Invalid Material', { ...validOrder, material: 'BAD-MAT' }, 'PUT', `/ordenes/${orderId}`, 400);

        // Cleanup
        await fetch(`${BASE_URL}/ordenes/${orderId}`, { method: 'DELETE' });
    } else {
        console.log("❌ Skipping PUT tests due to creation failure.");
    }

    console.log("\n✅ Security Tests Completed.");
}

runTests();
