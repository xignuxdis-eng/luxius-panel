const fs = require('fs');

const clientes = JSON.parse(fs.readFileSync('server/data/clientes.json', 'utf8'));
const usuarios = JSON.parse(fs.readFileSync('server/data/usuarios.json', 'utf8'));

console.log(`Clientes: ${clientes.length}`);
console.log(`Usuarios: ${usuarios.length}`);

let issues = 0;
clientes.forEach(c => {
    const user = usuarios.find(u => u.clientId === c.id);
    if (!user) {
        console.log(`ISSUE: Client ${c.id} (${c.nombre}) has NO linked user.`);
        issues++;
    } else {
        if (c.username && user.username !== c.username) {
            console.log(`ISSUE: Client ${c.id} username mismatch. Client: ${c.username}, User: ${user.username}`);
            issues++;
        }
    }
});

if (issues === 0) {
    console.log('No inconsistencies found between clients and users.');
} else {
    console.log(`Total issues found: ${issues}`);
}
