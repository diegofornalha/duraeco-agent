import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-2xl font-bold text-emerald-600">DuraEco</h1>
          <div class="flex items-center gap-4">
            <a routerLink="/profile" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition">
              <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span class="text-sm font-semibold text-emerald-600">
                  {{ getInitials() }}
                </span>
              </div>
              <span>{{ authService.user()?.username }}</span>
            </a>
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
          <div class="flex gap-6 overflow-x-auto">
            <a
              routerLink="/dashboard"
              class="py-4 border-b-2 border-emerald-600 text-emerald-600 font-medium whitespace-nowrap"
            >
              Dashboard
            </a>
            <a
              routerLink="/reports"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition whitespace-nowrap"
            >
              Relatórios
            </a>
            <a
              routerLink="/hotspots"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition whitespace-nowrap"
            >
              Hotspots
            </a>
            <a
              routerLink="/map"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition whitespace-nowrap"
            >
              Mapa
            </a>
            <a
              routerLink="/chat"
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition whitespace-nowrap"
            >
              Chat IA
            </a>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        @if (reportsService.isLoading()) {
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
          </div>
        } @else {
          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-sm p-6">
              <div class="text-gray-500 text-sm mb-1">Total de Relatórios</div>
              <div class="text-3xl font-bold text-gray-800">
                {{ reportsService.dashboardStats()?.total_reports || 0 }}
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm p-6">
              <div class="text-gray-500 text-sm mb-1">Usuários</div>
              <div class="text-3xl font-bold text-gray-800">
                {{ reportsService.dashboardStats()?.total_users || 0 }}
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm p-6">
              <div class="text-gray-500 text-sm mb-1">Hotspots Ativos</div>
              <div class="text-3xl font-bold text-orange-600">
                {{ reportsService.dashboardStats()?.total_hotspots || 0 }}
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm p-6">
              <div class="text-gray-500 text-sm mb-1">Relatórios Hoje</div>
              <div class="text-3xl font-bold text-emerald-600">
                {{ reportsService.dashboardStats()?.reports_today || 0 }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Status Breakdown -->
            <div class="bg-white rounded-xl shadow-sm p-6">
              <h2 class="text-lg font-semibold text-gray-800 mb-4">Status dos Relatórios</h2>
              <div class="space-y-3">
                @for (status of reportsService.dashboardStats()?.status_breakdown || []; track status.status) {
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 capitalize">{{ status.status }}</span>
                    <span class="font-semibold text-gray-800">{{ status.count }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Top Waste Types -->
            <div class="bg-white rounded-xl shadow-sm p-6">
              <h2 class="text-lg font-semibold text-gray-800 mb-4">Tipos de Resíduos</h2>
              <div class="space-y-3">
                @for (waste of reportsService.dashboardStats()?.top_waste_types || []; track waste.name) {
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">{{ waste.name }}</span>
                    <span class="font-semibold text-gray-800">{{ waste.count }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Recent Reports -->
          <div class="mt-6 bg-white rounded-xl shadow-sm p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold text-gray-800">Relatórios Recentes</h2>
              <a routerLink="/reports" class="text-emerald-600 hover:underline text-sm">
                Ver todos
              </a>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="text-left text-gray-500 text-sm border-b">
                    <th class="pb-3">ID</th>
                    <th class="pb-3">Tipo</th>
                    <th class="pb-3">Status</th>
                    <th class="pb-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  @for (report of reportsService.dashboardStats()?.recent_reports || []; track report.report_id) {
                    <tr class="border-b last:border-0">
                      <td class="py-3 text-gray-800">#{{ report.report_id }}</td>
                      <td class="py-3 text-gray-600">{{ report.waste_type || 'N/A' }}</td>
                      <td class="py-3">
                        <span
                          class="px-2 py-1 rounded-full text-xs font-medium"
                          [class]="getStatusClass(report.status)"
                        >
                          {{ report.status }}
                        </span>
                      </td>
                      <td class="py-3 text-gray-500 text-sm">
                        {{ formatDate(report.created_at) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </main>
    </div>
  `
})
export class Dashboard implements OnInit {
  readonly authService = inject(AuthService);
  readonly reportsService = inject(ReportsService);

  ngOnInit(): void {
    this.reportsService.getStatistics().subscribe();
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

  getInitials(): string {
    const username = this.authService.user()?.username || '';
    return username.substring(0, 2).toUpperCase();
  }
}
