const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseLogs } = require('./logParser');

const app = express();
const PORT = 5000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'ordenes.json');
const STATS_FILE = path.join(DATA_DIR, 'printer_stats.json');
const LOGS_DIR = path.join(__dirname, 'printer_logs');
const PROCESSED_DIR = path.join(LOGS_DIR, 'processed');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');
if (!fs.existsSync(STATS_FILE)) fs.writeFileSync(STATS_FILE, '[]', 'utf8');

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR)
    },
    filename: function (req, file, cb) {
        // Sanitize filename to avoid weird chars
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, name + '-' + uniqueSuffix + ext)
    }
})

const upload = multer({ storage: storage });

// Database Helper
const getOrders = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const saveOrders = (orders) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2), 'utf8');
};

// --- AUTOMATIC FILE RENAMING HELPER ---
const processFileRenaming = (orderItem) => {
    if (orderItem.archivos && Array.isArray(orderItem.archivos)) {
        // Load materials for code lookup
        const materiales = readCollection('materiales');

        const result = orderItem.archivos.map((originalFile, index) => {
            if (!originalFile || typeof originalFile !== 'string') {
                console.log(`[RENAMER_SKIP] Invalid file entry:`, originalFile);
                return originalFile;
            }

            const oldPath = path.join(UPLOADS_DIR, originalFile);
            if (fs.existsSync(oldPath)) {
                const ext = path.extname(originalFile);

                // FORMULA: ID_CLIENTE_CODIGOMATERIAL_CALIDAD_ANCHO_ALTO_DEM.ext

                // 1. Cliente
                const cliente = (orderItem.clienteNombre || 'CLIENTE').replace(/[^a-z0-9]/gi, '-').toUpperCase();

                // 2. Material Code Lookup (Fix: materials are stored with 'codigo' and 'descripcion')
                // The frontend sends the 'codigo' in orderItem.material.
                const materialObj = materiales.find(m => m.codigo === orderItem.material);
                const matCode = materialObj ? materialObj.codigo : (orderItem.material || 'MAT');
                const material = matCode.replace(/[^a-z0-9]/gi, '-').toUpperCase();

                // 3. Calidad (Reference)
                let originalCalidad = (orderItem.calidad || 'STD').toUpperCase();
                let calidad = originalCalidad.replace(/[^A-Z0-9]/gi, '-');
                if (calidad.includes('ECO-SOLVENTE') || calidad.includes('ECOSOLVENTE')) calidad = 'ECO';

                // 4. Dimensions (3 decimals for mm precision)
                const anchoValue = (parseFloat(orderItem.ancho) || 0).toFixed(2);
                const altoValue = (parseFloat(orderItem.alto) || 0).toFixed(2);

                // 5. Demasias (Bleed)
                const hasDemasias = (orderItem.demasias && parseFloat(orderItem.demasias) > 0) ||
                    (orderItem.demasiasConfig && Object.values(orderItem.demasiasConfig).some(v => v));
                const demasiaSuffix = hasDemasias ? '_DEM' : '';

                // NEW FORMULA: OT-ID_xCopies_MATERIAL_CALIDAD_WxH_DEM
                const copies = `x${orderItem.copias || 1}`;
                const dims = `${anchoValue}x${altoValue}`;
                const technicalName = `OT-${orderItem.id}_${copies}_${material}_${calidad}_${dims}${demasiaSuffix}`;

                // 6. Client Reference (Original Name)
                let clientRef = "";
                if (orderItem.archivosOriginales && orderItem.archivosOriginales[index]) {
                    const origFull = orderItem.archivosOriginales[index];
                    const origExt = path.extname(origFull);
                    const origBase = path.basename(origFull, origExt)
                        .replace(/[\\/:*?"<>|]/g, '_') // Windows illegal chars
                        .trim();
                    clientRef = ` --- ${origBase}`;
                }

                const newFilename = `${technicalName}${clientRef}${ext}`;
                const newPath = path.join(UPLOADS_DIR, newFilename);

                try {
                    if (originalFile !== newFilename) {
                        // Check if target exists
                        if (fs.existsSync(newPath)) {
                            console.log(`[RENAMER] Target exists ${newFilename}, deleting old before move.`);
                            try { fs.unlinkSync(newPath); } catch (e) { }
                        }
                        fs.renameSync(oldPath, newPath);
                        console.log(`[RENAMER] Success: Renamed ${originalFile} to ${newFilename} (ID: ${orderItem.id})`);
                        return newFilename;
                    }
                    return originalFile;
                } catch (err) {
                    console.error(`[RENAMER] Error: Failed to rename ${originalFile}:`, err);
                    return originalFile;
                }
            } else {
                console.log(`[RENAMER] File missed: ${originalFile} not found in uploads dir.`);
            }
            return originalFile;
        }).filter(Boolean);
        return result;
    }
    return orderItem.archivos;
};

// --- ROUTES ---

// --- MIGRATION ENDPOINT ---
app.post('/api/migration/receive', (req, res) => {
    const backupData = req.body; // Expect { usuarios: [...], clientes: [...], ... }

    console.log("Receiving migration data...");

    Object.keys(backupData).forEach(key => {
        // Map LocalStorage keys to filenames if necessary, or expect clean keys
        // valid keys: usuarios, clientes, materiales, calidades, maquinas, proveedores, servicios, logisticas, calendar
        const validKeys = ['usuarios', 'clientes', 'materiales', 'calidades', 'maquinas', 'proveedores', 'servicios', 'logisticas', 'calendar'];

        let filename = key;
        // Strip 'luxius_session_' prefix if present
        if (filename.startsWith('luxius_session_')) {
            filename = filename.replace('luxius_session_', '');
        }

        // Just to be safe, also accept straight keys
        if (validKeys.includes(filename)) {
            console.log(`Migrating ${filename}... count: ${backupData[key].length}`);
            writeCollection(filename, backupData[key]);
        }
    });

    res.json({ success: true, message: 'Data migrated successfully' });
});

// --- GENERIC GENERIC RESOURCE HANDLER ---

const getCollectionPath = (collection) => path.join(DATA_DIR, `${collection}.json`);

const readCollection = (collection) => {
    const filePath = getCollectionPath(collection);
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]', 'utf8');
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeCollection = (collection, data) => {
    const filePath = getCollectionPath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// POST /api/upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
    });
});

