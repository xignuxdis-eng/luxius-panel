async function testCurrentPricing() {
    try {
        console.log("--- Testing Current Pricing (Live Server) ---");

        const order = {
            clientId: 997550,
            material: "VV",
            calidad: "Eco-Solvente",
            ancho: 1.5,
            alto: 2.0,
            copias: 1,
            servicios: { "2": true }, // Laminado Brillante ($6000)
            status: "preorden",
            category: "impresion"
        };

        const response = await fetch('http://localhost:5000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server error: ${errText}`);
        }

        const savedOrder = await response.json();

        const expectedBase = 2.0 * 24000;
        const expectedTotal = expectedBase + 6000;

        console.log(`Order Created: OT-${savedOrder.id}`);
        console.log(`Subtotal: ${savedOrder.subtotal}`);
        console.log(`Expected: ${expectedTotal}`);

        if (savedOrder.subtotal === expectedTotal) {
            console.log("✅ SUCCESS: Subtotal matches expected value.");
        } else {
            console.log("❌ FAILURE: Subtotal mismatch.");
            console.log(`Detail: ${JSON.stringify(savedOrder.precioDetalle)}`);
        }

        // Cleanup: delete the test order
        await fetch(`http://localhost:5000/api/orders/${savedOrder.id}`, { method: 'DELETE' });
        console.log("Test order deleted.");

    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

testCurrentPricing();
