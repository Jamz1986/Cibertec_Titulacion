import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Server,
  Activity,
  Clock,
  ShieldCheck,
  Laptop,
  Network,
  Cpu,
  Layers,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'zabbix' | 'sla' | 'vmware' | 'operacion' | 'database';
  categoryLabel: string;
  question: string;
  answer: string;
  details?: string[];
  codeSnippet?: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'zabbix',
    categoryLabel: 'Monitoreo Zabbix',
    question: '¿Cómo se generan automáticamente los tickets de incidentes en EduDesk?',
    answer:
      'El sistema implementa una integración orientada a eventos (Event-Driven) entre Zabbix Server 7.0 LTS y la API REST de EduDesk. Cuando un agente Zabbix instalado en una computadora de laboratorio (por ejemplo, PC-ALUMNO-01 en la IP 192.168.30.101) detecta que una métrica supera el umbral crítico (como CPU > 95% o pérdida de conectividad), Zabbix ejecuta un tipo de medio Webhook.',
    details: [
      'El agente recopila la telemetría cada 1 a 30 segundos.',
      'Si se produce la condición de disparo (Trigger), Zabbix arma un objeto JSON con los metadatos del host.',
      'El script envía una petición HTTP POST al endpoint /api/webhooks/zabbix.',
      'EduDesk procesa el JSON, clasifica la criticidad y genera el ticket de soporte automáticamente sin requerir acción humana.',
    ],
  },
  {
    id: 'faq-2',
    category: 'zabbix',
    categoryLabel: 'Monitoreo Zabbix',
    question: '¿Cuál es el formato JSON exacto que envía Zabbix a la API?',
    answer:
      'El webhook transmite un objeto JSON normalizado que contiene el identificador del equipo, su dirección IP, el evento detectado, el valor de la métrica y la severidad.',
    codeSnippet: `{
  "host_name": "PC-ALUMNO-01",
  "ip": "192.168.30.101",
  "event_name": "High CPU utilization (>95%)",
  "severity": "High",
  "item_value": "98.4%",
  "origen": "AUTOMATICO"
}`,
  },
  {
    id: 'faq-3',
    category: 'vmware',
    categoryLabel: 'VMware & Simulación',
    question: '¿Cómo se simula la saturación de una computadora en VMware Workstation?',
    answer:
      'Para demostrar el funcionamiento del sistema en las pruebas de titulación, se utiliza una máquina virtual en VMware Workstation Pro que representa la PC del alumno:',
    details: [
      'En Linux: Ejecutar en la terminal de la máquina virtual el comando: stress-ng --cpu 4 --timeout 60s.',
      'En Windows: Ejecutar un script de PowerShell en bucle o abrir una aplicación de prueba de estrés de CPU.',
      'En menos de 30 segundos, el agente Zabbix detecta el salto de CPU por encima del 95% y emite la alerta hacia el Help Desk.',
      'Al finalizar la prueba, el ticket queda registrado con fecha, hora, métrica exacta (98.4%) y asignación automática a soporte técnico.',
    ],
  },
  {
    id: 'faq-4',
    category: 'vmware',
    categoryLabel: 'VMware & Simulación',
    question: '¿Cómo se simula la caída o desconexión de una computadora virtual?',
    answer:
      'Existen dos métodos sencillos para simular que un equipo se apaga o pierde red en VMware:',
    details: [
      'Método 1 (Desconexión de cable de red): En el menú de VMware Workstation, ir a VM → Settings → Network Adapter y desmarcar la casilla "Connected".',
      'Método 2 (Detención del servicio): En la máquina virtual de Windows, abrir la consola de servicios (services.msc) y detener "Zabbix Agent 2", o en Ubuntu ejecutar: sudo systemctl stop zabbix-agent.',
      'Zabbix detecta la condición "Zabbix agent is not available (or nodata for 30s)" y crea de inmediato el ticket de fallo de conectividad.',
    ],
  },
  {
    id: 'faq-5',
    category: 'sla',
    categoryLabel: 'Acuerdos SLA',
    question: '¿Cuáles son los niveles de prioridad y los tiempos máximos de respuesta (SLA)?',
    answer:
      'Los tiempos de resolución están alineados a las directivas tecnológicas de la Dirección Regional de Educación de Lima Metropolitana (DRELM) y el MINEDU:',
    details: [
      'Baja / Low (< 48 horas): Consultas de software educativo (Scratch, Python), dudas de configuración que no interrumpen clases.',
      'Media / Medium (< 24 horas): Falla de un puesto individual en el Aula de Innovación (1 a 3 alumnos afectados).',
      'Alta / High (< 8 horas): Aula completa sin red, switch de distribución saturado o caída de enlace troncal (30+ alumnos afectados).',
      'Urgente / Urgent (< 2 horas): Caída del enlace principal de fibra, apagón general en jornada de evaluaciones censales oficiales.',
    ],
  },
  {
    id: 'faq-6',
    category: 'sla',
    categoryLabel: 'Acuerdos SLA',
    question: '¿Cómo diferencia el sistema una falla aislada de un apagón masivo?',
    answer:
      'El motor de correlación de EduDesk analiza los eventos simultáneos de telemetría. Si solo falla una dirección IP (192.168.30.101), se categoriza como "FALLA_LOCAL_AISLADA". Si se detecta la pérdida de señal de telecomunicaciones en múltiples nodos de una misma zona o una trampa Last Gasp (0 VAC), el sistema activa el protocolo de "ALERTA CRÍTICA · INTERRUPCIÓN GENERAL DE RED" y habilita la consola de llamada telefónica de contingencia.',
  },
  {
    id: 'faq-7',
    category: 'operacion',
    categoryLabel: 'Operación del Sistema',
    question: '¿Quiénes pueden visualizar, gestionar y cerrar los tickets de soporte?',
    answer:
      'EduDesk implementa control de acceso basado en roles (RBAC):',
    details: [
      'Docentes y Alumnos (Usuario General): Pueden crear solicitudes manuales, ver el estado de sus propios reportes y consultar guías SLA.',
      'Técnicos de Soporte TI: Tienen acceso a la lista global de incidentes, pueden actualizar el estado (Abierto → En Progreso → Resuelto) y agregar notas técnicas de diagnóstico.',
      'Administrador de Red NOC: Acceso total a la topología Packet Tracer, correlación de apagones masivos, registro de llamadas y administración de métricas.',
    ],
  },
  {
    id: 'faq-8',
    category: 'database',
    categoryLabel: 'Base de Datos & Arquitectura',
    question: '¿Cómo se almacena la información y cómo se sincronizan los tickets en pantalla?',
    answer:
      'La arquitectura cuenta con persistencia dual: en el backend Node.js / Express se almacenan en caché seguro y se estructuran para la base de datos relacional MySQL / MariaDB (tablas: tickets_soporte, historial_estados, telemetria_snmp, instituciones_educativas). En el cliente web, un sondeo asíncrono actualiza la interfaz cada 2.5 segundos, permitiendo que las alertas de VMware se muestren en tiempo real sin recargar la página.',
  },
];

