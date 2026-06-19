import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpedienteService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getMiExpediente(): Observable<any> {
    return this.http.get(`${this.api}/expediente/mi-expediente`);
  }

  actualizarMiExpediente(datos: any): Observable<any> {
    return this.http.put(`${this.api}/expediente/mi-expediente`, datos, {
      responseType: 'text'
    }).pipe(map(r => JSON.parse(r)));
  }

  getExpedientePaciente(pacienteId: number): Observable<any> {
    return this.http.get(`${this.api}/expediente/paciente/${pacienteId}`);
  }

  actualizarClinica(pacienteId: number, datos: any): Observable<any> {
    return this.http.put(`${this.api}/expediente/paciente/${pacienteId}/clinica`, datos, {
      responseType: 'text'
    }).pipe(map(r => JSON.parse(r)));
  }

  getNotas(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/expediente/paciente/${pacienteId}/notas`);
  }

  crearNota(pacienteId: number, nota: string): Observable<any> {
    return this.http.post(`${this.api}/expediente/paciente/${pacienteId}/notas`, { nota }, {
      responseType: 'text'
    }).pipe(map(r => JSON.parse(r)));
  }

  eliminarNota(pacienteId: number, notaId: number): Observable<any> {
    return this.http.delete(
      `${this.api}/expediente/paciente/${pacienteId}/notas/${notaId}`,
      { responseType: 'text' }
    );
  }
}
