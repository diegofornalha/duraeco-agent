import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService, Report } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-2xl font-bold text-emerald-600">DuraEco</h1>
          <div class="flex items-center gap-4">
            <span class="text-gray-600">{{ authService.user()?.name }}</span>
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
              Relatórios
            </a>
            <a
              routerLink="/hotspots"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition"
            >
              Hotspots
            </a>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-800">Relatórios de Resíduos</h2>
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
                      {{ report.address || formatCoords(report.latitude, report.longitude) }}
                    </td>
                    <td class="px-6 py-4 text-gray-600">{{ report.waste_type || 'N/A' }}</td>
                    <td class="px-6 py-4">
                      @if (report.severity) {
                        <div class="flex items-center gap-1">
                          @for (i of [1,2,3,4,5]; track i) {
                            <div
                              class="w-2 h-2 rounded-full"
                              [class]="i <= report.severity! ? 'bg-orange-500' : 'bg-gray-200'"
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
                      {{ formatDate(report.created_at) }}
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
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 class="text-xl font-semibold mb-4">Novo Relatório</h3>
            <p class="text-gray-500 mb-4">
              Para criar um novo relatório, use o aplicativo móvel DuraEco que permite capturar fotos e localização automaticamente.
            </p>
            <div class="flex gap-3">
              <button
                (click)="showNewReport.set(false)"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Fechar
              </button>
              <a
                href="https://bit.ly/duraeco"
                target="_blank"
                class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-center"
              >
                Baixar App
              </a>
            </div>
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
                  {{ selectedReport()!.address || formatCoords(selectedReport()!.latitude, selectedReport()!.longitude) }}
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
                <p class="font-medium">{{ formatDate(selectedReport()!.created_at) }}</p>
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
export class Reports implements OnInit {
  readonly authService = inject(AuthService);
  readonly reportsService = inject(ReportsService);

  readonly showNewReport = signal(false);
  readonly selectedReport = signal<Report | null>(null);

  ngOnInit(): void {
    this.reportsService.getReports().subscribe();
  }

  viewReport(report: Report): void {
    this.selectedReport.set(report);
  }

  deleteReport(reportId: number): void {
    if (confirm('Tem certeza que deseja excluir este relatório?')) {
      this.reportsService.deleteReport(reportId).subscribe();
    }
  }

  formatCoords(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
