import { Component, OnInit, AfterViewChecked, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TerapeutaService } from '../../core/services/terapeuta.service';
import { ExpedienteService } from '../../core/services/expediente.service';
import { Chart, registerables } from 'chart.js';
import { pendienteRegresion, lineaTendencia } from '../../core/utils/stats.utils';

Chart.register(...registerables);

@Component({
  selector: 'app-terapeuta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terapeuta.component.html',
  styleUrl: './terapeuta.component.scss'
})
export class TerapeutaComponent implements OnInit, AfterViewChecked {
  @ViewChild('tendenciaChart') tendenciaChartRef!: ElementRef;

  pacientes: any[] = [];
  pacienteSeleccionado: any = null;
  vistaDetalle: 'entradas' | 'expediente' | 'notas' | 'graficas' = 'entradas';

  entradas: any[] = [];
  estadisticas: any = null;
  tendenciaCompleta: any[] = [];
  tendenciaFiltrada: any[] = [];
  rangoTiempo: 'semana' | 'mes' | 'todo' = 'todo';

  // Resumen automático
  resumen: any = null;
  correlacion: number | null = null;
  tendenciaAnimo: string = '';

  expediente: any = {};
  editandoClinica = false;
  guardandoClinica = false;
  clinicaMotivoConsulta = '';
  clinicaDiagnostico = '';
  clinicaMedicamentos = '';
  clinicaAntecedentes = '';
  mensajeClinica = '';
  errorClinica = '';

  notas: any[] = [];
  nuevaNota = '';
  guardandoNota = false;
  mensajaNota = '';
  notaAEliminar: any | null = null;
  eliminandoNota = false;

  // Emociones agrupadas
  emocionesPositivas: any[] = [];
  emocionesNegativas: any[] = [];
  readonly EMOCIONES_POSITIVAS = new Set(['Alegría','Calma','Gratitud','Esperanza','Orgullo']);

  private chart: Chart | null = null;
  private pendingChart = false;

