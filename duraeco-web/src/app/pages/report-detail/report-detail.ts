import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReportsService, Report } from '../../core/services/reports.service';

@Component({
  selector: 'app-report-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-emerald-600 text-white p-4 shadow-lg">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a routerLink="/reports" class="hover:bg-emerald-700 p-2 rounded-lg transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <h1 class="text-xl font-bold">Detalhes do Relatório</h1>
          </div>
          @if (report()) {
            <button
              (click)="confirmDelete()"
              class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Excluir
            </button>
          }
        </div>
      </header>

      <div class="max-w-2xl mx-auto p-4">
        @if (loading()) {
          <div class="bg-white rounded-xl shadow-sm p-8 text-center">
            <div class="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
            <p class="mt-4 text-gray-500">Carregando...</p>
          </div>
        } @else if (error()) {
          <div class="bg-red-50 text-red-600 p-4 rounded-xl text-center">
            {{ error() }}
          </div>
        } @else if (report()) {
          <!-- Image -->
          @if (report()?.image_url) {
            <div class="mb-4">
              <img
                [src]="report()?.image_url"
                alt="Imagem do relatório"
                class="w-full h-64 object-cover rounded-xl shadow-sm"
              />
            </div>
          }

          <!-- Status Badge -->
          <div class="flex items-center gap-3 mb-4">
            <span [class]="getStatusClass(report()?.status)">
              {{ getStatusLabel(report()?.status) }}
            </span>
            @if (report()?.severity) {
              <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                Severidade: {{ report()?.severity }}/10
              </span>
            }
          </div>

          <!-- Main Info -->
          <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500 mb-1">Descrição</h3>
              <p class="text-gray-800">{{ report()?.description || 'Sem descrição' }}</p>
            </div>

            @if (report()?.waste_type) {
              <div>
                <h3 class="text-sm font-medium text-gray-500 mb-1">Tipo de Resíduo</h3>
                <span class="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  {{ report()?.waste_type }}
                </span>
              </div>
            }

            <div>
              <h3 class="text-sm font-medium text-gray-500 mb-1">Localização</h3>
              <p class="text-gray-800">
                {{ report()?.address || 'Coordenadas: ' + report()?.latitude + ', ' + report()?.longitude }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <h3 class="text-sm font-medium text-gray-500 mb-1">Latitude</h3>
                <p class="text-gray-800 font-mono">{{ report()?.latitude }}</p>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-500 mb-1">Longitude</h3>
                <p class="text-gray-800 font-mono">{{ report()?.longitude }}</p>
              </div>
            </div>

            <!-- Map Link -->
            <a
              [href]="getGoogleMapsUrl()"
              target="_blank"
              class="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Ver no Google Maps
            </a>
          </div>

          <!-- Metadata -->
          <div class="mt-4 bg-white rounded-xl shadow-sm p-6">
            <h3 class="font-semibold text-gray-800 mb-4">Informações Adicionais</h3>
            <dl class="space-y-3">
              <div class="flex justify-between">
                <dt class="text-gray-500">ID do Relatório</dt>
                <dd class="font-medium">#{{ report()?.report_id }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">ID do Usuário</dt>
                <dd class="font-medium">{{ report()?.user_id }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Criado em</dt>
                <dd class="font-medium">{{ formatDate(report()?.created_at) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Atualizado em</dt>
                <dd class="font-medium">{{ formatDate(report()?.updated_at) }}</dd>
              </div>
            </dl>
          </div>
        }
      </div>

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Confirmar Exclusão</h3>
            <p class="text-gray-600 mb-4">
              Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </p>
            <div class="flex gap-3">
              <button
                (click)="showDeleteModal.set(false)"
                class="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                (click)="deleteReport()"
                [disabled]="deleting()"
                class="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                @if (deleting()) {
                  Excluindo...
                } @else {
                  Excluir
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ReportDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportsService = inject(ReportsService);

  readonly report = signal<Report | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReport(parseInt(id, 10));
    } else {
      this.error.set('ID do relatório não encontrado');
      this.loading.set(false);
    }
  }

  private loadReport(id: number): void {
    this.reportsService.getReport(id).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.report.set(response.data);
        } else {
          this.error.set('Relatório não encontrado');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Erro ao carregar relatório');
      }
    });
  }

  getStatusClass(status?: string): string {
    const base = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'pending': return `${base} bg-yellow-100 text-yellow-700`;
      case 'verified': return `${base} bg-blue-100 text-blue-700`;
      case 'in_progress': return `${base} bg-purple-100 text-purple-700`;
      case 'resolved': return `${base} bg-emerald-100 text-emerald-700`;
      case 'rejected': return `${base} bg-red-100 text-red-700`;
      default: return `${base} bg-gray-100 text-gray-700`;
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'verified': return 'Verificado';
      case 'in_progress': return 'Em Andamento';
      case 'resolved': return 'Resolvido';
      case 'rejected': return 'Rejeitado';
      default: return status || 'Desconhecido';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
  }

  getGoogleMapsUrl(): string {
    const r = this.report();
    if (!r) return '';
    return `https://www.google.com/maps?q=${r.latitude},${r.longitude}`;
  }

  confirmDelete(): void {
    this.showDeleteModal.set(true);
  }

  deleteReport(): void {
    const r = this.report();
    if (!r) return;

    this.deleting.set(true);

    this.reportsService.deleteReport(r.report_id).subscribe({
      next: (response) => {
        this.deleting.set(false);
        if (response.success) {
          this.router.navigate(['/reports']);
        } else {
          this.error.set('Erro ao excluir relatório');
          this.showDeleteModal.set(false);
        }
      },
      error: (err) => {
        this.deleting.set(false);
        this.error.set(err.error?.detail || 'Erro ao excluir relatório');
        this.showDeleteModal.set(false);
      }
    });
  }
}
