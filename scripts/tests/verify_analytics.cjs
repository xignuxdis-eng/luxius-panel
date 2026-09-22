async function verifyAnalytics() {
    console.log("--- Analytics Dashboard Verification ---");
    try {
        const dashRes = await fetch('http://localhost:5000/api/analytics/dashboard');
        if (!dashRes.ok) throw new Error(`Status ${dashRes.status}`);
        const dashData = await dashRes.json();

        console.log("✅ GET /api/analytics/dashboard: Success");
        console.log("Summary Data:", JSON.stringify(dashData.summary, null, 2));
        console.log("Charts Data (billingByMonth):", dashData.charts.billingByMonth.length, "months");
        console.log("Charts Data (materialData):", dashData.charts.materialData.length, "items");
        console.log("Charts Data (serviceData):", dashData.charts.serviceData.length, "items");

        const reconRes = await fetch('http://localhost:5000/api/analytics/reconciliation');
        if (!reconRes.ok) throw new Error(`Status ${reconRes.status}`);
        const reconData = await reconRes.json();

        console.log("\n✅ GET /api/analytics/reconciliation: Success");
        const sample = reconData.reconciled[0];
        if (sample) {
            console.log("Sample Reconciled Item Audit Fields:");
            console.log(`- consumoEstimado: ${sample.consumoEstimado}`);
            console.log(`- stockWarning: ${sample.stockWarning}`);
            console.log(`- efficiency.m2: ${sample.efficiency.m2}`);
        } else {
            console.log("No reconciled items found to sample.");
        }

        console.log("\n--- Verification Complete ---");
    } catch (err) {
        console.error("❌ Verification Failed:", err.message);
    }
}

verifyAnalytics();
