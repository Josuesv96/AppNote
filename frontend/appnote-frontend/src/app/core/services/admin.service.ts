import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/usuarios`);
  }
  toggleActivo(id: number): Observable<any> {
    return this.http.patch(`${this.api}/admin/usuarios/${id}/activar`, {});
  }
  asignarPaciente(terapeutaId: number, pacienteId: number): Observable<any> {
    return this.http.post(
      `${this.api}/admin/asignar-paciente?terapeuta_id=${terapeutaId}&paciente_id=${pacienteId}`, {}
    );
  }
  crearUsuario(datos: any): Observable<any> {
    return this.http.post(`${this.api}/admin/usuarios`, datos);
  }
  editarUsuario(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.api}/admin/usuarios/${id}`, datos);
  }
  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.api}/admin/usuarios/${id}`, {
      responseType: 'text'
    });
  }

  getEstadisticas(): Observable<any> {
    return this.http.get(`${this.api}/admin/estadisticas`);
  }

  getDetalleTerapeuta(id: number): Observable<any> {
    return this.http.get(`${this.api}/admin/terapeuta/${id}/detalle`);
  }

  cambiarPassword(id: number, password: string): Observable<any> {
    return this.http.patch(`${this.api}/admin/usuarios/${id}/password`,
      { password },
      { responseType: 'text' }
    );
  }

  getAuditoria(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/auditoria`);
  }
}