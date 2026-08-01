const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'Luxius System',
    description: 'Sistema de Gestion Luxius (Servidor + UI)',
    script: path.join(__dirname, 'index.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
    //, allowServiceLogon: true
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function () {
    console.log('Servicio Luxius Instalado Correctamente.');
    svc.start();
    console.log('Iniciando servicio...');
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', function () {
    console.log('El servicio ya existe. Intentando iniciarlo...');
    svc.start();
});

// Listen for the "start" event and log it
svc.on('start', function () {
    console.log('Luxius System ha arrancado como servicio.');
});

// Install the script as a service.
svc.install();