// --- CLIENT-USER AUTOMATION ---
const ensureClientUser = (client) => {
    console.log(`[AUTH_AUTO] START for: ID=${client.id}, Name="${client.nombre}", UserOverride="${client.username || 'NONE'}", Email="${client.email || 'NONE'}"`);
    const usuarios = readCollection('usuarios');

    let userIndex = usuarios.findIndex(u => u.clientId === client.id);
    console.log(`[AUTH_AUTO] Match by clientId(${client.id})? ${userIndex !== -1 ? 'YES' : 'NO'}`);

    // If no linked user, try to find by username manual override or email
    if (userIndex === -1 && client.username) {
        userIndex = usuarios.findIndex(u => u.username === client.username);
        console.log(`[AUTH_AUTO] Match by username override("${client.username}")? ${userIndex !== -1 ? 'YES' : 'NO'}`);
    }
    if (userIndex === -1 && client.email) {
        userIndex = usuarios.findIndex(u => u.username === client.email);
        console.log(`[AUTH_AUTO] Match by email("${client.email}")? ${userIndex !== -1 ? 'YES' : 'NO'}`);
    }

    const userData = {
        nombre: client.nombre,
        username: client.username || client.email || `cli_${client.id}`,
        email: client.email || '',
        rol: 'cliente',
        clientId: client.id,
        habilitado: client.habilitado !== false
    };

    if (userIndex !== -1) {
        // Update existing user
        usuarios[userIndex] = { ...usuarios[userIndex], ...userData };
        console.log(`[AUTH_AUTO] UPDATED user ${usuarios[userIndex].username} (ID=${usuarios[userIndex].id})`);
    } else {
        // Create new user
        const maxId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id || 0)) : 0;
        const newUser = {
            id: maxId + 1,
            ...userData,
            password: `${userData.username}123` // Default: username/username123
        };
        usuarios.unshift(newUser);
        console.log(`[AUTH_AUTO] CREATED new user ${newUser.username} (ID=${newUser.id}) with password ${newUser.password}`);
    }
    writeCollection('usuarios', usuarios);
    console.log(`[AUTH_AUTO] FINISHED`);
};

