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
    const r1 = await post('/auth/login', { username: 'sistema', password: 'sistema123' });
    console.log("Login sistema status:", r1.status, "body:", r1.body);

    const r2 = await post('/auth/login', { username: 'vendedor', password: 'vendedor' });
    console.log("Login vendedor status:", r2.status, "body:", r2.body);

    const r3 = await post('/auth/login', { username: 'adrian', password: 'nueva98261' });
    console.log("Login adrian status:", r3.status, "body:", r3.body);
}

testAuth();
