const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("🚀 Testing Batch Operations (Fix Verification)...\n");

    // 1. Create 3 Valid Orders
    const validPayload = {
        clientId: 997550,
        material: 'LF+13',
        category: 'impresion',
        alto: 1, ancho: 1, copias: 1, servicios: {}, archivos: [], status: 'orden'
    };

    const ids = [];
    for (let i = 0; i < 3; i++) {
        const r = await fetch(`${BASE_URL}/orders`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validPayload)
        });
        const d = await r.json();
        ids.push(d.id);
    }
    console.log(`✅ Created 3 Temp Orders: ${ids.join(', ')}`);

    // 2. Test Batch Soft Delete (Update status='eliminado')
    // This previously failed if data was invalid. Here data is valid, but we want to ensure endpoint works.
    console.log("Testing Batch Soft Delete on IDs [0, 1]...");
    const softDeleteRes = await fetch(`${BASE_URL}/orders/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'update',
            ids: [ids[0], ids[1]],
            data: { status: 'eliminado' }
        })
    });
    const softDeleteData = await softDeleteRes.json();
    if (softDeleteData.success && softDeleteData.count === 2) {
        console.log("✅ Batch Soft Delete Successful");
    } else {
        console.log("❌ Batch Soft Delete Failed", softDeleteData);
    }

    // 3. Test Batch Hard Delete (Permanent) on ID [2]
    console.log(`Testing Batch Hard Delete on ID [${ids[2]}]...`);
    const hardDeleteRes = await fetch(`${BASE_URL}/orders/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'delete',
            ids: [ids[2]]
        })
    });
    const hardDeleteData = await hardDeleteRes.json();
    if (hardDeleteData.success && hardDeleteData.count === 1) {
        console.log("✅ Batch Hard Delete Successful");
    } else {
        console.log("❌ Batch Hard Delete Failed", hardDeleteData);
    }

    // 4. Test Batch Restore on IDs [0, 1]
    console.log("Testing Batch Restore on IDs [0, 1]...");
    const restoreRes = await fetch(`${BASE_URL}/orders/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'restore', // alias for update
            ids: [ids[0], ids[1]],
            data: { status: 'orden' }
        })
    });
    const restoreData = await restoreRes.json();
    if (restoreData.success && restoreData.count === 2) {
        console.log("✅ Batch Restore Successful");
    } else {
        console.log("❌ Batch Restore Failed", restoreData);
    }

    // Clean up
    await fetch(`${BASE_URL}/orders/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [ids[0], ids[1]] })
    });
    console.log("\n✅ Test Cleanup Complete.");
}

runTest();
