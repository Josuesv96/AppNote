import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';

type Rol = 'paciente' | 'terapeuta' | 'admin';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  vista: 'dashboard' | 'usuarios' | 'crear' | 'asignar' | 'editar' | 'detalle-terapeuta' | 'auditoria' = 'dashboard';
  estadisticas: any = null;
  logs: any[] = [];
  logsFiltrados: any[] = [];
  logPaginaActual = 1;
  logItemsPorPagina = 15;
  logFechaDesde = '';
  logFechaHasta = '';
  logFiltroAccion = '';
  detalleTerapeuta: any = null;

  // Filtros
  busqueda = '';
  filtroRol = '';
  filtroEstado = '';

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  usuarios: any[] = [];

  nuevoNombre = '';
  nuevoEmail = '';
  nuevoPassword = '';
  nuevoRol: Rol = 'paciente';
  errorCrear = '';
  exitoCrear = '';
  creando = false;

  usuarioEditando: any = null;
  editNombre = '';
  editEmail = '';
  editRol: Rol = 'paciente';
  errorEditar = '';
  exitoEditar = '';
  guardando = false;

  usuarioAEliminar: any = null;
  usuarioCambiandoPassword: any = null;
  nuevaPassword = '';
  cambiandoPassword = false;
  errorPassword = '';
  exitoPassword = '';

  eliminando = false;

  terapeutaId: number | null = null;
  pacienteId: number | null = null;
  mensajeAsignacion = '';

  constructor(
    public auth: AuthService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.cargar(); this.cargarEstadisticas(); }

  cargarLogs() {
    this.adminService.getAuditoria().subscribe((l: any[]) => {
      this.logs = l;
      this.aplicarFiltrosLog();
      this.cdr.detectChanges();
    });
  }

  aplicarFiltrosLog() {
    let filtrados = [...this.logs];
    if (this.logFechaDesde) {
      const desde = new Date(this.logFechaDesde);
      filtrados = filtrados.filter(l => new Date(l.fecha) >= desde);
    }
    if (this.logFechaHasta) {
      const hasta = new Date(this.logFechaHasta);
      hasta.setHours(23, 59, 59);
      filtrados = filtrados.filter(l => new Date(l.fecha) <= hasta);
    }
    if (this.logFiltroAccion) {
      filtrados = filtrados.filter(l => l.accion === this.logFiltroAccion);
    }
    this.logsFiltrados = filtrados;
    this.logPaginaActual = 1;
    this.cdr.detectChanges();
  }

  get logTotalPaginas(): number {
    return Math.ceil(this.logsFiltrados.length / this.logItemsPorPagina);
  }

  get logsPaginados() {
    const inicio = (this.logPaginaActual - 1) * this.logItemsPorPagina;
    return this.logsFiltrados.slice(inicio, inicio + this.logItemsPorPagina);
  }

  get logPaginas(): number[] {
    const total = this.logTotalPaginas;
    const actual = this.logPaginaActual;
    const rango: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) rango.push(i);
    return rango;
  }

  irPaginaLog(p: number) {
    if (p < 1 || p > this.logTotalPaginas) return;
    this.logPaginaActual = p;
    this.cdr.detectChanges();
  }

  limpiarFiltrosLog() {
    this.logFechaDesde = '';
    this.logFechaHasta = '';
    this.logFiltroAccion = '';
    this.aplicarFiltrosLog();
  }

  accionesDisponibles(): string[] {
    return [...new Set(this.logs.map(l => l.accion))].sort();
  }

  cargarEstadisticas() {
    this.adminService.getEstadisticas().subscribe((e: any) => {
      this.estadisticas = e;
      this.cdr.detectChanges();
    });
  }

  cargar() {
    this.adminService.listarUsuarios().subscribe(u => {
      this.usuarios = u;
      this.cdr.detectChanges();
    });
  }

  toggle(id: number) {
    this.adminService.toggleActivo(id).subscribe(() => this.cargar());
  }

  setRol(r: string) { this.nuevoRol = r as Rol; }
  setEditRol(r: string) { this.editRol = r as Rol; }

  crearUsuario() {
    if (!this.nuevoNombre || !this.nuevoEmail || !this.nuevoPassword) {
      this.errorCrear = 'Completa todos los campos.';
      return;
    }
    this.creando = true;
    this.errorCrear = '';
    this.exitoCrear = '';
    this.adminService.crearUsuario({
      nombre: this.nuevoNombre,
      email: this.nuevoEmail,
      password: this.nuevoPassword,
      rol: this.nuevoRol
    }).subscribe({
      next: () => {
        this.nuevoNombre = '';
        this.nuevoEmail = '';
        this.nuevoPassword = '';
        this.nuevoRol = 'paciente';
        this.creando = false;
        this.exitoCrear = '✓ Usuario creado correctamente';
        this.cdr.detectChanges();
        this.cargar();
        setTimeout(() => { this.exitoCrear = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (e) => {
        this.creando = false;
        this.errorCrear = e.error?.detail || 'Error al crear usuario';
        this.cdr.detectChanges();
      }
    });
  }

  abrirEditar(u: any) {
    this.usuarioEditando = u;
    this.editNombre = u.nombre;
    this.editEmail = u.email;
    this.editRol = u.rol;
    this.errorEditar = '';
    this.exitoEditar = '';
    this.vista = 'editar';
  }

  guardarEdicion() {
    if (!this.editNombre || !this.editEmail) {
      this.errorEditar = 'Nombre y email son obligatorios.';
      return;
    }
    this.guardando = true;
    this.errorEditar = '';
    this.adminService.editarUsuario(this.usuarioEditando.id, {
      nombre: this.editNombre,
      email: this.editEmail,
      rol: this.editRol
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.exitoEditar = '✓ Usuario actualizado correctamente';
        this.cdr.detectChanges();
        this.cargar();
        setTimeout(() => { this.vista = 'usuarios'; this.cdr.detectChanges(); }, 1200);
      },
      error: (e) => {
        this.guardando = false;
        this.errorEditar = e.error?.detail || 'Error al actualizar usuario';
        this.cdr.detectChanges();
      }
    });
  }

  confirmarEliminar(u: any) {
    this.usuarioAEliminar = u;
    this.cdr.detectChanges();
  }

  cancelarEliminar() {
    this.usuarioAEliminar = null;
    this.cdr.detectChanges();
  }

  ejecutarEliminar() {
    if (!this.usuarioAEliminar) return;
    this.eliminando = true;
    this.cdr.detectChanges();
    this.adminService.eliminarUsuario(this.usuarioAEliminar.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.usuarioAEliminar = null;
        this.cdr.detectChanges();
        this.cargar();
      },
      error: (e) => {
        this.eliminando = false;
        this.usuarioAEliminar = null;
        this.cdr.detectChanges();
        alert(e.error?.detail || 'Error al eliminar usuario');
      }
    });
  }

  asignar() {
    if (!this.terapeutaId || !this.pacienteId) return;
    this.adminService.asignarPaciente(this.terapeutaId, this.pacienteId).subscribe({
      next: () => {
        this.mensajeAsignacion = '✓ Paciente asignado correctamente';
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeAsignacion = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (e) => {
        this.mensajeAsignacion = e.error?.detail || 'Error al asignar';
        this.cdr.detectChanges();
      }
    });
  }

  get usuariosFiltrados() {
    const filtrados = this.usuarios.filter(u => {
      const matchBusqueda = !this.busqueda ||
        u.nombre.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        u.email.toLowerCase().includes(this.busqueda.toLowerCase());
      const matchRol = !this.filtroRol || u.rol === this.filtroRol;
      const matchEstado = this.filtroEstado === '' ? true :
        this.filtroEstado === 'activo' ? u.activo === 1 : u.activo === 0;
      return matchBusqueda && matchRol && matchEstado;
    });
    return filtrados;
  }

  abrirCambiarPassword(u: any) {
    this.usuarioCambiandoPassword = u;
    this.nuevaPassword = '';
    this.errorPassword = '';
    this.exitoPassword = '';
    this.cdr.detectChanges();
  }

  cancelarPassword() {
    this.usuarioCambiandoPassword = null;
    this.nuevaPassword = '';
    this.errorPassword = '';
    this.exitoPassword = '';
    this.cdr.detectChanges();
  }

  ejecutarCambioPassword() {
    if (!this.nuevaPassword || this.nuevaPassword.length < 6) {
      this.errorPassword = 'La contraseña debe tener al menos 6 caracteres.';
      this.cdr.detectChanges();
      return;
    }
    this.cambiandoPassword = true;
    this.errorPassword = '';
    this.adminService.cambiarPassword(this.usuarioCambiandoPassword.id, this.nuevaPassword).subscribe({
      next: () => {
        this.cambiandoPassword = false;
        this.exitoPassword = '✓ Contraseña actualizada correctamente';
        this.nuevaPassword = '';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.usuarioCambiandoPassword = null;
          this.exitoPassword = '';
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (e) => {
        this.cambiandoPassword = false;
        this.errorPassword = e.error?.detail || 'Error al cambiar contraseña';
        this.cdr.detectChanges();
      }
    });
  }

  verDetalleTerapeuta(u: any) {
    if (u.rol !== 'terapeuta') return;
    this.adminService.getDetalleTerapeuta(u.id).subscribe((d: any) => {
      this.detalleTerapeuta = d;
      this.vista = 'detalle-terapeuta';
      this.cdr.detectChanges();
    });
  }

  get totalPaginas(): number {
    return Math.ceil(this.usuariosFiltrados.length / this.itemsPorPagina);
  }

  get usuariosPaginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.usuariosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) rango.push(i);
    return rango;
  }

  irPagina(p: number) {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.paginaActual = 1;
  }

  formatLog(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  accionLabel(accion: string): string {
    const map: any = {
      'LOGIN': 'Inicio sesión',
      'ELIMINAR_USUARIO': 'Eliminó usuario',
      'TOGGLE_USUARIO': 'Cambió estado',
      'CAMBIAR_PASSWORD': 'Cambió contraseña'
    };
    return map[accion] || accion;
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  porRol(rol: string) { return this.usuarios.filter(u => u.rol === rol); }
}
