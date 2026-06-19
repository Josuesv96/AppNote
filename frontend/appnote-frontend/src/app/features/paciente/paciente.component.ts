import { Component, OnInit, AfterViewChecked, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { EntradaService, Entrada } from '../../core/services/entrada.service';
import { ExpedienteService } from '../../core/services/expediente.service';
import { Chart, registerables } from 'chart.js';
import { pendienteRegresion, lineaTendencia } from '../../core/utils/stats.utils';

Chart.register(...registerables);

const EMOCIONES = ['Alegría','Calma','Gratitud','Esperanza','Tristeza','Enojo','Miedo','Frustración','Soledad','Ansiedad','Orgullo','Agotamiento'];
const EMOCIONES_POSITIVAS = new Set(['Alegría','Calma','Gratitud','Esperanza','Orgullo']);

@Component({
  selector: 'app-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paciente.component.html',
  styleUrl: './paciente.component.scss'
})
export class PacienteComponent implements OnInit, AfterViewChecked {
  @ViewChild('evolucionChart') evolucionChartRef!: ElementRef;

  vista: 'escribir' | 'historial' | 'expediente' | 'evolucion' = 'escribir';

  // Entrada
  texto = '';
  estadoAnimo = 5;
  ansiedad = 3;
  contexto = '';
  emocionesDisponibles = EMOCIONES;
  emocionesSeleccionadas: Set<string> = new Set();
  entradas: Entrada[] = [];
  guardando = false;
  mensajeGuardado = false;
  hoy = '';
  entradaAEliminar: Entrada | null = null;
  eliminandoEntrada = false;

  // Expediente
  expediente: any = {};
  editandoExpediente = false;
  guardandoExpediente = false;
  mensajeExpediente = '';
  errorExpediente = '';
  expFechaNacimiento = '';
  expGenero = '';
  expTelefono = '';
  expDireccion = '';
  expEmergenciaNombre = '';
  expEmergenciaTelefono = '';
  expEmergenciaRelacion = '';

  // Evolución
  rangoTiempo: 'semana' | 'mes' | 'todo' = 'mes';
  entradasFiltradas: Entrada[] = [];
  promAnimo: number = 0;
  promAnsiedad: number = 0;
  promAnimoAnterior: number | null = null; // para comparación
  tendenciaAnimo: string = '';
  emocionesFrec: [string, number][] = [];
  emocionesPositivas: [string, number][] = [];
  emocionesNegativas: [string, number][] = [];
  notaSistema: string = '';
  comparacionTexto: string = '';
  totalEntradas: number = 0;
  private chart: Chart | null = null;
  private pendingChart = false;

  constructor(
    public auth: AuthService,
    private entradaService: EntradaService,
    private expedienteService: ExpedienteService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const now = new Date();
    this.hoy = now.toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    this.cargarEntradas();
    this.cargarExpediente();
  }

  ngAfterViewChecked() {
    if (this.pendingChart && this.evolucionChartRef) {
      this.pendingChart = false;
      this.renderChart();
    }
  }

  cambiarVista(v: 'escribir' | 'historial' | 'expediente' | 'evolucion') {
    this.vista = v;
    if (v === 'evolucion') {
      this.destruirChart();
      this.pendingChart = true;
    }
    this.cdr.detectChanges();
  }

  cargarEntradas() {
    this.entradaService.misEntradas().subscribe(e => {
      this.entradas = e;
      this.calcularEstadisticas();
      this.cdr.detectChanges();
    });
  }

  // Agrupa entradas del mismo día promediando valores
  agruparPorDia(entradas: Entrada[]): { fecha: string, animo: number, ansiedad: number }[] {
    const mapa: Record<string, { animos: number[], ansiedades: number[] }> = {};
    entradas.forEach(e => {
      const fecha = new Date(e.timestamp).toLocaleDateString('es-GT', { day:'2-digit', month:'short' });
      if (!mapa[fecha]) mapa[fecha] = { animos: [], ansiedades: [] };
      mapa[fecha].animos.push(e.estado_animo);
      mapa[fecha].ansiedades.push(e.ansiedad);
    });
    return Object.entries(mapa).map(([fecha, v]) => ({
      fecha,
      animo: +(v.animos.reduce((a, b) => a + b, 0) / v.animos.length).toFixed(1),
      ansiedad: +(v.ansiedades.reduce((a, b) => a + b, 0) / v.ansiedades.length).toFixed(1)
    }));
  }

  filtrarPorRango(rango: 'semana' | 'mes' | 'todo'): Entrada[] {
    const ahora = new Date();
    if (rango === 'semana') {
      const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      return this.entradas.filter(e => new Date(e.timestamp) >= hace7);
    } else if (rango === 'mes') {
      const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      return this.entradas.filter(e => new Date(e.timestamp) >= hace30);
    }
    return [...this.entradas];
  }

  calcularEstadisticas() {
    let filtradas = this.filtrarPorRango(this.rangoTiempo);
    filtradas.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    this.entradasFiltradas = filtradas;
    this.totalEntradas = filtradas.length;

    if (!filtradas.length) {
      this.promAnimo = 0; this.promAnsiedad = 0;
      this.emocionesFrec = []; this.emocionesPositivas = []; this.emocionesNegativas = [];
      this.notaSistema = ''; this.tendenciaAnimo = ''; this.comparacionTexto = '';
      return;
    }

    this.promAnimo = +(filtradas.reduce((a, e) => a + e.estado_animo, 0) / filtradas.length).toFixed(1);
    this.promAnsiedad = +(filtradas.reduce((a, e) => a + e.ansiedad, 0) / filtradas.length).toFixed(1);

    // Comparación con período anterior
    this.calcularComparacion();

    // Tendencia por regresión lineal
    const animos = filtradas.map(e => e.estado_animo);
    const pendiente = pendienteRegresion(animos);

    if (pendiente > 0.2) this.tendenciaAnimo = '📈 Tu ánimo ha mejorado en este período';
    else if (pendiente < -0.2) this.tendenciaAnimo = '📉 Tu ánimo ha bajado un poco en este período';
    else this.tendenciaAnimo = '➡️ Tu ánimo se ha mantenido estable';

    // Emociones frecuentes
    const conteo: Record<string, number> = {};
    filtradas.forEach(e => {
      if (e.emociones) e.emociones.split(',').filter(x => x).forEach(emo => {
        conteo[emo] = (conteo[emo] || 0) + 1;
      });
    });
    this.emocionesFrec = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 6) as [string, number][];
    this.emocionesPositivas = this.emocionesFrec.filter(e => EMOCIONES_POSITIVAS.has(e[0]));
    this.emocionesNegativas = this.emocionesFrec.filter(e => !EMOCIONES_POSITIVAS.has(e[0]));

    // Nota del sistema — balanceada
    this.generarNotaSistema(pendiente);
  }

  comparacionTipo: 'mejora' | 'baja' | 'estable' = 'estable';

  calcularComparacion() {
    if (this.rangoTiempo === 'todo') { this.comparacionTexto = ''; return; }
    const ahora = new Date();
    let inicioAnterior: Date, finAnterior: Date;

    if (this.rangoTiempo === 'semana') {
      const inicioActual = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      inicioAnterior = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000);
      finAnterior = inicioActual;
    } else {
      const inicioActual = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      inicioAnterior = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000);
      finAnterior = inicioActual;
    }

    const anterior = this.entradas.filter(e => {
      const t = new Date(e.timestamp);
      return t >= inicioAnterior && t < finAnterior;
    });

    if (!anterior.length) { this.comparacionTexto = ''; return; }

    this.promAnimoAnterior = +(anterior.reduce((a, e) => a + e.estado_animo, 0) / anterior.length).toFixed(1);
    const diff = +(this.promAnimo - this.promAnimoAnterior).toFixed(1);
    const periodo = this.rangoTiempo === 'semana' ? 'la semana pasada' : 'el mes pasado';

    if (diff > 0.3) {
      this.comparacionTipo = 'mejora';
      this.comparacionTexto = `Tu ánimo mejoró respecto a ${periodo}: ${this.promAnimo}/10 vs ${this.promAnimoAnterior}/10. ¡Buen avance!`;
    } else if (diff < -0.3) {
      this.comparacionTipo = 'baja';
      this.comparacionTexto = `Tu ánimo bajó un poco respecto a ${periodo}: ${this.promAnimo}/10 vs ${this.promAnimoAnterior}/10. Vale la pena hablarlo en terapia.`;
    } else {
      this.comparacionTipo = 'estable';
      this.comparacionTexto = `Tu ánimo se mantuvo similar a ${periodo}: ${this.promAnimo}/10 vs ${this.promAnimoAnterior}/10.`;
    }
  }

  generarNotaSistema(pendiente: number) {
    const topPos = this.emocionesPositivas[0]?.[0];
    const topNeg = this.emocionesNegativas[0]?.[0];
    const frecPos = this.emocionesPositivas[0]?.[1] || 0;
    const frecNeg = this.emocionesNegativas[0]?.[1] || 0;

    if (pendiente > 0.3 && frecPos >= frecNeg) {
      this.notaSistema = topPos
        ? `Tu ánimo ha mejorado. Registraste "${topPos}" con frecuencia — eso es un recurso valioso que tienes.${topNeg ? ` La "${topNeg}" también apareció, y es completamente válido sentirla.` : ''}`
        : `Tu ánimo ha mejorado en este período. ¡Sigue adelante!`;
    } else if (pendiente < -0.3 || (frecNeg > frecPos && this.promAnimo < 6)) {
      this.notaSistema = topNeg
        ? `Has identificado "${topNeg}" con frecuencia. Reconocer emociones difíciles es un paso importante.${topPos ? ` También aparece "${topPos}", que muestra tu capacidad de recuperación.` : ''} Habla esto con tu terapeuta.`
        : `Ha habido momentos difíciles este período. Compartirlos con tu terapeuta puede ser muy útil.`;
    } else {
      // Balanceado — hay positivas y negativas similares
      if (topPos && topNeg && Math.abs(frecPos - frecNeg) <= 1) {
        this.notaSistema = `Registraste "${topPos}" y "${topNeg}" con frecuencia similar. Eso muestra un panorama emocional complejo — completamente humano. Tu terapeuta puede ayudarte a entenderlo mejor.`;
      } else if (topPos) {
        this.notaSistema = `En general ha sido un período estable. "${topPos}" aparece con frecuencia como recurso positivo.`;
      } else {
        this.notaSistema = `Has registrado varias emociones este período. Compartirlas con tu terapeuta en la próxima sesión puede ser de gran ayuda.`;
      }
    }
  }

  cambiarRango(r: 'semana' | 'mes' | 'todo') {
    this.rangoTiempo = r;
    this.calcularEstadisticas();
    this.destruirChart();
    this.pendingChart = true;
    this.cdr.detectChanges();
  }

  renderChart() {
    const canvas = this.evolucionChartRef?.nativeElement;
    if (!canvas || !this.entradasFiltradas.length) return;

    // Agrupar por día para evitar fechas duplicadas
    const agrupado = this.agruparPorDia(this.entradasFiltradas);
    const labels = agrupado.map(d => d.fecha);
    const animos = agrupado.map(d => d.animo);
    const ansiedades = agrupado.map(d => d.ansiedad);

    // Línea de tendencia (regresión lineal)
    const tendencia = lineaTendencia(animos);

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Mi ánimo',
            data: animos,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 5, pointHoverRadius: 7,
          },
          {
            label: 'Mi ansiedad',
            data: ansiedades,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.06)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#f59e0b',
            pointRadius: 5, pointHoverRadius: 7,
          },
          {
            label: 'Tendencia del ánimo',
            data: tendencia,
            borderColor: '#3b82f6',
            borderDash: [5, 4],
            borderWidth: 1.5,
            pointRadius: 0, fill: false, tension: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            min: 1, max: 10,
            ticks: { stepSize: 1, callback: v => `${v}/10` },
            grid: { color: 'rgba(0,0,0,0.05)' },
            title: { display: true, text: 'Escala 1-10', color: '#94a3b8', font: { size: 11 } }
          },
          x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { maxRotation: 30 } }
        },
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}/10` } }
        }
      }
    });
  }

  destruirChart() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }

  // Expediente
  cargarExpediente() {
    this.expedienteService.getMiExpediente().subscribe(exp => {
      this.expediente = exp;
      this.llenarForm(exp);
      this.cdr.detectChanges();
    });
  }

  llenarForm(exp: any) {
    this.expFechaNacimiento = exp.fecha_nacimiento || '';
    this.expGenero = exp.genero || '';
    this.expTelefono = exp.telefono || '';
    this.expDireccion = exp.direccion || '';
    this.expEmergenciaNombre = exp.emergencia_nombre || '';
    this.expEmergenciaTelefono = exp.emergencia_telefono || '';
    this.expEmergenciaRelacion = exp.emergencia_relacion || '';
  }

  editarExpediente() { this.editandoExpediente = true; this.mensajeExpediente = ''; this.errorExpediente = ''; }
  cancelarExpediente() { this.editandoExpediente = false; this.llenarForm(this.expediente); }

  guardarExpediente() {
    this.guardandoExpediente = true;
    this.mensajeExpediente = ''; this.errorExpediente = '';
    const datos: any = {};
    if (this.expFechaNacimiento) datos.fecha_nacimiento = this.expFechaNacimiento;
    if (this.expGenero) datos.genero = this.expGenero;
    if (this.expTelefono) datos.telefono = this.expTelefono;
    if (this.expDireccion) datos.direccion = this.expDireccion;
    if (this.expEmergenciaNombre) datos.emergencia_nombre = this.expEmergenciaNombre;
    if (this.expEmergenciaTelefono) datos.emergencia_telefono = this.expEmergenciaTelefono;
    if (this.expEmergenciaRelacion) datos.emergencia_relacion = this.expEmergenciaRelacion;
    this.expedienteService.actualizarMiExpediente(datos).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.guardandoExpediente = false;
        this.editandoExpediente = false;
        this.mensajeExpediente = '✓ Expediente actualizado';
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeExpediente = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (e) => {
        this.guardandoExpediente = false;
        this.errorExpediente = e.error?.detail || 'Error al guardar';
        this.cdr.detectChanges();
      }
    });
  }

  toggleEmocion(emo: string) {
    if (this.emocionesSeleccionadas.has(emo)) this.emocionesSeleccionadas.delete(emo);
    else this.emocionesSeleccionadas.add(emo);
  }

  guardar() {
    if (!this.texto.trim()) return;
    this.guardando = true;
    this.entradaService.crearEntrada({
      texto: this.texto, estado_animo: this.estadoAnimo,
      ansiedad: this.ansiedad, emociones: [...this.emocionesSeleccionadas], contexto: this.contexto
    }).subscribe({
      next: () => {
        this.guardando = false; this.mensajeGuardado = true;
        this.texto = ''; this.contexto = '';
        this.estadoAnimo = 5; this.ansiedad = 3;
        this.emocionesSeleccionadas.clear();
        this.cargarEntradas();
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeGuardado = false; this.cdr.detectChanges(); }, 2500);
      },
      error: () => { this.guardando = false; this.cdr.detectChanges(); }
    });
  }

  // Eliminar entrada (con confirmación)
  confirmarEliminar(e: Entrada) {
    this.entradaAEliminar = e;
    this.cdr.detectChanges();
  }

  cancelarEliminar() {
    this.entradaAEliminar = null;
    this.cdr.detectChanges();
  }

  ejecutarEliminar() {
    if (!this.entradaAEliminar) return;
    this.eliminandoEntrada = true;
    this.cdr.detectChanges();
    this.entradaService.eliminarEntrada(this.entradaAEliminar.id).subscribe({
      next: () => {
        this.eliminandoEntrada = false;
        this.entradaAEliminar = null;
        this.cargarEntradas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.eliminandoEntrada = false;
        this.entradaAEliminar = null;
        this.cdr.detectChanges();
      }
    });
  }

  getEmociones(e: Entrada): string[] {
    return e.emociones ? e.emociones.split(',').filter(x => x) : [];
  }

  formatFecha(ts: string): string {
    return new Date(ts).toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  generoBonito(g: string): string {
    const map: any = { masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro', prefiero_no_decir: 'Prefiero no decir' };
    return map[g] || '—';
  }
}