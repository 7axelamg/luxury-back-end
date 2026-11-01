const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function runMigration() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Victus2025',
    database: process.env.DB_NAME || 'luxury_service',
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : false,
  };

  console.log('--- INICIANDO MIGRACIÓN: SEDES Y USUARIOS ---');
  const conn = await mysql.createConnection(dbConfig);
  console.log('✓ Conectado a la base de datos MySQL.');

  // 1. Asegurar tabla sedes con id UUID (varchar 36) como PRIMARY KEY
  let hasValidId = false;
  try {
    const [cols] = await conn.query('DESCRIBE sedes');
    hasValidId = cols.some(c => c.Field === 'id' && c.Key === 'PRI');
  } catch (e) {
    // La tabla no existe
  }

  if (!hasValidId) {
    console.log('Asegurando tabla `sedes` con clave primaria id varchar(36)...');
    await conn.query('DROP TABLE IF EXISTS `sedes`');
    await conn.query(`
      CREATE TABLE \`sedes\` (
        \`id\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`nombre\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`activa\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_sedes_nombre\` (\`nombre\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }
  console.log('✓ Tabla `sedes` verificada/creada.');

  // 2. Sembrar 3 sedes iniciales
  const defaultSedes = [
    { id: 'b1000000-0000-0000-0000-000000000001', nombre: 'Sede Principal - Bogotá (Calle 127)', activa: 1 },
    { id: 'b2000000-0000-0000-0000-000000000002', nombre: 'Sede Norte - Medellín (El Poblado)', activa: 1 },
    { id: 'b3000000-0000-0000-0000-000000000003', nombre: 'Sede Occidente - Cali (Ciudad Jardín)', activa: 1 },
  ];

  for (const s of defaultSedes) {
    const [existing] = await conn.query('SELECT id FROM sedes WHERE nombre = ? OR id = ?', [s.nombre, s.id]);
    if (existing.length === 0) {
      await conn.query('INSERT INTO sedes (id, nombre, activa) VALUES (?, ?, ?)', [s.id, s.nombre, s.activa]);
      console.log(`  + Sede insertada: ${s.nombre} (${s.id})`);
    }
  }

  // Obtener id de la sede principal
  const [sedes] = await conn.query('SELECT id FROM sedes ORDER BY created_at ASC LIMIT 1');
  const defaultSedeId = sedes.length > 0 ? sedes[0].id : defaultSedes[0].id;

  // 3. Verificar y agregar columnas a tabla `users`
  const [cols] = await conn.query('DESCRIBE users');
  const colNames = cols.map(c => c.Field);

  if (!colNames.includes('sede_id')) {
    await conn.query('ALTER TABLE `users` ADD COLUMN `sede_id` VARCHAR(36) NULL AFTER `role`');
    console.log('✓ Columna `sede_id` agregada a `users`.');
  } else {
    try {
      await conn.query('ALTER TABLE `users` MODIFY COLUMN `sede_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
      console.log('✓ Columna `sede_id` ajustada a VARCHAR(36) utf8mb4_unicode_ci en `users`.');
    } catch (e) {
      // Si ya tiene la FK de TypeORM o ya está ajustada, continuar
    }
  }

  if (!colNames.includes('activo')) {
    await conn.query('ALTER TABLE `users` ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `sede_id`');
    console.log('✓ Columna `activo` agregada a `users`.');
  }

  if (!colNames.includes('debe_cambiar_password')) {
    await conn.query('ALTER TABLE `users` ADD COLUMN `debe_cambiar_password` TINYINT(1) NOT NULL DEFAULT 0 AFTER `activo`');
    console.log('✓ Columna `debe_cambiar_password` agregada a `users`.');
  }

  if (!colNames.includes('intentos_fallidos')) {
    await conn.query('ALTER TABLE `users` ADD COLUMN `intentos_fallidos` INT NOT NULL DEFAULT 0 AFTER `debe_cambiar_password`');
    console.log('✓ Columna `intentos_fallidos` agregada a `users`.');
  }

  if (!colNames.includes('bloqueado_hasta')) {
    await conn.query('ALTER TABLE `users` ADD COLUMN `bloqueado_hasta` TIMESTAMP NULL AFTER `intentos_fallidos`');
    console.log('✓ Columna `bloqueado_hasta` agregada a `users`.');
  }

  // 4. Modificar enum de role para garantizar 'SUPER_ADMIN'
  try {
    await conn.query(`
      ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM(
        'RECEPCIONISTA',
        'JEFE_DE_PATIO',
        'TECNICO',
        'LUBRICADOR',
        'GERENTE_COMERCIAL',
        'ADMINISTRADOR',
        'SUPER_ADMIN'
      ) DEFAULT 'RECEPCIONISTA'
    `);
    console.log('✓ Enum de roles actualizado en `users` con SUPER_ADMIN.');
  } catch (e) {
    console.log('  ! Aviso al actualizar enum de role:', e.message);
  }

  // 5. Asignar sedeId por defecto a usuarios existentes sin sede o con sede no válida
  await conn.query('UPDATE `users` SET `sede_id` = ? WHERE `sede_id` IS NULL OR `sede_id` = "" OR `sede_id` NOT IN (SELECT id FROM (SELECT id FROM sedes) AS s)', [defaultSedeId]);
  await conn.query('UPDATE `users` SET `activo` = 1 WHERE `activo` IS NULL');
  await conn.query('UPDATE `users` SET `debe_cambiar_password` = 0 WHERE `debe_cambiar_password` IS NULL');
  console.log('✓ Usuarios existentes vinculados a sede principal sin romper credenciales.');

  // 6. Asegurar existencia de cuenta SUPER_ADMIN
  const [superAdmins] = await conn.query('SELECT * FROM users WHERE role = "SUPER_ADMIN" OR username = "superadmin"');
  if (superAdmins.length === 0) {
    const superAdminId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Luxury2026*', salt);

    await conn.query(`
      INSERT INTO users (id, username, password, role, nombre, email, cargo, sede_id, activo, debe_cambiar_password)
      VALUES (?, ?, ?, 'SUPER_ADMIN', 'Super Administrador', 'superadmin@luxuryservices.co', 'Super Administrador del Sistema', ?, 1, 0)
    `, [superAdminId, 'superadmin', hashedPassword, defaultSedeId]);
    console.log('✓ Cuenta SUPER_ADMIN creada: username="superadmin", rol="SUPER_ADMIN".');
  }
  await conn.query(`
    UPDATE users SET role = 'SUPER_ADMIN', sede_id = COALESCE(sede_id, ?)
    WHERE username IN ('superadmin', 'admin')
  `, [defaultSedeId]);
  console.log('✓ Cuentas de administración configuradas con rol SUPER_ADMIN.');

  // 7. Eliminar cuentas genéricas o compartidas (desactivar según regla: nunca borrar, solo desactivar)
  const genericUsernames = ['generico', 'compartido', 'compartida', 'guest', 'demo', 'test', 'usuario_anonimo'];
  const [genericUsers] = await conn.query('SELECT id, username FROM users WHERE username IN (?)', [genericUsernames]);
  if (genericUsers.length > 0) {
    for (const gu of genericUsers) {
      await conn.query('UPDATE users SET activo = 0 WHERE id = ?', [gu.id]);
      console.log(`✓ Cuenta genérica/compartida desactivada: ${gu.username} (${gu.id}).`);
    }
  } else {
    console.log('✓ No se detectaron cuentas genéricas o compartidas activas en la BD.');
  }
  // 8. Asegurar columnas de sedeId y recibidoPorId en `orders` e `historial_acciones`
  const [orderCols] = await conn.query('DESCRIBE orders');
  const orderColNames = orderCols.map(c => c.Field);

  if (!orderColNames.includes('sede_id')) {
    await conn.query('ALTER TABLE `orders` ADD COLUMN `sede_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `pertenencias`');
    console.log('✓ Columna `sede_id` agregada a `orders`.');
  }

  if (!orderColNames.includes('recibido_por_id')) {
    await conn.query('ALTER TABLE `orders` ADD COLUMN `recibido_por_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `sede_id`');
    console.log('✓ Columna `recibido_por_id` agregada a `orders`.');
  }

  await conn.query('UPDATE `orders` SET `sede_id` = ? WHERE `sede_id` IS NULL OR `sede_id` = ""', [defaultSedeId]);
  await conn.query('UPDATE `orders` SET `recibido_por_id` = `recepcionista_id` WHERE `recibido_por_id` IS NULL AND `recepcionista_id` IS NOT NULL');

  const [histCols] = await conn.query('DESCRIBE historial_acciones');
  const histColNames = histCols.map(c => c.Field);

  if (!histColNames.includes('sede_id')) {
    await conn.query('ALTER TABLE `historial_acciones` ADD COLUMN `sede_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `user_id`');
    console.log('✓ Columna `sede_id` agregada a `historial_acciones`.');
  }

  await conn.query(`
    UPDATE \`historial_acciones\` h
    JOIN \`orders\` o ON h.order_id = o.id
    SET h.sede_id = COALESCE(o.sede_id, ?)
    WHERE h.sede_id IS NULL OR h.sede_id = ""
  `, [defaultSedeId]);
  console.log('✓ Órdenes e historial vinculados a sede y recibidoPorId.');

  console.log('--- MIGRACIÓN COMPLETADA CON ÉXITO ---');
  await conn.end();
}

runMigration().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
