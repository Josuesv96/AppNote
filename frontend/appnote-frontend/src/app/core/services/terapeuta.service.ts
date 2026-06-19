import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TerapeutaService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  misPacientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/terapeuta/mis-pacientes`);
  }

  entradasPaciente(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/terapeuta/paciente/${id}/entradas`);
  }

  estadisticasPaciente(id: number): Observable<any> {
    return this.http.get<any>(`${this.api}/terapeuta/paciente/${id}/estadisticas`);
  }
}
