const http = require('http');

function post(path, data) {
    return new Promise((resolve) => {
        const payload = JSON.stringify(data);
        const req = http.request('http://localhost:5000/api' + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.write(payload);
        req.end();
    });
}

async function testAuth() {
    console.log("Testing Login system...");
    const r1 = await post('/auth/login', { username: process.env.LUXIUS_TEST_USER || 'sistema', password: process.env.LUXIUS_TEST_PASS || '' });
    console.log("Login sistema status:", r1.status, "body:", r1.body);

    const r2 = await post('/auth/login', { username: process.env.LUXIUS_TEST_USER2 || 'vendedor', password: process.env.LUXIUS_TEST_PASS2 || '' });
    console.log("Login vendedor status:", r2.status, "body:", r2.body);

    const r3 = await post('/auth/login', { username: process.env.LUXIUS_TEST_USER3 || 'adrian', password: process.env.LUXIUS_TEST_PASS3 || '' });
    console.log("Login adrian status:", r3.status, "body:", r3.body);
}

testAuth();
