# Sistema Automatizado de Gestión de Incidencias de TI con Telemetría Zabbix y Entorno de Pruebas VMware vSphere

### Plataforma Unificada de Mesa de Ayuda TI para Instituciones Educativas de Lima Metropolitana (MINEDU - DRELM / UGEL 01 al 07)

---

## 1. Descripción del Proyecto

El presente proyecto constituye una solución tecnológica integral de **Mesa de Ayuda (Help Desk) y Monitoreo Proactivo de Infraestructura TI**, orientada a optimizar los tiempos de respuesta y garantizar la continuidad operativa de los equipos de cómputo y conectividad en las Instituciones Educativas (I.E.) y Aulas de Innovación Pedagógica (AIP) de Lima Metropolitana bajo jurisdicción de la **DRELM** y las **UGEL 01 al 07**.

El sistema integra:
1. **Recepción Automática de Telemetría SNMP / Zabbix Agent** ante fallas de hardware, caídas de enlace de red y saturación de recursos.
2. **Detección Automatizada de Cortes de Energía Eléctrica (Apagones Masivos) y Desconexión Silenciosa** mediante correlación zonal y análisis de traps SNMP RFC 1628 de UPS.
3. **Consola de Contingencia Telefónica** para comunicación inmediata con el Director, Coordinador CIST o empresa distribuidora de energía (Enel / Luz del Sur).
4. **Banco de Pruebas Virtualizado en VMware vSphere (ESXi 7.0)** para replicar y validar fallas de software antes del despacho de personal técnico a las sedes educativas.
5. **Algoritmo de Priorización SLA** basado en impacto pedagógico, urgencia técnica y criticidad del servicio.

---

## 2. Arquitectura General del Sistema

```
[ PC Cliente / Lab AIP ]          [ Servidor Unificado Ubuntu 22.04 LTS ]
(Windows 10 / Ubuntu)                      (IP: 192.168.40.10)
        |                                           |
   [Zabbix Agent] -------------------------→ [Zabbix Server 7.0]
   (Puerto 10050)       Métricas / ICMP      (Puerto 10051)
                                                    |
                                             [Zabbix Webhook]
                                                    | (HTTP POST JSON)
                                                    ↓
                                         [Plataforma HelpDesk EduDesk]
                                         - Frontend: React 19 + TypeScript + Vite
                                         - Backend/API: Node.js / Spring Boot
                                         - Base de Datos: MySQL 8.0 (InnoDB)
                                                    |
                                                    ↓
                                         [Hipervisor VMware ESXi 7.0]
                                         - VM Clon: PC-ALUMNO-01-LAB
                                         - Pruebas de compatibilidad y snapshot
```

---

## 3. Hoja de Ruta de Implementación en VMware

### Fase 1: Preparación de la Infraestructura Virtual (Servidores y Redes)
- **Paso 1:** Creación de la Máquina Virtual del Servidor Unificado en VMware vSphere/Workstation (2 vCPU, 4GB RAM, 50GB Disco).
- **Paso 2:** Instalación del sistema operativo base **Ubuntu Server 22.04 LTS**.
- **Paso 3:** Configuración de direccionamiento estático IP: `192.168.40.10/24`, Gateway: `192.168.40.1`, DNS: `8.8.8.8`.
- **Paso 4:** Creación de la Máquina Virtual Cliente (`PC-ALUMNO-01`) representando un terminal de laboratorio escolar.
- **Paso 5:** Verificación de conectividad bidireccional (Ping / ICMP) entre el Servidor Unificado y la PC Cliente.

### Fase 2: Despliegue de la Plataforma de Monitoreo
- **Paso 6:** Instalación del motor de Base de Datos MySQL 8.0 y creación del esquema para Zabbix y EduDesk:
  ```sql
  CREATE DATABASE edudesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'edudesk_user'@'localhost' IDENTIFIED BY 'MinEdu2026$Secure';
  GRANT ALL PRIVILEGES ON edudesk_db.* TO 'edudesk_user'@'localhost';
  FLUSH PRIVILEGES;
  ```
