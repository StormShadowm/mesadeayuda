# 🎫 Mesa de Ayuda - Sistema Mejorado v2.0

## ✨ Características

### Diseño Moderno

- Interfaz limpia y profesional
- Animaciones suaves
- 100% Responsive
- Paleta de colores moderna

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

## 👤 Usuarios por Defecto

**Administrador:**

- Usuario: `admin`
- Contraseña: `Admin123`

**Usuario Normal:**

- Usuario: `usuario`
- Contraseña: `Usuario123`

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
