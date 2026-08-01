const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("🚀 Testing Soft Delete on Invalid Order...\n");

    // 1. Create an "Invalid" Order (bypassing the POST validation by injecting directly into file? 
    // No, I can't easily inject without stopping server. 
    // Instead, I will try to update an existing order that MIGHT be invalid, or I rely on the fact that I can't create one.
    // Wait, I can try to update a VALID order with MISSING data + status: 'eliminado'.
    // If validation runs, it should fail. If I fix it, it should pass.

    // First, create a valid order
    const validPayload = {
        clientId: 997550, // Miguel Zacco
        material: 'LF+13',
        category: 'impresion',
        alto: 1,
        ancho: 1,
        copias: 1,
        servicios: {},
        archivos: [],
        status: 'orden'
    };

    const createRes = await fetch(`${BASE_URL}/ordenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
    });
    const order = await createRes.json();
    console.log(`✅ Created Temp Order ID: ${order.id}`);

    // 2. Try to Soft Delete (PUT status='eliminado') BUT also corrupt the data (simulating an old incomplete record)
    // Actually, on PUT, we merge. So we can't "delete" fields easily unless we pass null?
    // But `validateOrderData` checks `merged`.

    // Let's try to update with valid data, but pretend it's an old order that was MISSING 'clientId' (impossible to simulate if I just created it valid).

    // Alternative: Try to update the order by setting a NEGATIVE dimension (invalid) AND status='eliminado' at the same time.
    // If validation runs, it will reject the negative dimension. 
    // If we exempt 'eliminado', it should pass (or we only validate structural integrity but allow values? No, exempt all is safer for deletion).

    console.log("Attempting Soft Delete with INVALID data (negative dimensions)...");
    const updateRes = await fetch(`${BASE_URL}/ordenes/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'eliminado',
            ancho: -50 // INVALID!
        })
    });

    const updateData = await updateRes.json();

    if (updateRes.status === 200) {
        console.log("❌ FAILURE (Unexpected Success): The invalid update was accepted. Validation is NOT blocking deletion?");
    } else {
        console.log(`✅ SUCCESS (Expected Failure): API rejected the update with status ${updateRes.status}`);
        console.log(`   Error: ${updateData.error}`);
        console.log("   -> This confirms that strict validation BLOCKS soft deletes of invalid data.");
    }
}

runTest();
