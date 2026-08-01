const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runFullSystemAudit() {
    console.log("=================================================");
    console.log("   LUXIUS + WORKFIELD MANAGER - FULL SYSTEM AUDIT");
    console.log("=================================================\n");

    let totalTests = 0;
    let passedTests = 0;

    function assertTest(name, condition, details = "") {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`[PASS] ${name} ${details ? '(' + details + ')' : ''}`);
        } else {
            console.error(`[FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
        }
    }

    try {
        // 1. Auth Login
        console.log("--- 1. AUTHENTICATION & PROFILES ---");
        const loginRes = await request('POST', '/auth/login', { username: 'adrian', password: 'nueva98261' });
        assertTest("Login Backend (adrian)", loginRes.status === 200 && loginRes.body.token, `User: ${loginRes.body.user?.nombre}`);

        const token = loginRes.body.token;
        const authHeader = { 'Authorization': `Bearer ${token}` };

        const profileRes = await request('GET', '/operators/profile', null, authHeader);
        assertTest("Operator Profile Endpoint", profileRes.status === 200, `Profile: ${profileRes.body.nombre || profileRes.body.username}`);

        // 2. ABM Collections
        console.log("\n--- 2. ABM COLLECTIONS ---");
        const clientsRes = await request('GET', '/clientes');
        assertTest("Get Clientes Collection", clientsRes.status === 200 && Array.isArray(clientsRes.body), `Count: ${clientsRes.body.length}`);

        const materialsRes = await request('GET', '/materiales');
        assertTest("Get Materiales Collection", materialsRes.status === 200 && Array.isArray(materialsRes.body), `Count: ${materialsRes.body.length}`);

        const machinesRes = await request('GET', '/maquinas');
        assertTest("Get Maquinas Collection", machinesRes.status === 200 && Array.isArray(machinesRes.body), `Count: ${machinesRes.body.length}`);

        // Create Test Client
        const newClientRes = await request('POST', '/clientes', {
            nombre: 'Empresa Test Integration',
            cuit: '30-99999999-9',
            email: 'test_integration@xignux.com',
            telefono: '1199887766'
        });
        assertTest("Create Client via API", newClientRes.status === 200 || newClientRes.status === 201, `ID: ${newClientRes.body.id}`);

        // 3. Tasks & Workfield Operations
        console.log("\n--- 3. WORKFIELD TASKS & FIELD OPERATIONS ---");
        const tasksRes = await request('GET', '/tasks', null, authHeader);
        assertTest("Get Workfield Tasks", tasksRes.status === 200 && Array.isArray(tasksRes.body), `Tasks: ${tasksRes.body.length}`);

        const newTaskRes = await request('POST', '/tasks', {
            clienteId: newClientRes.body.id || 1,
            descripcion: 'Relevamiento Cartelería Test',
            notas: 'Av. Corrientes 1234',
            origen: 'mobile'
        }, authHeader);
        assertTest("Create Workfield Task", newTaskRes.status === 200 || newTaskRes.status === 201, `Task ID: ${newTaskRes.body.id}`);

        // 4. Orders & Production Lifecycle
        console.log("\n--- 4. ORDERS & PRODUCTION LIFECYCLE ---");
        const ordersRes = await request('GET', '/orders');
        assertTest("Get Orders Collection", ordersRes.status === 200 && Array.isArray(ordersRes.body), `Orders: ${ordersRes.body.length}`);

        const testOt = `OT-TEST-${Date.now()}`;
        const newOrderRes = await request('POST', '/orders', {
            ot: testOt,
            clienteNombre: 'Empresa Test Integration',
            material: 'lona_front_light_13oz',
            ancho: 2.5,
            alto: 1.2,
            copias: 2,
            status: 'preorden',
            subtotal: 37500
        });
        assertTest("Create New Order (Pre-Orden / Diseño)", newOrderRes.status === 200 || newOrderRes.status === 201, `OT: ${testOt}`);

        const createdOrderId = newOrderRes.body.id;

        if (createdOrderId) {
            // Update order status to 'orden' (Printer queue)
            const updateOrderRes = await request('POST', '/orders', {
                id: createdOrderId,
                status: 'orden'
            });
            assertTest("Transition Order -> 'orden' (Impresión)", updateOrderRes.status === 200, `Status: ${updateOrderRes.body.status}`);

            // Transition to 'impreso'
            const printOrderRes = await request('POST', '/orders', {
                id: createdOrderId,
                status: 'impreso'
            });
            assertTest("Transition Order -> 'impreso'", printOrderRes.status === 200, `Status: ${printOrderRes.body.status}`);
        }

        // 5. Analytics & Dashboard Metrics
        console.log("\n--- 5. ANALYTICS & METRICS SYSTEM ---");
        const statsRes = await request('GET', '/analytics/stats');
        assertTest("Get Analytics Stats", statsRes.status === 200 && Array.isArray(statsRes.body), `Stats Entries: ${statsRes.body.length}`);

        const dashRes = await request('GET', '/analytics/dashboard');
        assertTest("Get Executive Dashboard Data", dashRes.status === 200 && dashRes.body.summary, `Billing: $${dashRes.body.summary?.billing}`);

        console.log("\n=================================================");
        console.log(`   AUDIT COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
        console.log("=================================================");

        if (passedTests === totalTests) {
            console.log("\n>>> FULL SYSTEM INTEGRATION VERIFIED 100% SUCCESSFUL <<<\n");
            process.exit(0);
        } else {
            console.error("\n>>> SOME TESTS FAILED <<<");
            process.exit(1);
        }

    } catch (e) {
        console.error("Critical Audit Failure:", e);
        process.exit(1);
    }
}

runFullSystemAudit();