// --- PRICE CALCULATION HELPER (Backend Security) ---
const calculateOrderSubtotal = (orderItem) => {
    const materiales = readCollection('materiales');
    const servicios = readCollection('servicios');

    const mat = materiales.find(m => m.codigo === orderItem.material);
    if (!mat) throw new Error(`Material no encontrado: ${orderItem.material}`);

    const h = parseFloat(orderItem.alto) || 0;
    const w = parseFloat(orderItem.ancho) || 0;
    const c = parseInt(orderItem.copias) || 0;
    const clientId = parseInt(orderItem.clientId);

    if (h <= 0 || w <= 0 || c <= 0) throw new Error(`Dimensiones o copias inválidas: Ancho=${w}, Alto=${h}, Copias=${c}`);

    const clientes = readCollection('clientes');
    const cliente = clientes.find(c => c.id === clientId);
    const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[mat.codigo] : null;

    let currentUnitPrice = 0;
    let basePrice = 0;

    if (mat.tipoCobro === 'ml') {
        if (!mat.bobinas || mat.bobinas.length === 0) {
            throw new Error(`Material tipo 'ml' sin bobinas configuradas: ${mat.codigo}`);
        }

        const MARGIN = 0.01; // 1cm pinch roller margin
        const options = [];

        mat.bobinas.forEach(bobina => {
            const usefulWidth = bobina.ancho - MARGIN;

            // Priority: 1. Price for this specific width (codigo:ancho) | 2. General code price | 3. Standard bobina price
            const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${mat.codigo}:${bobina.ancho}`] : null;
            const priceToUse = specialPriceWidth || specialPrice || bobina.precioML;

            // Scenario 1: Original Orientation (W <= usefulWidth)
            if (w <= usefulWidth) {
                options.push({
                    cost: h * c * priceToUse,
                    unitPrice: priceToUse,
                    rotated: false,
                    bobina: bobina.ancho,
                    isSpecial: !!(specialPriceWidth || specialPrice)
                });
            }

            // Scenario 2: Rotated Orientation (H <= usefulWidth)
            if (h <= usefulWidth) {
                options.push({
                    cost: w * c * priceToUse,
                    unitPrice: priceToUse,
                    rotated: true,
                    bobina: bobina.ancho,
                    isSpecial: !!(specialPriceWidth || specialPrice)
                });
            }
        });

        if (options.length === 0) {
            throw new Error('Excede ancho máximo / Requiere panelizado');
        }

        // Select the cheapest option
        const bestOption = options.sort((a, b) => a.cost - b.cost)[0];

        basePrice = Math.round(bestOption.cost);
        currentUnitPrice = bestOption.unitPrice;

        // Save metadata about the selection
        orderItem.precioDetalle = {
            rotated: bestOption.rotated,
            bobinaUsada: bestOption.bobina,
            tipo: 'ml',
            isSpecial: !!specialPrice
        };

    } else {
        // Legacy M2 Logic
        currentUnitPrice = specialPrice || mat.precioM2 || 0;

        // Tiered pricing by width
        if (mat.preciosPorAncho && mat.preciosPorAncho.length > 0) {
            const tier = mat.preciosPorAncho.find(t => w <= t.maxAncho);
            if (tier) {
                currentUnitPrice = tier.precio;
            } else {
                currentUnitPrice = mat.preciosPorAncho[mat.preciosPorAncho.length - 1].precio;
            }
        }

        if (mat.tipoCobro === 'ml_legacy_fixed') { // Handle legacy ml if any
            basePrice = Math.round(h * c * currentUnitPrice);
        } else {
            basePrice = Math.round(w * h * c * currentUnitPrice);
        }
    }

    // Add services prices
    let servicesTotal = 0;
    if (orderItem.servicios) {
        Object.entries(orderItem.servicios).forEach(([sId, active]) => {
            if (active) {
                const s = servicios.find(serv => String(serv.id) === sId);
                if (s) {
                    const priceBase = parseFloat(s.precioBase) || 0;
                    let multiplier = c;

                    if (s.unidad === 'm2') {
                        multiplier = w * h * c;
                    } else if (s.unidad === 'metro') {
                        // Use the length that defined the 'ml' consumption
                        const isRotated = orderItem.precioDetalle?.rotated || false;
                        multiplier = (isRotated ? w : h) * c;
                    }

                    servicesTotal += Math.round(priceBase * multiplier);
                }
            }
        });
    }

    return {
        subtotal: basePrice + servicesTotal,
        unitPrice: currentUnitPrice
    };
};

// --- STRUCTURAL VALIDATION HELPER (Backend Security) ---
const validateOrderData = (item) => {
    // 1. Mandatory Fields & Types
    if (!item.clientId || typeof item.clientId !== 'number') {
        throw new Error('clientId inválido o faltante (debe ser un número)');
    }
    if (!item.material || typeof item.material !== 'string') {
        throw new Error('material inválido o faltante (debe ser un string)');
    }
    if (!['diseno', 'impresion'].includes(item.category)) {
        throw new Error('category inválida (debe ser "diseno" o "impresion")');
    }
    if (typeof item.servicios !== 'object') {
        throw new Error('servicios debe ser un objeto');
    }

    // 2. Numeric Validations (Dimensions & Copies)
    const h = parseFloat(item.alto);
    const w = parseFloat(item.ancho);
    const c = parseInt(item.copias);

    if (isNaN(h) || h <= 0) throw new Error('alto debe ser un número mayor a 0');
    if (isNaN(w) || w <= 0) throw new Error('ancho debe ser un número mayor a 0');
    if (typeof item.copias !== 'number' || !Number.isInteger(item.copias) || item.copias <= 0) {
        throw new Error('copias debe ser un número entero mayor a 0');
    }

    // 3. Existence Checks
    const clientes = readCollection('clientes');
    const materiales = readCollection('materiales');

    const clientExists = clientes.some(c => c.id === item.clientId);
    if (!clientExists) throw new Error(`Cliente no encontrado (ID: ${item.clientId})`);

    const materialExists = materiales.some(m => m.codigo === item.material);
    if (!materialExists) throw new Error(`Material no encontrado (Código: ${item.material})`);
};

// GET /api/:collection
app.get('/api/:collection', (req, res) => {
    const { collection } = req.params;
    // Security check: define allowed collections or regex
    const allowed = ['orders', 'ordenes', 'clientes', 'materiales', 'usuarios', 'proveedores', 'calidades', 'maquinas', 'servicios', 'logisticas', 'config'];
    if (!allowed.includes(collection)) return res.status(403).json({ error: 'Invalid collection' });

    // Mapping 'orders' to 'ordenes.json' legacy
    const filename = collection === 'orders' ? 'ordenes' : collection;
    const data = readCollection(filename);
    res.json(data);
});

// POST /api/:collection (Create/Update)
app.post('/api/:collection', (req, res) => {
    const { collection } = req.params;
    const item = req.body;
    const filename = collection === 'orders' ? 'ordenes' : collection;

    // --- SECURITY & TRACEABILITY: Structural Validation & Price Recalculation ---
    if (filename === 'ordenes') {
        try {
            validateOrderData(item);

            const { subtotal, unitPrice } = calculateOrderSubtotal(item);
            item.subtotal = subtotal;
            item.precioUnitarioUsado = unitPrice;
            item.precioValidado = true;

            // --- STOCK & CONSUMPTION TRACEABILITY ---
            const materiales = readCollection('materiales');
            const mat = materiales.find(m => m.codigo === item.material);
            if (mat) {
                const h = parseFloat(item.alto) || 0;
                const w = parseFloat(item.ancho) || 0;
                const c = parseInt(item.copias) || 0;
                // ml -> h * c | m2 -> w * h * c
                const consumo = (mat.tipoCobro === 'ml') ? (h * c) : (w * h * c);
                item.consumoEstimado = parseFloat(consumo.toFixed(4));
                item.stockEnMomentoCreacion = mat.stockActual || 0;
                item.stockWarning = consumo > (mat.stockActual || 0);
            }

            // --- CLIENT NAME RESOLUTION ---
            const clients = readCollection('clientes');
            const client = clients.find(c => c.id === item.clientId);
            if (client) {
                item.clienteNombre = client.nombre;
                item.cliente = client.nombre;
            } else {
                item.clienteNombre = `Cliente ${item.clientId || 'Desconocido'}`;
            }
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    const data = readCollection(filename);

    // Auto ID & Date
    if (!item.id) {
        const maxId = data.length > 0 ? Math.max(...data.map(o => o.id || 0)) : 0;
        item.id = maxId + 1;
        if (!item.createdAt) {
            item.createdAt = new Date().toISOString();
        }
    }

    // Auto-generate OT if missing (for orders)
    if (filename === 'ordenes' && !item.ot) {
        item.ot = `OT-${item.id}`;
    }

    const index = data.findIndex(o => o.id === item.id);
    let workingIndex = index;

    if (index >= 0) {
        data[index] = { ...data[index], ...item, updatedAt: new Date().toISOString() };
    } else {
        item.updatedAt = new Date().toISOString();
        data.unshift(item);
        workingIndex = 0;
    }

    // --- AUTOMATIC FILE RENAMING ---
    if (filename === 'ordenes') {
        const updatedFiles = processFileRenaming(data[workingIndex]);
        if (updatedFiles) {
            data[workingIndex].archivos = updatedFiles;
        }
    }

    writeCollection(filename, data);

    // --- CLIENT-USER AUTOMATION (POST) ---
    if (filename === 'clientes') {
        ensureClientUser(item);
    }

    res.json(item);
});

// PUT /api/:collection/:id (Update existing item)
app.put('/api/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    const item = req.body;
    const filename = collection === 'orders' ? 'ordenes' : collection;
    const numId = parseInt(id);

    // --- SECURITY & TRACEABILITY: Structural Validation & Price Recalculation ---
    if (filename === 'ordenes') {
        try {
            // merge with existing to ensure we have all fields for structural validation if partial update
            const currentData = readCollection(filename);
            const existing = currentData.find(o => o.id === numId);

            const merged = existing ? { ...existing, ...item } : item;

            // SKIP VALIDATION IF SOFT-DELETING (status: 'eliminado')
            if (item.status !== 'eliminado') {
                validateOrderData(merged);
            }

            const { subtotal, unitPrice, detail } = calculateOrderSubtotal(merged);
            item.subtotal = subtotal;
            item.precioUnitarioUsado = unitPrice;
            item.precioValidado = true;
            if (detail) item.precioDetalle = detail;

            // --- STOCK & CONSUMPTION TRACEABILITY (PUT) ---
            const materiales = readCollection('materiales');
            const mat = materiales.find(m => m.codigo === (item.material || (existing ? existing.material : null)));
            if (mat) {
                const h = parseFloat(item.alto || (existing ? existing.alto : 0)) || 0;
                const w = parseFloat(item.ancho || (existing ? existing.ancho : 0)) || 0;
                const c = parseInt(item.copias || (existing ? existing.copias : 0)) || 0;

                let consumo = 0;
                if (mat.tipoCobro === 'ml') {
                    // Use the price detail to determine which side was used as length
                    consumo = (detail && detail.rotated) ? (w * c) : (h * c);
                } else {
                    consumo = w * h * c;
                }

                item.consumoEstimado = parseFloat(consumo.toFixed(4));
                item.stockEnMomentoCreacion = mat.stockActual || 0;
                item.stockWarning = consumo > (mat.stockActual || 0);
            }
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    let data = readCollection(filename);
    const index = data.findIndex(o => o.id === numId);

    if (index < 0) {
        return res.status(404).json({ error: 'Item not found' });
    }


    // Merge the update with existing data
    data[index] = { ...data[index], ...item, id: numId, updatedAt: new Date().toISOString() };

    // Auto-generate OT if missing during update (backfill)
    if (filename === 'ordenes' && !data[index].ot) {
        data[index].ot = `OT-${data[index].id}`;
    }

    // --- AUTOMATIC FILE RENAMING FOR ORDERS (PUT) ---
    if (filename === 'ordenes') {
        const updatedFiles = processFileRenaming(data[index]);
        if (updatedFiles) data[index].archivos = updatedFiles;
    }

    writeCollection(filename, data);

    // --- CLIENT-USER AUTOMATION (PUT) ---
    if (filename === 'clientes') {
        ensureClientUser(data[index]);
    }

    res.json(data[index]);
});

// DELETE /api/:collection/:id
app.delete('/api/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    const filename = collection === 'orders' ? 'ordenes' : collection;

    let data = readCollection(filename);
    const numId = parseInt(id);
    data = data.filter(d => d.id !== numId);

    writeCollection(filename, data);
    res.json({ success: true });
});

// --- BATCH OPERATIONS ---
app.post('/api/orders/batch', (req, res) => {
    const { action, ids, data } = req.body; // action: 'delete', 'update', 'restore'
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    let orders = readCollection('ordenes');
    let modifiedCount = 0;

    if (action === 'delete') {
        // Permanent Delete
        orders = orders.filter(o => !ids.includes(o.id));
        modifiedCount = ids.length; // Approximate
    } else if (action === 'update' || action === 'restore') {
        // Update fields (e.g. status)
        orders = orders.map(o => {
            if (ids.includes(o.id)) {
                modifiedCount++;
                return { ...o, ...data, updatedAt: new Date().toISOString() };
            }
            return o;
        });
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    writeCollection('ordenes', orders);
    res.json({ success: true, count: modifiedCount });
});

// --- ANALYTICS ENGINE ---

// POST /api/analytics/process-logs
app.post('/api/analytics/process-logs', (req, res) => {
    console.log("[DEBUG] POST /api/analytics/process-logs called");
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.txt'));
    console.log(`[DEBUG] Found ${files.length} log files to process`);
    let totalImported = 0;

    if (files.length === 0) {
        console.log("[DEBUG] No new logs to process");
        return res.json({ success: true, message: 'No new logs found', count: 0 });
    }

    const currentStats = readCollection('printer_stats');
    const orders = readCollection('ordenes');
    const unlinkedLogs = readCollection('logs_no_asociados');

    // Use a Set of job signatures to avoid duplicates (filename + start)
    const existingSignatures = new Set(currentStats.map(s => `${s.jobName}_${s.startTime}`));
    const existingUnlinkedSignatures = new Set(unlinkedLogs.map(s => `${s.jobName}_${s.startTime}`));

    let logsModified = false;
    let unlinkedModified = false;

    files.forEach(file => {
        const filePath = path.join(LOGS_DIR, file);
        try {
            const xmlContent = fs.readFileSync(filePath, 'utf8');
            const jobs = parseLogs(xmlContent);

            jobs.forEach(job => {
                const signature = `${job.jobName}_${job.startTime}`;

                // 1. Check if it's already in main stats
                if (existingSignatures.has(signature)) return;
                // 2. Check if it's already in unlinked
                if (existingUnlinkedSignatures.has(signature)) return;

                // 3. Validate OT existence in DB
                const orderExists = job.orderId && orders.some(o => o.id === job.orderId);

                if (orderExists) {
                    currentStats.push(job);
                    existingSignatures.add(signature);
                    totalImported++;
                    logsModified = true;
                } else {
                    unlinkedLogs.push(job);
                    existingUnlinkedSignatures.add(signature);
                    unlinkedModified = true;
                }
            });

            // Move to processed
            fs.renameSync(filePath, path.join(PROCESSED_DIR, file));
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    });

    if (logsModified) writeCollection('printer_stats', currentStats);
    if (unlinkedModified) writeCollection('logs_no_asociados', unlinkedLogs);

    res.json({
        success: true,
        message: `Imported ${totalImported} print jobs from ${files.length} files.`,
        count: totalImported,
        unlinkedCount: unlinkedModified ? unlinkedLogs.length : 0
    });
});

// GET /api/analytics/stats
app.get('/api/analytics/stats', (req, res) => {
    console.log("[DEBUG] GET /api/analytics/stats called");
    const stats = readCollection('printer_stats');
    console.log(`[DEBUG] Returning ${stats.length} print jobs`);
    res.json(stats);
});

// GET /api/analytics/reconciliation
app.get('/api/analytics/reconciliation', (req, res) => {
    console.log("[DEBUG] GET /api/analytics/reconciliation called");
    const orders = readCollection('ordenes');
    const stats = readCollection('printer_stats');

    const reconciled = orders.map(order => {
        // Find all logs associated with this order ID
        const logs = stats.filter(s => s.orderId === order.id);

        const realM2 = logs.reduce((sum, log) => sum + (log.sizeM2 || 0), 0);
        const realInk = logs.reduce((sum, log) => ({
            c: sum.c + (log.ink.c || 0),
            m: sum.m + (log.ink.m || 0),
            y: sum.y + (log.ink.y || 0),
            k: sum.k + (log.ink.k || 0),
        }), { c: 0, m: 0, y: 0, k: 0 });

        const totalInkMl = realInk.c + realInk.m + realInk.y + realInk.k;

        return {
            id: order.id,
            cliente: order.cliente,
            trabajo: order.trabajo,
            material: order.material,
            teorico: {
                m2: order.total_m2 || 0,
                // Add more theoretical fields if available in order schema
            },
            real: {
                m2: parseFloat(realM2.toFixed(4)),
                ink: realInk,
                totalInkMl: parseFloat(totalInkMl.toFixed(2)),
                logsCount: logs.length
            },
            efficiency: {
                m2: order.consumoEstimado > 0 ? parseFloat((realM2 / order.consumoEstimado).toFixed(2)) : 0,
                inkRatio: realM2 > 0 ? parseFloat(((totalInkMl / 1000) / realM2).toFixed(5)) : 0
            },
            consumoEstimado: order.consumoEstimado || 0,
            stockWarning: order.stockWarning || false,
            status: logs.length > 0 ? 'consolidated' : 'pending'
        };
    });

    // Use the dedicated unlinked logs file
    const unlinkedLogs = readCollection('logs_no_asociados');

    res.json({
        reconciled,
        unlinkedCount: unlinkedLogs.length,
        unlinkedLogs: unlinkedLogs.slice(-50).reverse() // Show most recent unlinked logs
    });
});

// GET /api/analytics/dashboard
app.get('/api/analytics/dashboard', (req, res) => {
    const orders = readCollection('ordenes');
    const stats = readCollection('printer_stats');
    const materiales = readCollection('materiales');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Executive Summary
    const thisMonthOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const billing = thisMonthOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const m2Sold = thisMonthOrders.reduce((sum, o) => sum + (o.consumoEstimado || 0), 0);

    // Monthly m2 printed from logs
    const m2Printed = stats.filter(s => {
        const d = new Date(s.startTime);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, s) => sum + (s.sizeM2 || 0), 0);

    const stockWarningsList = materiales.filter(m => (m.stockActual || 0) <= (m.stockMinimo || 0) && m.habilitado !== false && m.stockMinimo > 0);
    const stockWarnings = stockWarningsList.length;

    // Top Client by billing (all time or this month? let's do this month)
    const clientBilling = {};
    thisMonthOrders.forEach(o => {
        const cName = o.clienteNombre || o.cliente || (o.clientId ? `Cliente ${o.clientId}` : "Desconocido");
        clientBilling[cName] = (clientBilling[cName] || 0) + (o.subtotal || 0);
    });
    const topClient = Object.entries(clientBilling).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

    // 2. Charts Data

    // Billing per month (last 6 months)
    const billingByMonth = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const monthOrders = orders.filter(o => {
            const od = new Date(o.createdAt);
            return od.getMonth() === m && od.getFullYear() === y;
        });
        const monthBilling = monthOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

        // Sold vs Printed
        const monthSold = monthOrders.reduce((sum, o) => sum + (o.consumoEstimado || 0), 0);
        const monthPrinted = stats.filter(s => {
            const sd = new Date(s.startTime);
            return sd.getMonth() === m && sd.getFullYear() === y;
        }).reduce((sum, s) => sum + (s.sizeM2 || 0), 0);

        billingByMonth.push({
            month: d.toLocaleString('es-ES', { month: 'short' }),
            billing: monthBilling,
            sold: parseFloat(monthSold.toFixed(2)),
            printed: parseFloat(monthPrinted.toFixed(2))
        });
    }

    // Most profitable materials
    const matProfit = {};
    orders.forEach(o => {
        matProfit[o.material] = (matProfit[o.material] || 0) + (o.subtotal || 0);
    });
    const materialData = Object.entries(matProfit)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Services usage
    const servicesUsage = {};
    orders.forEach(o => {
        if (o.servicios) {
            Object.entries(o.servicios).forEach(([sId, active]) => {
                if (active) servicesUsage[sId] = (servicesUsage[sId] || 0) + 1;
            });
        }
    });
    // Get service names
    const servicios = readCollection('servicios');
    const serviceData = Object.entries(servicesUsage).map(([id, count]) => {
        const s = servicios.find(srv => String(srv.id) === id);
        return { name: s ? s.nombre : `ID ${id}`, value: count };
    }).sort((a, b) => b.value - a.value).slice(0, 5);

    res.json({
        summary: {
            billing,
            m2Sold: parseFloat(m2Sold.toFixed(2)),
            m2Printed: parseFloat(m2Printed.toFixed(2)),
            stockWarnings,
            stockWarningsList,
            topClient: { name: topClient[0], value: topClient[1] }
        },
        productionDetails: {
            // 1. M2 Printed Details (this month)
            m2Details: stats.filter(s => {
                const d = new Date(s.startTime);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).map(s => {
                const order = orders.find(o => o.id === s.orderId);
                return {
                    ot: s.orderId ? `OT-${s.orderId}` : 'S/N',
                    cliente: order ? order.clienteNombre : 'Desconocido',
                    material: s.material,
                    maquina: s.machine,
                    m2: s.sizeM2,
                    fecha: s.startTime
                };
            }),
            // 2. Machine Stats (Restore)
            machineStats: Object.entries(stats.reduce((acc, s) => {
                const m = s.machine || 'Genérica';
                if (!acc[m]) acc[m] = { m2: 0, time: 0, jobs: new Set() };
                acc[m].m2 += s.sizeM2;
                acc[m].time += (s.durationMinutes || 0);
                acc[m].jobs.add(s.orderId || s.jobName);
                return acc;
            }, {})).map(([name, data]) => ({
                name,
                m2: parseFloat(data.m2.toFixed(2)),
                hours: parseFloat((data.time / 60).toFixed(2)),
                jobsCount: data.jobs.size,
                efficiency: data.m2 > 0 ? parseFloat((data.time / data.m2).toFixed(2)) : 0 // min/m2
            }))
        },
        intelligence: {
            // 1. Stock Forecast (Last 30 days consumption)
            stockForecast: materiales.filter(m => m.habilitado !== false).map(m => {
                const last30Days = new Date();
                last30Days.setDate(last30Days.getDate() - 30);

                const recentLogs = stats.filter(s => s.material === m.nombre && new Date(s.startTime) >= last30Days);
                const totalConsumed = recentLogs.reduce((sum, s) => sum + (s.sizeM2 || 0), 0);
                const avgDaily = totalConsumed / 30;
                const daysRemaining = avgDaily > 0 ? Math.floor((m.stockActual || 0) / avgDaily) : 999;

                return {
                    material: m.nombre,
                    stockActual: m.stockActual,
                    avgDaily: parseFloat(avgDaily.toFixed(2)),
                    daysRemaining,
                    status: daysRemaining < 7 ? 'danger' : (daysRemaining < 15 ? 'warning' : 'success')
                };
            }).filter(m => m.avgDaily > 0).sort((a, b) => a.daysRemaining - b.daysRemaining),

            // 2. Efficiency by Material & Machine
            efficiencyByMaterial: Object.entries(stats.reduce((acc, s) => {
                const mat = s.material || 'Otro';
                if (!acc[mat]) acc[mat] = { sold: 0, printed: 0 };
                acc[mat].printed += s.sizeM2 || 0;
                // Associate with sold m2 from orders
                const order = orders.find(o => o.id === s.orderId);
                if (order) acc[mat].sold += order.consumoEstimado || 0;
                return acc;
            }, {})).map(([name, d]) => {
                const eff = d.printed > 0 ? (d.sold / d.printed) * 100 : 0;
                return {
                    name,
                    efficiency: parseFloat(eff.toFixed(1)),
                    status: eff > 95 ? 'success' : (eff > 90 ? 'warning' : 'danger')
                };
            }).sort((a, b) => a.efficiency - b.efficiency),

            // 3. Reprint Leakage Detection (Multiple prints with >10% overrun)
            leakage: Object.entries(stats.reduce((acc, s) => {
                if (!s.orderId) return acc;
                if (!acc[s.orderId]) acc[s.orderId] = [];
                acc[s.orderId].push(s);
                return acc;
            }, {})).map(([id, logs]) => {
                const order = orders.find(o => String(o.id) === id);
                const printedM2 = logs.reduce((sum, l) => sum + l.sizeM2, 0);
                const soldM2 = order ? (order.consumoEstimado || 0) : 0;
                const overprintRatio = soldM2 > 0 ? (printedM2 - soldM2) / soldM2 : 0;

                return {
                    ot: `OT-${id}`,
                    cliente: order ? order.clienteNombre : 'Desconocido',
                    overprintRatio: parseFloat((overprintRatio * 100).toFixed(1)),
                    events: logs.length,
                    isLeakage: logs.length > 1 && overprintRatio > 0.1
                };
            }).filter(l => l.isLeakage).sort((a, b) => b.overprintRatio - a.overprintRatio),

            // 4. Client Profitability Ranking (Subtotal / Real Printed M2)
            profitability: Object.entries(orders.reduce((acc, o) => {
                const c = o.clienteNombre || 'Genérico';
                if (!acc[c]) acc[c] = { billing: 0, printed: 0 };
                acc[c].billing += o.subtotal || 0;
                const orderLogs = stats.filter(s => s.orderId === o.id);
                acc[c].printed += orderLogs.reduce((sum, l) => sum + l.sizeM2, 0);
                return acc;
            }, {})).map(([name, d]) => ({
                name,
                index: d.printed > 0 ? parseFloat((d.billing / d.printed).toFixed(2)) : 0,
                billing: d.billing
            })).filter(c => c.index > 0).sort((a, b) => b.index - a.index).slice(0, 10)
        },
        details: {
            thisMonthOrders: thisMonthOrders.map(o => ({
                id: o.id,
                ot: o.ot,
                clienteNombre: o.clienteNombre,
                fecha: o.createdAt,
                total: o.subtotal,
                m2Sold: o.consumoEstimado,
                material: o.material
            })),
            stockWarningOrders: orders.filter(o => o.stockWarning === true).map(o => ({
                id: o.id,
                ot: o.ot,
                clienteNombre: o.clienteNombre,
                material: o.material,
                status: o.status
            })),
            m2PrintedLogs: stats.filter(s => {
                const d = new Date(s.startTime);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).map(s => ({
                jobName: s.jobName,
                machine: s.machine,
                material: s.material,
                sizeM2: s.sizeM2,
                startTime: s.startTime
            }))
        },
        charts: {
            billingByMonth,
            materialData,
            serviceData
        }
    });
});

// POST /api/analytics/rebuild-stats
// Purges existing stats and re-processes ALL logs (new and processed)
app.post('/api/analytics/rebuild-stats', (req, res) => {
    console.log("[DEBUG] POST /api/analytics/rebuild-stats called");

    // 1. Clear current stats
    writeCollection('printer_stats', []);

    // 2. Collect all log files
    const newFiles = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.txt')).map(f => ({ name: f, path: path.join(LOGS_DIR, f), move: true }));
    const processedFiles = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.txt')).map(f => ({ name: f, path: path.join(PROCESSED_DIR, f), move: false }));

    const allFiles = [...newFiles, ...processedFiles];
    console.log(`[DEBUG] Rebuilding from ${allFiles.length} total log files`);

    const currentStats = [];
    const existingSignatures = new Set();
    let totalImported = 0;

    allFiles.forEach(fileInfo => {
        try {
            const xmlContent = fs.readFileSync(fileInfo.path, 'utf8');
            const jobs = parseLogs(xmlContent);

            jobs.forEach(job => {
                const signature = `${job.jobName}_${job.endTime}_${job.startTime}`;
                if (!existingSignatures.has(signature)) {
                    currentStats.push(job);
                    existingSignatures.add(signature);
                    totalImported++;
                }
            });

            if (fileInfo.move) {
                fs.renameSync(fileInfo.path, path.join(PROCESSED_DIR, fileInfo.name));
            }
        } catch (err) {
            console.error(`Error processing ${fileInfo.name}:`, err);
        }
    });

    writeCollection('printer_stats', currentStats);
    res.json({
        success: true,
        message: `Estadísticas reconstruidas. Se procesaron ${totalImported} trabajos de ${allFiles.length} archivos.`,
        count: totalImported
    });
});

// --- DATABASE UTILITIES ---

// GET /api/db/backup
// Generates a JSON backup of all collections
app.get('/api/db/backup', (req, res) => {
    try {
        const collections = ['ordenes', 'clientes', 'materiales', 'usuarios', 'proveedores', 'calidades', 'maquinas', 'servicios', 'logisticas', 'config', 'printer_stats'];
        const backupData = {};
        collections.forEach(c => {
            backupData[c] = readCollection(c);
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `luxius_backup_${timestamp}.json`;

        res.setHeader('Content-disposition', 'attachment; filename=' + backupFilename);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(backupData, null, 2));
    } catch (err) {
        console.error('Backup error:', err);
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});

// POST /api/db/cleanup
// Removes records older than 2 years
app.post('/api/db/cleanup', (req, res) => {
    try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        // Cleanup orders
        const orders = readCollection('ordenes');
        const initialOrderCount = orders.length;
        const cleanedOrders = orders.filter(o => {
            const dateStr = o.createdAt || o.fechaCreacion || o.fechaInicio || (o.startTime ? o.startTime : null);
            if (!dateStr) return true; // Keep if no date found
            return new Date(dateStr) > twoYearsAgo;
        });
        writeCollection('ordenes', cleanedOrders);

        // Cleanup printer stats
        const stats = readCollection('printer_stats');
        const initialStatsCount = stats.length;
        const cleanedStats = stats.filter(s => {
            const dateStr = s.startTime || s.endTime;
            if (!dateStr) return true;
            return new Date(dateStr) > twoYearsAgo;
        });
        writeCollection('printer_stats', cleanedStats);

        res.json({
            success: true,
            message: `Limpieza completada. Se eliminaron ${initialOrderCount - cleanedOrders.length} órdenes y ${initialStatsCount - cleanedStats.length} registros de impresión.`,
            removedOrders: initialOrderCount - cleanedOrders.length,
            removedStats: initialStatsCount - cleanedStats.length
        });
    } catch (err) {
        console.error('Cleanup error:', err);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// POST /api/db/normalize-case
// Converts key fields in main collections to UPPERCASE
app.post('/api/db/normalize-case', (req, res) => {
    try {
        const normalize = (collection, fields) => {
            const data = readCollection(collection);
            const normalized = data.map(item => {
                const newItem = { ...item };
                fields.forEach(f => {
                    if (newItem[f] && typeof newItem[f] === 'string') {
                        newItem[f] = newItem[f].toUpperCase();
                    }
                });
                return newItem;
            });
            writeCollection(collection, normalized);
            return data.length;
        };

        normalize('clientes', ['nombre', 'empresa', 'responsable', 'direccion', 'categoria']);
        normalize('materiales', ['descripcion', 'codigo', 'tipo', 'calidad']);
        normalize('maquinas', ['nombre', 'marca', 'nickName']);
        normalize('ordenes', ['clienteNombre', 'material', 'calidad', 'envio', 'trabajo']);
        normalize('proveedores', ['nombre', 'empresa', 'contacto']);
        normalize('usuarios', ['nombre']);

        res.json({ success: true, message: 'Normalización completada. Nombres y descripciones convertidos a MAYÚSCULAS.' });
    } catch (err) {
        console.error('Normalization error:', err);
        res.status(500).json({ error: 'Normalization failed' });
    }
});

// POST /api/db/reset-balances
// Resets financial balance fields to zero
app.post('/api/db/reset-balances', (req, res) => {
    try {
        // Find and reset balance-related fields in collections
        const resetCollection = (collection, fields) => {
            const data = readCollection(collection);
            const resetData = data.map(item => {
                const newItem = { ...item };
                fields.forEach(f => {
                    if (f in newItem) newItem[f] = 0;
                });
                return newItem;
            });
            writeCollection(collection, resetData);
        };

        resetCollection('clientes', ['saldo', 'deuda', 'balance', 'pagoCuenta']);
        resetCollection('servicios', ['precio', 'costo']); // Optionally reset prices if needed (per user prompt)

        res.json({ success: true, message: 'Saldos reiniciados a cero correctamente.' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Reset failed' });
    }
});

// Serve static frontend
const DIST_DIR = path.join(__dirname, '../dist');
app.use(express.static(DIST_DIR));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Luxius API Server running on port ${PORT}`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Uploads: http://localhost:${PORT}/uploads`);
});

// React Router Catch-All (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});
