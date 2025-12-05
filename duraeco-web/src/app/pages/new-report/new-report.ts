import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-new-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-emerald-600 text-white p-4 shadow-lg">
        <div class="max-w-2xl mx-auto flex items-center gap-3">
          <a routerLink="/reports" class="hover:bg-emerald-700 p-2 rounded-lg transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 class="text-xl font-bold">Novo Relatório</h1>
        </div>
      </header>

      <div class="max-w-2xl mx-auto p-4">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Location -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="latitude" class="block text-sm font-medium text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  formControlName="latitude"
                  placeholder="-8.556"
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label for="longitude" class="block text-sm font-medium text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  formControlName="longitude"
                  placeholder="125.560"
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="button"
              (click)="getCurrentLocation()"
              [disabled]="gettingLocation()"
              class="w-full border-2 border-dashed border-emerald-300 text-emerald-600 py-3 rounded-lg font-medium hover:bg-emerald-50 transition flex items-center justify-center gap-2"
            >
              @if (gettingLocation()) {
                <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Obtendo localização...</span>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Usar minha localização atual</span>
              }
            </button>

            <!-- Description -->
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="4"
                placeholder="Descreva o local e o tipo de resíduo encontrado..."
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              ></textarea>
            </div>

            <!-- Image Upload -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Foto do Local
              </label>

              @if (!imagePreview()) {
                <label
                  for="image"
                  class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                >
                  <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span class="text-sm text-gray-500">Clique para selecionar uma imagem</span>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    (change)="onImageSelected($event)"
                    class="hidden"
                  />
                </label>
              } @else {
                <div class="relative">
                  <img [src]="imagePreview()" alt="Preview" class="w-full h-48 object-cover rounded-lg"/>
                  <button
                    type="button"
                    (click)="removeImage()"
                    class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              }
            </div>

            @if (error()) {
              <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {{ error() }}
              </div>
            }

            @if (success()) {
              <div class="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm">
                Relatório enviado com sucesso! Redirecionando...
              </div>
            }

            <button
              type="submit"
              [disabled]="form.invalid || reportsService.isLoading()"
              class="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              @if (reportsService.isLoading()) {
                <span>Enviando...</span>
              } @else {
                <span>Enviar Relatório</span>
              }
            </button>
          </form>
        </div>

        <!-- Tips -->
        <div class="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 class="font-semibold text-blue-800 mb-2">Dicas para um bom relatório:</h3>
          <ul class="text-blue-700 text-sm space-y-1">
            <li>• Use sua localização atual para maior precisão</li>
            <li>• Descreva o tipo de resíduo (plástico, orgânico, eletrônico, etc.)</li>
            <li>• Inclua uma foto clara do local</li>
            <li>• Mencione pontos de referência próximos</li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class NewReport {
  readonly authService = inject(AuthService);
  readonly reportsService = inject(ReportsService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly gettingLocation = signal(false);
  readonly imagePreview = signal<string | null>(null);
  private selectedFile: File | null = null;

  readonly form = this.fb.nonNullable.group({
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.error.set('Geolocalização não suportada pelo navegador');
      return;
    }

    this.gettingLocation.set(true);
    this.error.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.form.patchValue({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        this.gettingLocation.set(false);
      },
      (error) => {
        this.gettingLocation.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.error.set('Permissão de localização negada');
            break;
          case error.POSITION_UNAVAILABLE:
            this.error.set('Localização indisponível');
            break;
          case error.TIMEOUT:
            this.error.set('Tempo esgotado ao obter localização');
            break;
          default:
            this.error.set('Erro ao obter localização');
        }
      }
    );
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.error.set(null);
    this.success.set(false);

    const { latitude, longitude, description } = this.form.getRawValue();

    const user = this.authService.user();
    if (!user) return;

    this.reportsService.createReport({
      user_id: user.user_id,
      latitude,
      longitude,
      description,
      image_data: this.imagePreview() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set(true);
          setTimeout(() => {
            this.router.navigate(['/reports']);
          }, 2000);
        } else {
          this.error.set('Erro ao enviar relatório');
        }
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Erro ao enviar relatório');
      }
    });
  }
}
