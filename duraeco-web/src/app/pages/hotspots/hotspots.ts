import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService, Hotspot } from '../../core/services/reports.service';

@Component({
  selector: 'app-hotspots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
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
              class="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition"
            >
              Relatórios
            </a>
            <a
              routerLink="/hotspots"
              class="py-4 border-b-2 border-emerald-600 text-emerald-600 font-medium"
            >
              Hotspots
            </a>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-800">Hotspots de Resíduos</h2>
          <div class="flex gap-2">
            <button
              (click)="filterStatus.set('all')"
              class="px-3 py-1 rounded-full text-sm transition"
              [class]="filterStatus() === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              Todos
            </button>
            <button
              (click)="filterStatus.set('active')"
              class="px-3 py-1 rounded-full text-sm transition"
              [class]="filterStatus() === 'active' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              Ativos
            </button>
            <button
              (click)="filterStatus.set('resolved')"
              class="px-3 py-1 rounded-full text-sm transition"
              [class]="filterStatus() === 'resolved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              Resolvidos
            </button>
          </div>
        </div>

        @if (reportsService.isLoading()) {
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (hotspot of filteredHotspots(); track hotspot.hotspot_id) {
              <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
                <div class="h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <div class="text-white text-center">
                    <div class="text-4xl font-bold">{{ hotspot.total_reports }}</div>
                    <div class="text-sm opacity-80">relatórios</div>
                  </div>
                </div>
                <div class="p-4">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-gray-800">{{ hotspot.name }}</h3>
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium"
                      [class]="getStatusClass(hotspot.status)"
                    >
                      {{ hotspot.status }}
                    </span>
                  </div>

                  <div class="space-y-2 text-sm text-gray-600">
                    <div class="flex justify-between">
                      <span>Severidade média</span>
                      <span class="font-medium text-orange-600">
                        {{ hotspot.average_severity.toFixed(1) }}/5
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span>Raio</span>
                      <span class="font-medium">{{ hotspot.radius_meters }}m</span>
                    </div>
                    @if (hotspot.last_reported) {
                      <div class="flex justify-between">
                        <span>Último relatório</span>
                        <span class="font-medium">{{ formatDate(hotspot.last_reported) }}</span>
                      </div>
                    }
                  </div>

                  <div class="mt-4 pt-4 border-t flex gap-2">
                    <button
                      (click)="viewHotspot(hotspot)"
                      class="flex-1 text-center py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition text-sm"
                    >
                      Ver detalhes
                    </button>
                    <a
                      [href]="getMapLink(hotspot)"
                      target="_blank"
                      class="flex-1 text-center py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm"
                    >
                      Ver no mapa
                    </a>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="col-span-full text-center py-12 text-gray-500">
                Nenhum hotspot encontrado
              </div>
            }
          </div>
        }
      </main>

      <!-- Modal Detalhes do Hotspot -->
      @if (selectedHotspot()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-xl font-semibold">{{ selectedHotspot()!.name }}</h3>
              <button
                (click)="selectedHotspot.set(null)"
                class="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-orange-50 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-orange-600">
                    {{ selectedHotspot()!.total_reports }}
                  </div>
                  <div class="text-sm text-orange-600">Relatórios</div>
                </div>
                <div class="bg-red-50 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-red-600">
                    {{ selectedHotspot()!.average_severity.toFixed(1) }}
                  </div>
                  <div class="text-sm text-red-600">Severidade</div>
                </div>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Localização</span>
                <p class="font-medium">
                  {{ selectedHotspot()!.center_latitude.toFixed(6) }},
                  {{ selectedHotspot()!.center_longitude.toFixed(6) }}
                </p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Raio de cobertura</span>
                <p class="font-medium">{{ selectedHotspot()!.radius_meters }} metros</p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Status</span>
                <p>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    [class]="getStatusClass(selectedHotspot()!.status)"
                  >
                    {{ selectedHotspot()!.status }}
                  </span>
                </p>
              </div>

              <div>
                <span class="text-gray-500 text-sm">Criado em</span>
                <p class="font-medium">{{ formatDate(selectedHotspot()!.created_at) }}</p>
              </div>
            </div>

            <div class="mt-6 flex gap-3">
              <button
                (click)="selectedHotspot.set(null)"
                class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Fechar
              </button>
              <a
                [href]="getMapLink(selectedHotspot()!)"
                target="_blank"
                class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-center"
              >
                Abrir no Mapa
              </a>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Hotspots implements OnInit {
  readonly authService = inject(AuthService);
  readonly reportsService = inject(ReportsService);

  readonly filterStatus = signal<'all' | 'active' | 'monitoring' | 'resolved'>('all');
  readonly selectedHotspot = signal<Hotspot | null>(null);

  ngOnInit(): void {
    this.reportsService.getHotspots().subscribe();
  }

  filteredHotspots(): Hotspot[] {
    const status = this.filterStatus();
    const hotspots = this.reportsService.allHotspots();

    if (status === 'all') return hotspots;
    return hotspots.filter(h => h.status === status);
  }

  viewHotspot(hotspot: Hotspot): void {
    this.selectedHotspot.set(hotspot);
  }

  getMapLink(hotspot: Hotspot): string {
    return `https://www.google.com/maps?q=${hotspot.center_latitude},${hotspot.center_longitude}`;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-orange-100 text-orange-800',
      monitoring: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