export const FAQSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>('faq-1');

  const categories = [
    { id: 'all', label: 'Todas las preguntas' },
    { id: 'zabbix', label: 'Monitoreo Zabbix' },
    { id: 'vmware', label: 'VMware & Simulación' },
    { id: 'sla', label: 'Niveles SLA & Tiempos' },
    { id: 'operacion', label: 'Roles & Operación' },
    { id: 'database', label: 'Base de Datos' },
  ];

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold tracking-wide flex items-center gap-1 border border-indigo-400/30">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Base de Conocimiento & Preguntas Frecuentes</span>
            </span>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-xs text-indigo-200">Soporte Técnico Escolar</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Preguntas Frecuentes sobre EduDesk & Monitoreo Proactivo
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Consulte las respuestas a las interrogantes más frecuentes sobre el flujo automatizado de alertas Zabbix, simulación en máquinas virtuales VMware, cumplimiento de SLA y triaje de incidencias en instituciones educativas.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar pregunta frecuente por palabra clave (ej. CPU, Zabbix, SLA, VMware, roles)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">
              No se encontraron preguntas con los términos buscados
            </h3>
            <p className="text-xs text-slate-500">
              Intente buscar con otra palabra clave o seleccione "Todas las preguntas".
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-xl border transition-all bg-white overflow-hidden ${
                  isExpanded ? 'border-indigo-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                        {faq.categoryLabel}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {faq.question}
                      </h3>
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-xs text-slate-700 space-y-3 bg-slate-50/50">
                    <p className="leading-relaxed">{faq.answer}</p>

                    {faq.details && (
                      <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
                        {faq.details.map((detail, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}

                    {faq.codeSnippet && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                          Estructura JSON del Evento Webhook:
                        </span>
                        <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto border border-slate-800">
                          {faq.codeSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Helpful Quick Tip Card */}
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-start gap-3 text-xs text-indigo-950">
        <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-indigo-900">
            ¿Deseas consultar o registrar un incidente ahora mismo?
          </h4>
          <p className="text-indigo-800 mt-0.5 leading-relaxed">
            Puedes cambiar a la pestaña <strong>«Incidentes & Tickets»</strong> para ver las alertas recibidas en tiempo real desde la máquina virtual VMware o hacer clic en <strong>«Nuevo Ticket»</strong> para crear una solicitud manual de soporte escolar.
          </p>
        </div>
      </div>
    </div>
  );
};
