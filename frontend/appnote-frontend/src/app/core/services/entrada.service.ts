import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Entrada {
  id: number;
  paciente_id: number;
  texto: string;
  estado_animo: number;
  ansiedad: number;
  emociones: string;
  contexto: string;
  timestamp: string;
}

export interface EntradaCreate {
  texto: string;
  estado_animo: number;
  ansiedad: number;
  emociones: string[];
  contexto: string;
}

@Injectable({ providedIn: 'root' })
export class EntradaService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  crearEntrada(datos: EntradaCreate): Observable<Entrada> {
    return this.http.post<Entrada>(`${this.api}/entradas/`, datos);
  }

  misEntradas(): Observable<Entrada[]> {
    return this.http.get<Entrada[]>(`${this.api}/entradas/mis-entradas`);
  }

  eliminarEntrada(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/entradas/${id}`);
  }
}
