# 🎫 Mesa de Ayuda - Sistema Mejorado v2.0

## ✨ Características

### Diseño Moderno
- Interfaz limpia y profesional
- Animaciones suaves
- 100% Responsive
- Paleta de colores moderna

### Seguridad Reforzada
- ✅ Prepared Statements (anti SQL Injection)
- ✅ Password Hashing con BCrypt
- ✅ Validación de sesiones con timeout
- ✅ Sanitización de entradas
- ✅ Protección XSS

### Funcionalidad Completa
- Sistema de tickets (crear, ver, comentar, cambiar estado)
- Gestión de usuarios (solo admin)
- Estadísticas en tiempo real
- Historial de actividades
- Múltiples roles (Admin Superior, Admin Intermedio, Técnico, Usuario)

## 📦 Instalación

### 1. Requisitos
- PHP 7.4+
- MySQL 5.7+
- Servidor Web (Apache/Nginx)

### 2. Pasos

1. **Extraer archivos** en la carpeta del servidor (htdocs, www, etc.)

2. **Crear base de datos**
```sql
CREATE DATABASE mesa_ayuda_final 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **Importar SQL**
```bash
mysql -u root -p mesa_ayuda_final < SQL_SCHEMA.sql
```

4. **Configurar conexión**
Editar `config/conexion.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'mesa_ayuda_final');
define('DB_USER', 'tu_usuario');
define('DB_PASS', 'tu_contraseña');
```

5. **Configurar permisos**
```bash
chmod 755 uploads/
chmod 755 logs/
```

6. **Acceder**
http://localhost/mesa_ayuda_mejorada/

## 👤 Usuarios por Defecto

**Administrador:**
- Usuario: `admin`
- Contraseña: `Admin123`

**Usuario Normal:**
- Usuario: `usuario`
- Contraseña: `Usuario123`

⚠️ **IMPORTANTE:** Cambiar estas contraseñas en producción

## 📁 Estructura

```
mesa_ayuda_mejorada/
├── index.html              # Login
├── registro.html           # Registro
├── dashboard_admin.html    # Panel admin
├── dashboard_user.html     # Panel usuario
├── config/
│   ├── conexion.php       # Conexión BD
│   └── functions.php      # Funciones
├── php/
│   ├── login.php
│   ├── logout.php
│   ├── user_api.php
│   ├── tickets_api.php
│   └── registrar_usuario.php
├── js/
│   ├── admin.js
│   └── user.js
├── css/
│   └── style.css
├── uploads/               # Archivos adjuntos
└── logs/                  # Logs del sistema
```

## 🔧 Configuración Adicional

### PHP.ini Recomendado
```ini
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 300
session.gc_maxlifetime = 1800
```

### Apache .htaccess (Opcional)
```apache
# Proteger archivos sensibles
<FilesMatch "\.(php|sql)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Habilitar HTTPS (recomendado en producción)
# RewriteEngine On
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 🐛 Solución de Problemas

### Error de conexión a BD
- Verificar credenciales en `config/conexion.php`
- Asegurar que MySQL está corriendo
- Verificar que la base de datos existe

### Sesión no inicia
- Verificar permisos de carpeta de sesiones PHP
- Revisar `session.save_path` en php.ini

### Archivos no se suben
- Verificar permisos de carpeta `uploads/`
- Revisar `upload_max_filesize` en php.ini

## 📊 Características Técnicas

### Backend
- PHP con MySQLi
- Prepared Statements
- Separación de responsabilidades
- API REST estilo JSON

### Frontend
- HTML5 + CSS3
- JavaScript Vanilla
- Bootstrap 5.3
- Diseño responsive

### Base de Datos
- MySQL con InnoDB
- Relaciones con Foreign Keys
- Índices optimizados
- Triggers para historial

## 🔒 Seguridad

### Implementado
- ✅ SQL Injection Protection
- ✅ XSS Protection
- ✅ CSRF Protection (preparado)
- ✅ Password Hashing (BCrypt cost 12)
- ✅ Session Management
- ✅ Input Sanitization

### Recomendaciones
1. Usar HTTPS en producción
2. Implementar rate limiting
3. Backups automáticos
4. Actualizar dependencias
5. Logs de seguridad

## 📝 Notas

- Los archivos se guardan en `uploads/`
- Los logs en `logs/`
- Sesiones expiran a los 30 minutos
- Contraseñas: mínimo 8 caracteres, 1 mayúscula, 1 número

## 🆘 Soporte

Para bugs o sugerencias, contacta al administrador del sistema.

---

**Versión:** 2.0 Mejorada  
**Fecha:** Febrero 2026  
**Licencia:** Uso libre