- **Paso 7:** Instalación y configuración de **Zabbix Server 7.0 LTS** con interfaz web en Nginx/Apache.
- **Paso 8:** Instalación de **Zabbix Agent** en la máquina virtual cliente para monitoreo de métricas (CPU, RAM, disco, disponibilidad del servicio).

### Fase 3: Despliegue del Help Desk e Integración
- **Paso 9:** Despliegue de la interfaz de usuario de HelpDesk EduDesk.
- **Paso 10:** Configuración del **Webhook en Zabbix**:
  - Creación del Media Type `EduDesk-Webhook`.
  - Configuración del script de notificación que envía eventos de fallo a la API del Help Desk.
- **Paso 11:** Prueba de concepto integral:
  - Simulación de caída del servicio de red en `PC-ALUMNO-01`.
  - Generación automática del ticket con prioridad **ALTA / CRÍTICA**.
  - Validación del escalamiento hacia el sandbox de VMware.

---

## 4. Requisitos y Ejecución Local

### Prerrequisitos
- Node.js versión 18 o superior.
- Gestor de paquetes `npm` (incluido con Node.js).
- Navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox).

### Pasos para iniciar el sistema:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU-USUARIO/helpdesk-zabbix-minedu.git
   cd helpdesk-zabbix-minedu
   ```

2. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Ejecutar el servidor de desarrollo local:**
   ```bash
   npm run dev
   ```

4. **Acceder a la aplicación:**
   Abrir en el navegador: [http://localhost:3000](http://localhost:3000)

5. **Compilar para producción (despliegue en servidor web Apache/Nginx):**
   ```bash
   npm run build
   ```
   Los archivos estáticos optimizados se generarán en la carpeta `dist/`.

---

## 5. Control de Acceso y Credenciales de los 4 Integrantes

El sistema cuenta con autenticación por credenciales institucionales para los 4 miembros del Grupo 01 (CIBERTEC):

| Integrante | Especialidad | Usuario | Contraseña | Rol / Permisos |
| :--- | :--- | :--- | :--- | :--- |
| **Josealejandro Hinojosa Quispe** | Redes y Comunicaciones | `jhinojosa` | `hinojosa2026` | **ADMIN:** Jefe de Proyecto / SysAdmin NOC & Zabbix Server |
| **Leonardo Granados Ortega** | Redes y Comunicaciones | `lgranados` | `granados2026` | **TECNICO:** Analista de Infraestructura TI & Sandbox VMware |
| **Renzo Fonseca Vilchez** | Redes y Comunicaciones | `rfonseca` | `fonseca2026` | **ADMIN:** Analista de Redes Cisco / Packet Tracer (`TOPOLOGIA.pkt`) |
| **Maria Gonzales Lozano** | Computación e Informática | `mgonzales` | `gonzales2026` | **TECNICO:** Analista de Desarrollo Software Java & BD MySQL |

---

## 6. Topología Cisco Packet Tracer (`TOPOLOGIA.pkt`)

El proyecto incluye el diseño y simulación en Cisco Packet Tracer v8.2 con enrutamiento Inter-VLAN (Router-on-a-Stick):
* **VLAN 10:** Administración (`192.168.10.0/24`) - Switch 2960 `SW-ADMINISTRACION`.
* **VLAN 20:** Académica / Docentes (`192.168.20.0/24`) - Switch 2960 `SW-ACADEMICO` y AP Wireless.
* **VLAN 30:** Laboratorio de Cómputo (`192.168.30.0/24`) - Switch 2960 `SW-LAB-COMPUTO` (40 PCs).
* **VLAN 40:** Data Center & Servidores (`192.168.40.0/24`) - Router Cisco 2911 ISR `R1` y Servidor Zabbix (`192.168.40.10:10051`).

---

## 7. Licencia y Uso Institucional
Proyecto de Titulación Profesional · Instituto Superior Tecnológico Privado CIBERTEC / MINEDU Lima Metropolitana. Asesor: Huapaya Vasquez Juan Alberto.

