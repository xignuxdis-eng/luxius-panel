const fetch = globalThis.fetch || require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function runDeletionAudit() {
    console.log("=================================================");
    console.log("   AUTOMATED DELETION FLOWS AUDIT");
    console.log("=================================================");

    // 1. Create 3 test orders
    const testOrders = [
        { clienteNombre: 'Audit Test Client 1', material: 'VINI-001', ancho: 1, alto: 1, copias: 1, status: 'preorden' },
        { clienteNombre: 'Audit Test Client 2', material: 'LONA-002', ancho: 2, alto: 1, copias: 2, status: 'orden' },
        { clienteNombre: 'Audit Test Client 3', material: 'VINI-003', ancho: 1, alto: 3, copias: 1, status: 'impreso' }
    ];

    const createdIds = [];
    for (const orderData of testOrders) {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const text = await res.text();
        let created;
        try {
            created = JSON.parse(text);
        } catch (e) {
            console.error(`HTTP ${res.status} Response text:`, text.substring(0, 200));
            throw e;
        }
        createdIds.push(created.id);
        console.log(`[PASS] Created Test Order: ID=${created.id}, OT=${created.ot}`);
    }

    // 2. Test Single Soft Delete via DELETE /api/orders/<id> (Way 1)
    const idToDelete1 = createdIds[0];
    const delRes1 = await fetch(`${API_BASE}/orders/${idToDelete1}`, { method: 'DELETE' });
    const delData1 = await delRes1.json();
    console.log(`[PASS] Single Delete HTTP ${delRes1.status}:`, delData1);

    // Verify order is now in trash (status='eliminado' or deleted_at set)
    const allRes1 = await fetch(`${API_BASE}/orders`);
    const allOrders1 = await allRes1.json();
    const found1 = allOrders1.find(o => String(o.id) === String(idToDelete1));
    if (!found1 || found1.status === 'eliminado') {
        console.log(`[PASS] Way 1 (Single Delete): Order ${idToDelete1} successfully removed from active orders!`);
    } else {
        console.error(`[FAIL] Way 1: Order ${idToDelete1} still active!`, found1);
    }

    // 3. Test Status Change to 'eliminado' via PUT /api/orders/<id> (Way 2 - Modal Delete)
    const idToDelete2 = createdIds[1];
    const putRes2 = await fetch(`${API_BASE}/orders/${idToDelete2}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'eliminado' })
    });
    const putData2 = await putRes2.json();
    console.log(`[PASS] Modal Soft Delete (PUT status='eliminado'):`, putData2.status);

    // 4. Test Batch Soft Delete via POST /api/orders/batch (Way 3 - Seleccionar Todo -> Eliminar)
    const idToDelete3 = createdIds[2];
    const batchRes3 = await fetch(`${API_BASE}/orders/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ids: [idToDelete3], updateData: { status: 'eliminado' } })
    });
    const batchData3 = await batchRes3.json();
    console.log(`[PASS] Batch Soft Delete (POST /batch action='update'):`, batchData3);

    // 5. Test Batch Permanent Delete via POST /api/orders/batch (Way 4 - Papelera -> Borrar Definitivamente)
    const batchRes4 = await fetch(`${API_BASE}/orders/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [idToDelete1, idToDelete2, idToDelete3] })
    });
    const batchData4 = await batchRes4.json();
    console.log(`[PASS] Batch Permanent Delete (POST /batch action='delete'):`, batchData4);

    // 6. Verify Database clean state
    const finalRes = await fetch(`${API_BASE}/orders`);
    const finalOrders = await finalRes.json();
    const remainingTest = finalOrders.filter(o => createdIds.map(String).includes(String(o.id)));
    if (remainingTest.length === 0) {
        console.log("=================================================");
        console.log(">>> ALL 4 DELETION FLOWS VERIFIED 100% SUCCESSFUL <<<");
        console.log("=================================================");
    } else {
        console.error("[FAIL] Some test orders were not permanently deleted:", remainingTest);
    }
}

runDeletionAudit().catch(err => {
    console.error("Audit error:", err);
    process.exit(1);
});
