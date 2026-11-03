import React, { useState, useEffect } from 'react';
import {
  Server,
  X,
  Copy,
  Check,
  Terminal,
  Activity,
  AlertTriangle,
  Play,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { Ticket } from '../types/helpdesk';

interface ZabbixConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketInjected?: (ticket: Ticket) => void;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  hostName?: string;
  eventName?: string;
  status: number;
  message: string;
}

export const ZabbixConnectionModal: React.FC<ZabbixConnectionModalProps> = ({
  isOpen,
  onClose,
  onTicketInjected,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Exact Cloud Run URL detected from window.location.origin
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ais-dev-kzl72i7vitrkbyopieu6nv-542924610480.us-east1.run.app';

  const webhookEndpointUrl = `${currentOrigin}/api/webhooks/zabbix`;

  const curlCommand = `curl -i -X POST "${webhookEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"host_name":"servidor-zabbix","ip":"192.168.40.10","event_name":"Windows: Zabbix agent is not available (or nodata for 30s)","item_value":"0","severity":"High","origen":"AUTOMATICO"}'`;

  const copyToClipboard = (text: string, type: 'url' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2500);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/webhooks/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSimulateWindowsFailure = async () => {
    setIsSimulating(true);
    setSimulationSuccess(null);
    try {
      const res = await fetch('/api/webhooks/zabbix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_name: 'servidor-zabbix',
          ip: '192.168.40.10',
          event_name: 'Windows: Zabbix agent is not available (or nodata for 30s)',
          item_value: '0',
          severity: 'High',
          origen: 'AUTOMATICO',
          titulo: 'Alerta Zabbix SNMP: Falla en servidor-zabbix (PC Alumno)',
          descripcion: 'El agente Zabbix reporta un problema crítico en la infraestructura. Máquina virtual de alumno no responde a sondeo de telemetría.',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationSuccess(`¡Alerta generada con éxito! Código: ${data.ticketCode || 'TK-ZABBIX'}`);
        if (data.ticket && onTicketInjected) {
          onTicketInjected(data.ticket);
        }
        fetchLogs();
      } else {
        setSimulationSuccess('Error al emitir la alerta HTTP ' + res.status);
      }
    } catch (err: any) {
      setSimulationSuccess('Error de red: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Guía de Conexión Zabbix · Servidor Ubuntu & VMware
              </h2>
              <p className="text-xs text-slate-500">
                Paso a paso para conectar la máquina virtual de tu compañero con EduDesk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Diagnostic Box - Based on user screenshots */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Diagnóstico de la falla vista en tus 4 capturas:</span>
            </div>
            <ul className="space-y-1.5 list-disc pl-5 text-amber-950">
              <li>
                <strong>Causa 1 (URL incorrecta en Captura 1):</strong> En la configuración de Zabbix, el parámetro <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">URL</code> apunta a <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">https://cibertec-titulacion.vercel.ap...</code>. Al no tener la URL de Cloud Run donde está abierta tu pantalla, los eventos van a otro servidor o fallan por nombre incompleto.
              </li>
              <li>
                <strong>Causa 2 (Ruta del Webhook en Captura 2 y 3):</strong> El script de JavaScript ejecuta <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">req.post(params.URL)</code>. Por tanto, el parámetro <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">URL</code> debe incluir la ruta completa: <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">/api/webhooks/zabbix</code>.
              </li>
              <li>
                <strong>Causa 3 (Status 2 en la base de datos MySQL en Captura 4):</strong> Los registros con <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">status = 2</code> en la tabla <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">alerts</code> indican que Zabbix lanzó una excepción al no recibir respuesta HTTP 200/201.
              </li>
            </ul>
          </div>

          {/* Step 1: The Exact URL to put in Zabbix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                1. URL Exacta que tu compañero debe poner en Zabbix:
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Acepta POST · Sin bloqueo CORS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookEndpointUrl}
                className="flex-1 font-mono text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookEndpointUrl, 'url')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              En Zabbix: Menú <strong>Alerts → Media types → EduDesk Webhook → Parameters</strong>. Edita el parámetro <strong>URL</strong> y reemplázalo por esta dirección.
            </p>
          </div>

          {/* Step 2: Test from Ubuntu terminal (servidor-zabbix) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                2. Probar con cURL desde la terminal de Ubuntu (servidor-zabbix):
              </span>
              <button
                onClick={() => copyToClipboard(curlCommand, 'curl')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? '¡Comando Copiado!' : 'Copiar comando cURL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border border-slate-800">
              {curlCommand}
            </pre>
            <p className="text-[11px] text-slate-500">
              Al pegar este comando en la terminal negra de tu compañero (<code className="font-mono text-slate-700">root@servidor-zabbix:/home/ubuntu#</code>), devolverá inmediatamente <strong>HTTP/2 200 OK</strong> y creará el ticket en pantalla.
            </p>
          </div>

          {/* Step 3: Instructions to simulate failure inside VMware Workstation */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-600" />
              <span>3. Cómo provocar la falla dentro de la máquina virtual (VMware):</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Para que el ticket se genere desde la máquina virtual de tu compañero, él debe realizar cualquiera de estas dos acciones en el equipo monitoreado:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block">Opción A: Detener el Agente Zabbix</span>
                <p className="text-[10px] text-slate-500 mt-0.5">En Windows (CMD como Admin):</p>
                <code className="block bg-slate-900 text-emerald-400 p-1.5 rounded font-mono text-[10px] mt-1 select-all">
                  net stop "Zabbix Agent"
                </code>
                <p className="text-[10px] text-slate-500 mt-1">Zabbix detectará nodata tras 30s y enviará el webhook automáticamente.</p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block">Opción B: Sobrecarga de CPU (&gt;95%)</span>
                <p className="text-[10px] text-slate-500 mt-0.5">En PowerShell (en la PC del alumno):</p>
                <code className="block bg-slate-900 text-emerald-400 p-1.5 rounded font-mono text-[10px] mt-1 select-all">
                  while($true)&#123;&#125;
                </code>
                <p className="text-[10px] text-slate-500 mt-1">Llevará la CPU al 100% y disparará la alarma de alta utilización.</p>
              </div>
            </div>
          </div>

          {/* Live Webhook Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-900 text-sm">
                  Registro de eventos en vivo recibidos por el Webhook
                </span>
              </div>
              <button
                onClick={fetchLogs}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                Esperando la primera llamada HTTP desde la máquina virtual de Zabbix...
              </div>
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between gap-3 text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 px-1.5 py-0.5 rounded bg-slate-200">
                          {log.method} {log.path}
                        </span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            log.status === 200
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          HTTP {log.status}
                        </span>
                        <span className="font-mono text-slate-400">{log.timestamp}</span>
                      </div>
                      <p className="font-medium text-slate-800">
                        {log.eventName || log.message}
                      </p>
                      {log.hostName && (
                        <p className="text-slate-500 font-mono text-[10px]">
                          Host: {log.hostName} · IP: {log.ip}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">
                      Procesado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            Entendido, cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
};
