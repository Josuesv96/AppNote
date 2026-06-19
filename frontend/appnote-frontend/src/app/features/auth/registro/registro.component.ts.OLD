import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent {
  nombre = '';
  email = '';
  password = '';
  error = '';
  exito = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  registrar() {
    if (!this.nombre || !this.email || !this.password) {
      this.error = 'Completa todos los campos.'; return;
    }
    this.loading = true;
    this.error = '';
    this.auth.registro({ nombre: this.nombre, email: this.email, password: this.password, rol: 'paciente' })
      .subscribe({
        next: () => {
          this.loading = false;
          this.exito = 'Cuenta creada. Redirigiendo...';
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.detail || 'Error al registrar.';
        }
      });
  }
}
