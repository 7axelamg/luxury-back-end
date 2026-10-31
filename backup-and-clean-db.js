const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function backupAndClean() {
  const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Victus2025',
    database: 'luxury_service'
  };

  const conn = await mysql.createConnection(dbConfig);
  console.log(' Conectado a la base de datos MySQL (luxury_service).');

  // 1. CREAR RESPALDO ANTES DE BORRAR
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `backup_luxury_service_${timestamp}.json`);

  console.log('\n Realizando copia de seguridad de las tablas existentes...');
  const tables = ['orders', 'vehicles', 'customers', 'historial_acciones', 'findings', 'users'];
  const backupData = {};

  for (const table of tables) {
    try {
      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      backupData[table] = rows;
      console.log(`   - Tabla \`${table}\`: ${rows.length} registros respaldados.`);
    } catch (err) {
      console.log(`   - Tabla \`${table}\` no existe o no se pudo leer (${err.message}).`);
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(` Respaldo completado exitosamente en:\n   ${backupFile}\n`);

  // 2. ASEGURAR COLUMNAS EN TABLA USERS Y ROLE_AUDIT_LOGS
  try {
    const [userCols] = await conn.query('DESCRIBE users');
    const hasDoc = userCols.some(c => c.Field === 'documento');
    if (!hasDoc) {
      console.log(' Agregando columnas de empleados a la tabla users...');
      await conn.query('ALTER TABLE `users` ADD COLUMN `documento` VARCHAR(32) NULL AFTER `password`');
      await conn.query('ALTER TABLE `users` ADD COLUMN `email` VARCHAR(128) NULL AFTER `documento`');
      await conn.query('ALTER TABLE `users` ADD COLUMN `telefono` VARCHAR(32) NULL AFTER `email`');
      await conn.query('ALTER TABLE `users` ADD COLUMN `cargo` VARCHAR(64) NULL AFTER `telefono`');
    }
  } catch (e) {
    console.log('Aviso columnas users:', e.message);
  }

  // 3. LIMPIEZA DE BASE DE DATOS E HISTÓRICO
  console.log('🧹 Limpiando registros existentes e históricos (conservando usuarios/configuración)...');
  try { await conn.query('DELETE FROM `historial_acciones`'); } catch (e) {}
  try { await conn.query('DELETE FROM `findings`'); } catch (e) {}
  try { await conn.query('DELETE FROM `orders`'); } catch (e) {}
  try { await conn.query('DELETE FROM `vehicles`'); } catch (e) {}
  try { await conn.query('DELETE FROM `customers`'); } catch (e) {}

  // Actualizar datos de empleados predefinidos con documentos y cargos
  try {
    await conn.query(`
      UPDATE users SET 
        documento = COALESCE(documento, '1032456789'),
        email = COALESCE(email, 'admin@luxuryservices.co'),
        telefono = COALESCE(telefono, '+57 312 456 7890'),
        cargo = COALESCE(cargo, 'Director General')
      WHERE username = 'superadmin' OR role = 'SUPER_ADMIN'
    `);
    await conn.query(`
      UPDATE users SET 
        documento = COALESCE(documento, '1018765432'),
        email = COALESCE(email, 'gerencia@luxuryservices.co'),
        telefono = COALESCE(telefono, '+57 315 789 0123'),
        cargo = COALESCE(cargo, 'Gerente Comercial y Postventa')
      WHERE role = 'GERENTE_COMERCIAL'
    `);
    await conn.query(`
      UPDATE users SET 
        documento = COALESCE(documento, '1029384756'),
        email = COALESCE(email, 'recepcion@luxuryservices.co'),
        telefono = COALESCE(telefono, '+57 320 123 4567'),
        cargo = COALESCE(cargo, 'Recepcionista Asesor')
      WHERE role = 'RECEPCIONISTA'
    `);
    await conn.query(`
      UPDATE users SET 
        documento = COALESCE(documento, '1098473625'),
        email = COALESCE(email, 'patio@luxuryservices.co'),
        telefono = COALESCE(telefono, '+57 311 987 6543'),
        cargo = COALESCE(cargo, 'Jefe de Operaciones de Patio')
      WHERE role = 'JEFE_DE_PATIO'
    `);
  } catch (e) {}

  console.log(' Tablas de datos e historial limpiadas correctamente.');

  // 3. SEMBRAR DATOS DE MUESTRA VIVA (FLUJO DE 2 PASOS)
  console.log(' Sembrando datos iniciales para el flujo de 2 pasos...');
  const sampleOrders = [
    {
      id: 'ORD-20260925-001',
      cliente: 'Sebastián Alarcón',
      cedula: '1098273645',
      telefono: '+57 310 889 2211',
      email: 's.alarcon@luxury.co',
      placa: 'ROM-001',
      marca: 'Ferrari',
      modelo: 'Roma V8 Twin-Turbo',
      color: 'Rosso Corsa Metálico',
      kilometraje: 4200,
      paso_actual: 1,
      estado: 'Recepción y Checklist de Ingreso',
      observaciones: 'Vehículo en recepción. Checklist de ingreso y registro fotográfico inicial.',
      pertenencias: 'Gafas de sol Tom Ford en portagafas central, paraguas Ferrari oficial en maletero.',
    },
    {
      id: 'ORD-20260925-002',
      cliente: 'Carlos Mendoza',
      cedula: '1020304050',
      telefono: '+57 301 445 7890',
      email: 'carlos.mendoza@inversiones.com',
      placa: 'VIP-777',
      marca: 'Mercedes-Benz',
      modelo: 'AMG G 63 4MATIC',
      color: 'Negro Obsidiana Mate',
      kilometraje: 14500,
      paso_actual: 2,
      estado: 'Cotización Checklist & Facturación',
      observaciones: 'Checklist de cotización en curso con servicios de lubricación y filtros.',
      pertenencias: 'Documentos originales, llaves de repuesto y kit AMG.',
    },
    {
      id: 'ORD-20260925-003',
      cliente: 'Federico Gómez',
      cedula: '987654321',
      telefono: '+57 320 654 9870',
      email: 'fgomez@banca.com',
      placa: 'RNG-404',
      marca: 'Land Rover',
      modelo: 'Range Rover SV Autobiography',
      color: 'Gris Santorini Perlado',
      kilometraje: 28900,
      paso_actual: 2,
      estado: 'Cotización Checklist & Facturación',
      observaciones: 'Mantenimiento preventivo mayor y tratamiento cerámico cotizado.',
      pertenencias: 'Paraguas oficial Range Rover y gafas en guantera central.',
    },
    {
      id: 'ORD-20260925-004',
      cliente: 'Alejandro Valenzuela',
      cedula: '1122334455',
      telefono: '+57 315 223 3445',
      email: 'a.valenzuela@motorsport.com',
      placa: 'LUX-911',
      marca: 'Porsche',
      modelo: '911 GT3 RS Clubsport',
      color: 'Blanco Puro / Detalles Rojos',
      kilometraje: 8200,
      paso_actual: 3,
      estado: 'Entregado y Cerrado',
      observaciones: 'Factura cancelada a satisfacción y vehículo entregado con paz y salvo.',
      pertenencias: 'Casco de competición OMP y guantes en maletero delantero.',
      fecha_cierre: new Date()
    }
  ];

  for (const item of sampleOrders) {
    // 1. Cliente
    let [customers] = await conn.query('SELECT * FROM customers WHERE cedula = ?', [item.cedula]);
    let customerId;
    if (customers.length === 0) {
      customerId = uuidv4();
      await conn.query(
        'INSERT INTO customers (id, nombre, telefono, email, cedula) VALUES (?, ?, ?, ?, ?)',
        [customerId, item.cliente, item.telefono, item.email, item.cedula]
      );
    } else {
      customerId = customers[0].id;
    }

    // 2. Vehículo
    let [vehicles] = await conn.query('SELECT * FROM vehicles WHERE placa = ?', [item.placa]);
    let vehicleId;
    if (vehicles.length === 0) {
      vehicleId = uuidv4();
      await conn.query(
        'INSERT INTO vehicles (id, placa, marca, modelo, color, kilometraje, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [vehicleId, item.placa, item.marca, item.modelo, item.color, item.kilometraje, customerId]
      );
    } else {
      vehicleId = vehicles[0].id;
    }

    // 3. Orden
    await conn.query(
      `INSERT INTO orders (id, customer_id, vehicle_id, paso_actual, estado, kilometraje, observaciones, pertenencias, fecha_cierre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        customerId,
        vehicleId,
        item.paso_actual,
        item.estado,
        item.kilometraje,
        item.observaciones,
        item.pertenencias,
        item.fecha_cierre || null
      ]
    );
  }

  console.log(` Proceso completado: base de datos respaldada, limpiada y sembrada con ${sampleOrders.length} órdenes.`);
  await conn.end();
}

backupAndClean().catch(err => {
  console.error('Error durante el proceso de respaldo y limpieza:', err);
  process.exit(1);
});
