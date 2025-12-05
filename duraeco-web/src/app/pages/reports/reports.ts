import { Component, inject, ChangeDetectionStrategy, signal, afterNextRender, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService, Report } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-2xl font-bold text-emerald-600">DuraEco</h1>
          <div class="flex items-center gap-4">
            <span class="text-gray-600">{{ authService.user()?.username }}</span>
            <button
              (click)="authService.logout()"
              class="text-gray-500 hover:text-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex gap-6">
            <a
              routerLink="/dashboard"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition"
            >
              Dashboard
            </a>
            <a
              routerLink="/reports"
              class="py-4 border-b-2 border-emerald-600 text-emerald-600 font-medium"
            >
              Relatos de Usuários
            </a>
            <a
              routerLink="/hotspots"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition"
            >
              Diagnóstico
            </a>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-800">Relatos de Usuários</h2>
          <button
            (click)="showNewReport.set(true)"
            class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            Novo Relatório
          </button>
        </div>

        @if (reportsService.isLoading()) {
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
          </div>
        } @else {
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr class="text-left text-gray-500 text-sm">
                  <th class="px-6 py-4">ID</th>
                  <th class="px-6 py-4">Localização</th>
                  <th class="px-6 py-4">Tipo</th>
                  <th class="px-6 py-4">Severidade</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">Data</th>
                  <th class="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (report of reportsService.allReports(); track report.report_id) {
                  <tr class="border-t hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium">#{{ report.report_id }}</td>
                    <td class="px-6 py-4 text-gray-600">
                      {{ report.address_text || formatCoords(report.latitude, report.longitude) }}
                    </td>
                    <td class="px-6 py-4 text-gray-600">{{ report.waste_type || 'N/A' }}</td>
                    <td class="px-6 py-4">
                      @if (report.severity_score) {
                        <div class="flex items-center gap-1">
                          @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
                            <div
                              class="w-2 h-2 rounded-full"
                              [class]="i <= report.severity_score! ? 'bg-orange-500' : 'bg-gray-200'"
                            ></div>
                          }
                        </div>
                      } @else {
                        <span class="text-gray-400">-</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="px-2 py-1 rounded-full text-xs font-medium"
                        [class]="getStatusClass(report.status)"
                      >
                        {{ report.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-gray-500 text-sm">
                      {{ formatDate(report.report_date) }}
                    </td>
                    <td class="px-6 py-4">
                      <button
                        (click)="viewReport(report)"
                        class="text-emerald-600 hover:underline text-sm mr-3"
                      >
                        Ver
                      </button>
                      <button
                        (click)="deleteReport(report.report_id)"
                        class="text-red-600 hover:underline text-sm"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                      Nenhum relatório encontrado
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </main>

      <!-- Modal Novo Relatório -->
      @if (showNewReport()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-6">
              <h3 class="text-xl font-semibold">Novo Relatório de Resíduo</h3>
              <button
                (click)="showNewReport.set(false)"
                class="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form (submit)="createReport($event)" class="space-y-4">
              <!-- Descrição -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <textarea
                  [(ngModel)]="newReport.description"
                  name="description"
                  required
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Descreva o problema com resíduos..."
                ></textarea>
              </div>

              <!-- Localização -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    [(ngModel)]="newReport.latitude"
                    name="latitude"
                    required
                    step="0.0001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="-8.5569"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    [(ngModel)]="newReport.longitude"
                    name="longitude"
                    required
                    step="0.0001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="125.5603"
                  />
                </div>
              </div>

              <button
                type="button"
                (click)="getCurrentLocation()"
                class="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                📍 Usar minha localização atual
              </button>

              <!-- Imagem (opcional) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Foto (opcional)
                </label>
                <input
                  type="file"
                  (change)="onImageSelect($event)"
                  accept="image/*"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                @if (imagePreview()) {
                  <img [src]="imagePreview()" class="mt-2 h-32 rounded-lg object-cover" />
                }
              </div>

              <!-- Botões -->
              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  (click)="showNewReport.set(false)"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {{ isSubmitting() ? 'Enviando...' : 'Enviar Relatório' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Ver Relatório -->
      @if (selectedReport()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-xl font-semibold">Relatório #{{ selectedReport()!.report_id }}</h3>
              <button
                (click)="selectedReport.set(null)"
                class="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            @if (selectedReport()!.image_url) {
              <img
                [src]="selectedReport()!.image_url"
                alt="Foto do relatório"
                class="w-full h-48 object-cover rounded-lg mb-4"
              />
            }

            <div class="space-y-3">
              <div>
                <span class="text-gray-500 text-sm">Localização</span>
                <p class="font-medium">
                  {{ selectedReport()!.address_text || formatCoords(selectedReport()!.latitude, selectedReport()!.longitude) }}
                </p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Tipo de Resíduo</span>
                <p class="font-medium">{{ selectedReport()!.waste_type || 'Não identificado' }}</p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Descrição</span>
                <p class="font-medium">{{ selectedReport()!.description || 'Sem descrição' }}</p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Status</span>
                <p>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    [class]="getStatusClass(selectedReport()!.status)"
                  >
                    {{ selectedReport()!.status }}
                  </span>
                </p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Data</span>
                <p class="font-medium">{{ formatDate(selectedReport()!.report_date) }}</p>
              </div>
            </div>

            <button
              (click)="selectedReport.set(null)"
              class="w-full mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class Reports {
  readonly authService = inject(AuthService);
  readonly reportsService = inject(ReportsService);

  readonly showNewReport = signal(false);
  readonly selectedReport = signal<Report | null>(null);
  readonly isSubmitting = signal(false);
  readonly imagePreview = signal<string | null>(null);

  newReport = {
    description: '',
    latitude: -8.5569,
    longitude: 125.5603,
    image: null as File | null
  };

  constructor() {
    afterNextRender(() => {
      console.log('Reports afterNextRender called');
      this.reportsService.getReports().subscribe({
        next: (data) => {
          console.log('Reports loaded:', data);
          console.log('Signal value:', this.reportsService.allReports());
        },
        error: (err) => console.error('Error loading reports:', err)
      });
    });

    // Obter localização automaticamente quando o modal abrir
    effect(() => {
      if (this.showNewReport()) {
        this.getCurrentLocation();
      }
    });
  }

  viewReport(report: Report): void {
    this.selectedReport.set(report);
  }

  deleteReport(reportId: number): void {
    if (confirm('Tem certeza que deseja excluir este relatório?')) {
      this.reportsService.deleteReport(reportId).subscribe();
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.newReport.latitude = position.coords.latitude;
          this.newReport.longitude = position.coords.longitude;
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          alert('Não foi possível obter sua localização. Por favor, digite manualmente.');
        }
      );
    }
  }

  onImageSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.newReport.image = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  createReport(event: Event): void {
    event.preventDefault();
    this.isSubmitting.set(true);

    const user = this.authService.user();
    if (!user) {
      alert('Você precisa estar logado para criar um relatório');
      this.isSubmitting.set(false);
      return;
    }

    this.reportsService.createReport({
      user_id: user.user_id,
      latitude: this.newReport.latitude,
      longitude: this.newReport.longitude,
      description: this.newReport.description,
      image_data: this.imagePreview() || undefined
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showNewReport.set(false);
        // Resetar formulário
        this.newReport = {
          description: '',
          latitude: -8.5569,
          longitude: 125.5603,
          image: null
        };
        this.imagePreview.set(null);
        // Recarregar lista
        this.reportsService.getReports().subscribe();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert('Erro ao criar relatório: ' + (err.error?.message || 'Erro desconhecido'));
      }
    });
  }

  formatCoords(lat: string | number, lng: string | number): string {
    const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
    return `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
