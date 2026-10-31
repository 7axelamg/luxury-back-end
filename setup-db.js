const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Victus2025',
    database: 'luxury_service'
  });

  console.log('Connected to MySQL luxury_service database.');

  // 1. Asegurar tabla orders con id varchar(64) PRIMARY KEY
  const [cols] = await conn.query('DESCRIBE orders');
  const hasId = cols.some(c => c.Field === 'id');

  if (!hasId) {
    console.log('Adding id column to orders table...');
    await conn.query('ALTER TABLE `orders` ADD COLUMN `id` VARCHAR(64) NOT NULL FIRST');
  }

  // 2. Limpiar DB y el Histórico por completo según los nuevos parámetros
  try { await conn.query('DELETE FROM `historial_acciones`'); } catch (e) {}
  try { await conn.query('DELETE FROM `findings`'); } catch (e) {}
  await conn.query('DELETE FROM `orders`');
  await conn.query('DELETE FROM `vehicles`');
  await conn.query('DELETE FROM `customers`');

  // Asegurar clave primaria en id si no está
  try {
    await conn.query('ALTER TABLE `orders` ADD PRIMARY KEY (`id`)');
  } catch (e) {}

  // 3. Crear Clientes, Vehículos y Órdenes de Muestra Viva (Flujo de 2 Pasos)
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
      observaciones: 'Vehículo recién ingresado por recepción. Inspección de 6 categorías de checklist completada.',
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
      observaciones: 'Servicios de lubricación y revisión de frenos cotizados. Generación de factura lista.',
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
      observaciones: 'Factura pagada a satisfacción y vehículo entregado con paz y salvo.',
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

  console.log(`Successfully cleaned database and seeded ${sampleOrders.length} fresh sample orders across 2 steps.`);
  await conn.end();
}

main().catch(console.error);
