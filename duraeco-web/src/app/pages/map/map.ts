import { Component, inject, signal, ChangeDetectionStrategy, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportsService, Hotspot, Report } from '../../core/services/reports.service';

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header -->
      <header class="bg-emerald-600 text-white p-4 shadow-lg">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a routerLink="/dashboard" class="hover:bg-emerald-700 p-2 rounded-lg transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <h1 class="text-xl font-bold">Mapa de Hotspots</h1>
          </div>
          <div class="flex gap-2">
            <button
              (click)="viewMode.set('hotspots')"
              [class]="viewMode() === 'hotspots' ? 'bg-white text-emerald-600' : 'bg-emerald-700 text-white'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Hotspots
            </button>
            <button
              (click)="viewMode.set('reports')"
              [class]="viewMode() === 'reports' ? 'bg-white text-emerald-600' : 'bg-emerald-700 text-white'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Relatórios
            </button>
          </div>
        </div>
      </header>

      <div class="flex-1 flex">
        <!-- Sidebar -->
        <aside class="w-80 bg-white shadow-lg overflow-y-auto">
          <div class="p-4">
            @if (viewMode() === 'hotspots') {
              <h2 class="font-semibold text-gray-800 mb-4">
                Hotspots ({{ hotspots().length }})
              </h2>

              @if (loading()) {
                <div class="text-center py-8">
                  <div class="animate-spin w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (hotspot of hotspots(); track hotspot.hotspot_id) {
                    <button
                      (click)="selectHotspot(hotspot)"
                      [class]="selectedHotspot()?.hotspot_id === hotspot.hotspot_id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'"
                      class="w-full text-left p-3 border rounded-lg transition"
                    >
                      <div class="flex items-start justify-between">
                        <h3 class="font-medium text-gray-800">{{ hotspot.name }}</h3>
                        <span [class]="getStatusBadge(hotspot.status)">
                          {{ hotspot.status }}
                        </span>
                      </div>
                      <div class="mt-2 text-sm text-gray-500 space-y-1">
                        <p>{{ hotspot.total_reports }} relatórios</p>
                        <p>Severidade média: {{ hotspot.average_severity?.toFixed(1) }}</p>
                      </div>
                    </button>
                  } @empty {
                    <p class="text-gray-500 text-center py-4">Nenhum hotspot encontrado</p>
                  }
                </div>
              }
            } @else {
              <h2 class="font-semibold text-gray-800 mb-4">
                Relatórios Recentes
              </h2>

              <div class="space-y-3">
                @for (report of reports(); track report.report_id) {
                  <a
                    [routerLink]="['/reports', report.report_id]"
                    class="block p-3 border border-gray-200 rounded-lg hover:border-emerald-300 transition"
                  >
                    <div class="flex items-start justify-between">
                      <span class="text-sm font-medium text-gray-800">#{{ report.report_id }}</span>
                      <span [class]="getReportStatusBadge(report.status)">
                        {{ report.status }}
                      </span>
                    </div>
                    <p class="mt-1 text-sm text-gray-600 line-clamp-2">
                      {{ report.description || 'Sem descrição' }}
                    </p>
                    <p class="mt-2 text-xs text-gray-400">
                      {{ formatDate(report.created_at) }}
                    </p>
                  </a>
                } @empty {
                  <p class="text-gray-500 text-center py-4">Nenhum relatório encontrado</p>
                }
              </div>
            }
          </div>
        </aside>

        <!-- Map Container -->
        <div class="flex-1 relative">
          <!-- Simple Map Visualization (without external library) -->
          <div class="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
            <div class="text-center">
              <div class="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-700 mb-2">Visualização de Mapa</h3>
              <p class="text-gray-500 mb-4 max-w-md">
                Selecione um hotspot na lista para ver os detalhes ou use os links abaixo.
              </p>

              @if (selectedHotspot()) {
                <div class="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto text-left">
                  <h4 class="font-semibold text-emerald-600 mb-2">{{ selectedHotspot()?.name }}</h4>
                  <dl class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <dt class="text-gray-500">Coordenadas</dt>
                      <dd class="font-mono text-gray-700">
                        {{ selectedHotspot()?.center_latitude?.toFixed(4) }},
                        {{ selectedHotspot()?.center_longitude?.toFixed(4) }}
                      </dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-gray-500">Raio</dt>
                      <dd class="text-gray-700">{{ selectedHotspot()?.radius_meters }}m</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-gray-500">Relatórios</dt>
                      <dd class="text-gray-700">{{ selectedHotspot()?.total_reports }}</dd>
                    </div>
                  </dl>
                  <a
                    [href]="getGoogleMapsUrl(selectedHotspot())"
                    target="_blank"
                    class="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    Abrir no Google Maps
                  </a>
                </div>
              } @else {
                <div class="flex gap-4 justify-center">
                  @for (hotspot of hotspots().slice(0, 3); track hotspot.hotspot_id) {
                    <a
                      [href]="getGoogleMapsUrl(hotspot)"
                      target="_blank"
                      class="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition text-sm"
                    >
                      {{ hotspot.name }}
                    </a>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Floating Markers Legend -->
          <div class="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
            <h4 class="font-medium text-gray-700 mb-2">Legenda</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Alta severidade (&gt;7)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full bg-orange-500"></div>
                <span>Média severidade (4-7)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>Baixa severidade (&lt;4)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MapPage implements OnInit {
  private readonly reportsService = inject(ReportsService);

  readonly viewMode = signal<'hotspots' | 'reports'>('hotspots');
  readonly hotspots = signal<Hotspot[]>([]);
  readonly reports = signal<Report[]>([]);
  readonly loading = signal(true);
  readonly selectedHotspot = signal<Hotspot | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    // Load hotspots
    this.reportsService.getHotspots().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.hotspots.set(response.data.hotspots);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });

    // Load recent reports
    this.reportsService.getReports(1, 20).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.reports.set(response.data.reports);
        }
      }
    });
  }

  selectHotspot(hotspot: Hotspot): void {
    this.selectedHotspot.set(hotspot);
  }

  getStatusBadge(status: string): string {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    switch (status) {
      case 'active': return `${base} bg-red-100 text-red-700`;
      case 'monitoring': return `${base} bg-yellow-100 text-yellow-700`;
      case 'resolved': return `${base} bg-green-100 text-green-700`;
      default: return `${base} bg-gray-100 text-gray-700`;
    }
  }

  getReportStatusBadge(status: string): string {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    switch (status) {
      case 'pending': return `${base} bg-yellow-100 text-yellow-700`;
      case 'verified': return `${base} bg-blue-100 text-blue-700`;
      case 'in_progress': return `${base} bg-purple-100 text-purple-700`;
      case 'resolved': return `${base} bg-green-100 text-green-700`;
      default: return `${base} bg-gray-100 text-gray-700`;
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  getGoogleMapsUrl(hotspot: Hotspot | null): string {
    if (!hotspot) return '';
    return `https://www.google.com/maps?q=${hotspot.center_latitude},${hotspot.center_longitude}&z=15`;
  }
}
