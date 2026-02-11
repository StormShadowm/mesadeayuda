# 📋 MESA DE AYUDA - SISTEMA MEJORADO

## 🚀 Características Principales

### ✨ Mejoras Implementadas
- **Diseño Moderno**: Interfaz limpia y profesional con animaciones suaves
- **Seguridad Mejorada**: 
  - Prepared statements para prevenir SQL injection
  - Password hashing con BCRYPT
  - Validación de sesiones y timeouts
  - Tokens CSRF para formularios
  - Sanitización de entradas

- **Funcionalidad Completa**:
  - Sistema de tickets con estados
  - Comentarios y respuestas
  - Gestión de usuarios (Admin)
  - Historial de actividades
  - Estadísticas y reportes
  - Subida de archivos segura

### 📦 Estructura del Proyecto
```
mesa_ayuda_mejorada/
├── index.html              # Página de login
├── registro.html           # Registro de usuarios
├── dashboard_admin.html    # Panel administrativo
├── dashboard_user.html     # Panel de usuario
├── config/
│   ├── conexion.php       # Conexión a BD mejorada
│   └── functions.php      # Funciones auxiliares
├── php/
│   ├── login.php         # Autenticación
│   ├── logout.php        # Cerrar sesión
│   ├── registrar_usuario.php
│   ├── user_api.php      # API de usuarios
│   ├── tickets_api.php   # API de tickets
│   └── ...
├── css/
│   └── style.css         # Estilos personalizados
├── js/
│   ├── admin.js          # Lógica admin
│   └── user.js           # Lógica usuario
├── uploads/              # Archivos adjuntos
└── logs/                 # Logs del sistema
```

## 💾 Instalación de Base de Datos

### 1. Crear la base de datos
```sql
CREATE DATABASE mesa_ayuda_final CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mesa_ayuda_final;
```

### 2. Crear tablas (ver archivo SQL_SCHEMA.sql)

### 3. Configurar conexión
Editar `config/conexion.php` con tus credenciales:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'mesa_ayuda_final');
define('DB_USER', 'tu_usuario');
define('DB_PASS', 'tu_contraseña');
```

## 👤 Usuarios por Defecto

**Administrador:**
- Usuario: admin
- Contraseña: Admin123

**Usuario Normal:**
- Usuario: usuario  
- Contraseña: Usuario123

## ⚙️ Requisitos del Sistema

- PHP 7.4 o superior
- MySQL 5.7 o superior
- Extensiones PHP: mysqli, json, fileinfo
- Servidor web (Apache/Nginx)

## 🔒 Recomendaciones de Seguridad

1. Cambiar las contraseñas por defecto
2. Configurar HTTPS en producción
3. Ajustar permisos de carpetas:
   - uploads/: 755
   - logs/: 755
4. Activar error_log en producción
5. Implementar backup automático de BD

## 📝 Notas Importantes

- Los archivos se guardan en la carpeta `uploads/`
- Los logs se guardan en `logs/`
- Las sesiones expiran después de 30 minutos de inactividad
- Las contraseñas deben tener mínimo 8 caracteres, una mayúscula y un número

## 🐛 Solución de Problemas

### Error de conexión a BD
- Verificar credenciales en `config/conexion.php`
- Asegurar que MySQL esté corriendo
- Verificar que la BD existe

### Sesión no inicia
- Verificar permisos de carpeta de sesiones de PHP
- Revisar `session.save_path` en php.ini

### Archivos no se suben
- Verificar permisos de carpeta `uploads/`
- Revisar `upload_max_filesize` y `post_max_size` en php.ini

## 📞 Soporte

Para reportar bugs o sugerencias, contacta al administrador del sistema.

---
**Versión**: 2.0 Mejorada
**Última actualización**: 2026
