async function test() {
    const API_URL = 'http://localhost:5000/api';
    const suffix = Date.now();
    const newClient = {
        nombre: 'REAL UI TEST ' + suffix,
        email: 'ui_test@example.com',
        username: 'uitestuser' + suffix,
        habilitado: true
    };

    console.log('Sending client create request...');
    const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
    });

    if (res.ok) {
        console.log('Client created successfully.');
        const result = await res.json();
        console.log('Returned Client ID:', result.id);
    } else {
        console.error('Failed to create client:', res.status);
    }
}
test();
