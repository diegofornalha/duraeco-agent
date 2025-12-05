import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  user_id: number;
  username: string;
  email: string;
  phone_number?: string;
  profile_image_url?: string;
  registration_date: string;
  account_status: string;
  verification_status: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone_number?: string;
}

export interface OtpRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  status?: string;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  // State using signals
  private readonly currentUser = signal<User | null>(null);
  private readonly token = signal<string | null>(null);
  private readonly loading = signal(false);

  // Computed values
  readonly user = computed(() => this.currentUser());
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isLoading = computed(() => this.loading());

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        this.token.set(storedToken);
      }
      if (storedUser) {
        try {
          this.currentUser.set(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
  }

  private saveToStorage(response: AuthResponse): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    this.token.set(response.token);
    this.currentUser.set(response.user);
  }

  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    this.token.set(null);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  register(data: RegisterRequest): Observable<ApiResponse> {
    this.loading.set(true);
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/register`, data).pipe(
      map(response => ({ success: response.status === 'success', message: response.message })),
      tap(() => this.loading.set(false)),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  verifyRegistration(data: OtpRequest): Observable<ApiResponse<AuthResponse>> {
    this.loading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/verify-registration`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.token) {
          this.saveToStorage(response);
        }
      }),
      map(response => ({ success: !!response.token, data: response })),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    this.loading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.token) {
          this.saveToStorage(response);
        }
      }),
      map(response => ({ success: !!response.token, data: response })),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  sendOtp(email: string): Observable<ApiResponse> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/send-otp`, { email }).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  verifyOtp(data: OtpRequest): Observable<ApiResponse<AuthResponse>> {
    this.loading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/verify-otp`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.token) {
          this.saveToStorage(response);
        }
      }),
      map(response => ({ success: !!response.token, data: response })),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword
    }).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  logout(): void {
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  updateUser(userId: number, data: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.patch<User>(`${this.baseUrl}/api/users/${userId}`, data).pipe(
      tap(response => {
        if (response) {
          this.currentUser.set(response);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(response));
          }
        }
      }),
      map(response => ({ success: !!response, data: response }))
    );
  }

  // Verificar se usuário/email já existe
  checkExisting(username?: string, email?: string): Observable<ApiResponse<{ status: string }>> {
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (email) params.append('email', email);

    return this.http.get<{ status: string; message: string }>(`${this.baseUrl}/api/auth/check-existing?${params}`).pipe(
      map(response => ({ success: true, data: response, message: response.message }))
    );
  }

  // Reenviar OTP
  resendOtp(email: string): Observable<ApiResponse> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/resend-otp`, { email }).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  // Buscar dados do usuário
  getUser(userId: number): Observable<ApiResponse<User>> {
    return this.http.get<{ status: string; user: User }>(`${this.baseUrl}/api/users/${userId}`).pipe(
      map(response => ({ success: response.status === 'success', data: response.user }))
    );
  }

  // Atualizar usuário no state
  refreshUser(): void {
    const user = this.currentUser();
    if (user) {
      this.getUser(user.user_id).subscribe(response => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        }
      });
    }
  }
}
