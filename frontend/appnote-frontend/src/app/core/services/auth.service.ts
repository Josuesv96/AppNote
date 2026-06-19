import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  rol: string;
  nombre: string;
  id: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<TokenResponse | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): TokenResponse | null {
    const data = localStorage.getItem('appnote_user');
    return data ? JSON.parse(data) : null;
  }

  login(email: string, password: string): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password);
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/login`, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(response => {
        localStorage.setItem('appnote_user', JSON.stringify(response));
        this.currentUserSubject.next(response);
      })
    );
  }

  registro(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/registro`, datos);
  }

  logout(): void {
    localStorage.removeItem('appnote_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.currentUserSubject.value?.access_token ?? null;
  }

  getRol(): string | null {
    return this.currentUserSubject.value?.rol ?? null;
  }

  getNombre(): string | null {
    return this.currentUserSubject.value?.nombre ?? null;
  }

  getId(): number | null {
    return this.currentUserSubject.value?.id ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }
}