  constructor(
    public auth: AuthService,
    private terapeutaService: TerapeutaService,
    private expedienteService: ExpedienteService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.terapeutaService.misPacientes().subscribe(p => {
      this.pacientes = p;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewChecked() {
    if (this.pendingChart && this.tendenciaChartRef) {
      this.pendingChart = false;
      this.renderChart();
    }
  }

  seleccionar(p: any) {
    this.pacienteSeleccionado = p;
    this.vistaDetalle = 'entradas';
    this.editandoClinica = false;
    this.destroyChart();
    this.cdr.detectChanges();
    this.cargarEntradas();
    this.cargarExpediente();
    this.cargarNotas();
  }

  cambiarVista(v: 'entradas' | 'expediente' | 'notas' | 'graficas') {
    this.vistaDetalle = v;
    if (v === 'graficas') {
      this.destroyChart();
      this.pendingChart = true;
    }
    this.cdr.detectChanges();
  }

  cambiarRango(r: 'semana' | 'mes' | 'todo') {
    this.rangoTiempo = r;
    this.aplicarFiltro();
    this.destroyChart();
    this.pendingChart = true;
    this.cdr.detectChanges();
  }

  aplicarFiltro() {
    const ahora = new Date();
    if (this.rangoTiempo === 'todo') {
      this.tendenciaFiltrada = [...this.tendenciaCompleta];
    } else if (this.rangoTiempo === 'mes') {
      const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.tendenciaFiltrada = this.tendenciaCompleta.filter(t => new Date(t.fecha) >= hace30);
    } else {
      const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      this.tendenciaFiltrada = this.tendenciaCompleta.filter(t => new Date(t.fecha) >= hace7);
    }
    this.calcularResumen();
  }

  calcularResumen() {
    const datos = this.tendenciaFiltrada;
    if (!datos.length) { this.resumen = null; return; }

    const animos = datos.map(d => d.animo);
    const ansiedades = datos.map(d => d.ansiedad);

    const promAnimo = +(animos.reduce((a, b) => a + b, 0) / animos.length).toFixed(1);
    const promAnsiedad = +(ansiedades.reduce((a, b) => a + b, 0) / ansiedades.length).toFixed(1);

    const mejorAnimo = datos.reduce((a, b) => a.animo >= b.animo ? a : b);
    const peorAnsiedad = datos.reduce((a, b) => a.ansiedad >= b.ansiedad ? a : b);

    // Días con mejora de ánimo
    let diasMejora = 0;
    for (let i = 1; i < datos.length; i++) {
      if (datos[i].animo > datos[i-1].animo) diasMejora++;
    }

    // Regresión lineal simple para tendencia de ánimo
    const pendiente = pendienteRegresion(animos);

    if (pendiente > 0.2) this.tendenciaAnimo = `📈 Tendencia del ánimo: +${pendiente.toFixed(1)} pts/sesión (mejoría progresiva)`;
    else if (pendiente < -0.2) this.tendenciaAnimo = `📉 Tendencia del ánimo: ${pendiente.toFixed(1)} pts/sesión (descenso — explorar detonantes)`;
    else this.tendenciaAnimo = '➡️ Tendencia del ánimo: estable entre sesiones';

    // Correlación ánimo-ansiedad
    const mediaAnimo = promAnimo;
    const mediaAnsiedad = promAnsiedad;
    const num = datos.reduce((acc, d) => acc + (d.animo - mediaAnimo) * (d.ansiedad - mediaAnsiedad), 0);
    const den = Math.sqrt(
      datos.reduce((acc, d) => acc + Math.pow(d.animo - mediaAnimo, 2), 0) *
      datos.reduce((acc, d) => acc + Math.pow(d.ansiedad - mediaAnsiedad, 2), 0)
    );
    this.correlacion = den === 0 ? 0 : +(num / den).toFixed(2);

    this.resumen = {
      promAnimo, promAnsiedad,
      mejorFechaAnimo: mejorAnimo.fecha,
      mejorValorAnimo: mejorAnimo.animo,
      peorFechaAnsiedad: peorAnsiedad.fecha,
      peorValorAnsiedad: peorAnsiedad.ansiedad,
      diasMejora,
      totalDias: datos.length - 1
    };
  }

  cargarEntradas() {
    this.terapeutaService.entradasPaciente(this.pacienteSeleccionado.id).subscribe(e => {
      this.entradas = e;
      this.cdr.detectChanges();
    });
    this.terapeutaService.estadisticasPaciente(this.pacienteSeleccionado.id).subscribe(s => {
      this.estadisticas = s;
      this.tendenciaCompleta = (s.tendencia || []).slice().reverse();
      this.tendenciaFiltrada = [...this.tendenciaCompleta];
      this.calcularResumen();
      this.agruparEmociones(s.emociones_frecuentes || []);
      this.cdr.detectChanges();
    });
  }

  agruparEmociones(emociones: any[]) {
    this.emocionesPositivas = emociones.filter(e => this.EMOCIONES_POSITIVAS.has(e[0]));
    this.emocionesNegativas = emociones.filter(e => !this.EMOCIONES_POSITIVAS.has(e[0]));
  }

  cargarExpediente() {
    this.expedienteService.getExpedientePaciente(this.pacienteSeleccionado.id).subscribe(exp => {
      this.expediente = exp;
      this.clinicaMotivoConsulta = exp.motivo_consulta || '';
      this.clinicaDiagnostico = exp.diagnostico || '';
      this.clinicaMedicamentos = exp.medicamentos || '';
      this.clinicaAntecedentes = exp.antecedentes || '';
      this.cdr.detectChanges();
    });
  }

  cargarNotas() {
    this.expedienteService.getNotas(this.pacienteSeleccionado.id).subscribe(n => {
      this.notas = n;
      this.cdr.detectChanges();
    });
  }

  renderChart() {
    const canvas = this.tendenciaChartRef?.nativeElement;
    if (!canvas || !this.tendenciaFiltrada.length) return;

    const labels = this.tendenciaFiltrada.map(t => t.fecha);
    const animo = this.tendenciaFiltrada.map(t => t.animo);
    const ansiedad = this.tendenciaFiltrada.map(t => t.ansiedad);

    // Línea de tendencia (regresión lineal)
    const tendencia = lineaTendencia(animo);

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Estado de ánimo',
            data: animo,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Ansiedad',
            data: ansiedad,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.06)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#f59e0b',
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Tendencia ánimo',
            data: tendencia,
            borderColor: '#3b82f6',
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0,
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
            ticks: {
              stepSize: 1,
              callback: (v) => `${v}/10`
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
            title: { display: true, text: 'Escala 1-10', color: '#94a3b8', font: { size: 11 } }
          },
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { maxRotation: 30 }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, padding: 20, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}/10`
            }
          }
        }
      }
    });
  }

  destroyChart() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }

  correlacionTexto(): string {
    if (this.correlacion === null) return '';
    const v = this.correlacion;
    if (v <= -0.6) return `Correlación fuerte inversa (${v}): cuando el ánimo baja, la ansiedad sube. Explorar qué reduce la ansiedad podría elevar el ánimo.`;
    if (v <= -0.3) return `Correlación moderada inversa (${v}): ánimo y ansiedad tienden a moverse en sentidos opuestos.`;
    if (v >= 0.6) return `Correlación fuerte directa (${v}): ánimo y ansiedad se mueven en la misma dirección — patrón inusual, explorar.`;
    if (v >= 0.3) return `Correlación moderada directa (${v}): ánimo y ansiedad suben y bajan juntos.`;
    return `Sin correlación clara (${v}): ánimo y ansiedad parecen independientes entre sí.`;
  }

  interpretacionClinica(): string {
    if (!this.resumen || !this.tendenciaFiltrada.length) return '';
    const lineas: string[] = [];
    const total = this.resumen.totalDias + 1;
    const mejora = this.resumen.diasMejora;
    const pct = total > 1 ? Math.round((mejora / (total - 1)) * 100) : 0;

    lineas.push(`El ánimo mejoró en ${mejora} de ${total > 1 ? total - 1 : 0} sesiones (${pct}%).`);

    if (this.correlacion !== null && this.correlacion <= -0.6) {
      lineas.push(`La correlación fuerte inversa (${this.correlacion}) sugiere que reducir la ansiedad podría elevar el ánimo directamente.`);
    }

    if (this.resumen.promAnimo < 4) {
      lineas.push(`⚠️ Ánimo promedio bajo (${this.resumen.promAnimo}/10). Considerar revisión del plan terapéutico.`);
    } else if (this.resumen.promAnimo >= 7) {
      lineas.push(`Ánimo promedio favorable (${this.resumen.promAnimo}/10). Reforzar las estrategias actuales.`);
    }

    if (this.resumen.promAnsiedad >= 7) {
      lineas.push(`⚠️ Ansiedad promedio elevada (${this.resumen.promAnsiedad}/10). Explorar detonantes específicos.`);
    }

    return lineas.join(' ');
  }

  editarClinica() { this.editandoClinica = true; this.mensajeClinica = ''; this.errorClinica = ''; }

  cancelarClinica() {
    this.editandoClinica = false;
    this.clinicaMotivoConsulta = this.expediente.motivo_consulta || '';
    this.clinicaDiagnostico = this.expediente.diagnostico || '';
    this.clinicaMedicamentos = this.expediente.medicamentos || '';
    this.clinicaAntecedentes = this.expediente.antecedentes || '';
  }

  guardarClinica() {
    this.guardandoClinica = true;
    this.expedienteService.actualizarClinica(this.pacienteSeleccionado.id, {
      motivo_consulta: this.clinicaMotivoConsulta,
      diagnostico: this.clinicaDiagnostico,
      medicamentos: this.clinicaMedicamentos,
      antecedentes: this.clinicaAntecedentes
    }).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.guardandoClinica = false;
        this.editandoClinica = false;
        this.mensajeClinica = '✓ Información clínica actualizada';
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeClinica = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (e) => {
        this.guardandoClinica = false;
        this.errorClinica = e.error?.detail || 'Error al guardar';
        this.cdr.detectChanges();
      }
    });
  }

  agregarNota() {
    if (!this.nuevaNota.trim()) return;
    this.guardandoNota = true;
    this.expedienteService.crearNota(this.pacienteSeleccionado.id, this.nuevaNota).subscribe({
      next: () => {
        this.nuevaNota = '';
        this.guardandoNota = false;
        this.mensajaNota = '✓ Nota guardada';
        this.cargarNotas();
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajaNota = ''; this.cdr.detectChanges(); }, 2500);
      },
      error: () => { this.guardandoNota = false; this.cdr.detectChanges(); }
    });
  }

  // Eliminar nota de sesión (con confirmación)
  confirmarEliminarNota(n: any) {
    this.notaAEliminar = n;
    this.cdr.detectChanges();
  }

  cancelarEliminarNota() {
    this.notaAEliminar = null;
    this.cdr.detectChanges();
  }

  ejecutarEliminarNota() {
    if (!this.notaAEliminar) return;
    this.eliminandoNota = true;
    this.cdr.detectChanges();
    this.expedienteService.eliminarNota(this.pacienteSeleccionado.id, this.notaAEliminar.id).subscribe({
      next: () => {
        this.eliminandoNota = false;
        this.notaAEliminar = null;
        this.cargarNotas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.eliminandoNota = false;
        this.notaAEliminar = null;
        this.cdr.detectChanges();
      }
    });
  }

  getEmociones(e: any): string[] {
    return e.emociones ? e.emociones.split(',').filter((x: string) => x) : [];
  }

  formatFecha(ts: string): string {
    return new Date(ts).toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric' });
  }

  formatFechaHora(ts: string): string {
    return new Date(ts).toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  generoBonito(g: string): string {
    const map: any = { masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro', prefiero_no_decir: 'Prefiero no decir' };
    return map[g] || '—';
  }
}