import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.error = 'Completa todos los campos.';
      this.cdr.detectChanges();
      return;
    }
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (res.rol === 'admin') this.router.navigate(['/admin']);
        else if (res.rol === 'terapeuta') this.router.navigate(['/terapeuta']);
        else this.router.navigate(['/paciente']);
      },
      error: () => {
        this.loading = false;
        this.error = 'Email o contraseña incorrectos.';
        this.cdr.detectChanges();
      }
    });
  }
}
