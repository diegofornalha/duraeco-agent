import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface WasteType {
  waste_type_id: number;
  name: string;
  description: string;
  hazard_level: 'low' | 'medium' | 'high' | 'critical';
  icon_url?: string;
}

export interface Report {
  report_id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  image_url?: string;
  status: 'pending' | 'verified' | 'in_progress' | 'resolved' | 'rejected';
  severity?: number;
  waste_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Hotspot {
  hotspot_id: number;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  total_reports: number;
  average_severity: number;
  status: 'active' | 'monitoring' | 'resolved';
  last_reported?: string;
  created_at: string;
}

export interface CreateReportRequest {
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  image?: File;
}

export interface NearbyRequest {
  latitude: number;
  longitude: number;
  radius_km?: number;
}

export interface DashboardStatistics {
  total_reports: number;
  total_users: number;
  total_hotspots: number;
  reports_today: number;
  reports_this_week: number;
  reports_this_month: number;
  status_breakdown: { status: string; count: number }[];
  top_waste_types: { name: string; count: number }[];
  recent_reports: Report[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly api = inject(ApiService);

  // State
  private readonly reports = signal<Report[]>([]);
  private readonly hotspots = signal<Hotspot[]>([]);
  private readonly wasteTypes = signal<WasteType[]>([]);
  private readonly statistics = signal<DashboardStatistics | null>(null);
  private readonly loading = signal(false);

  // Computed
  readonly allReports = computed(() => this.reports());
  readonly allHotspots = computed(() => this.hotspots());
  readonly allWasteTypes = computed(() => this.wasteTypes());
  readonly dashboardStats = computed(() => this.statistics());
  readonly isLoading = computed(() => this.loading());

  readonly activeHotspots = computed(() =>
    this.hotspots().filter(h => h.status === 'active')
  );

  readonly pendingReports = computed(() =>
    this.reports().filter(r => r.status === 'pending')
  );

  // Reports
  getReports(page = 1, limit = 20): Observable<ApiResponse<{ reports: Report[]; total: number }>> {
    this.loading.set(true);
    return this.api.get<{ reports: Report[]; total: number }>(`/api/reports?page=${page}&limit=${limit}`).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.reports.set(response.data.reports);
        }
      })
    );
  }

  getReport(reportId: number): Observable<ApiResponse<Report>> {
    return this.api.get<Report>(`/api/reports/${reportId}`);
  }

  createReport(data: CreateReportRequest): Observable<ApiResponse<Report>> {
    this.loading.set(true);
    const formData = new FormData();
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    if (data.address) formData.append('address', data.address);
    if (data.description) formData.append('description', data.description);
    if (data.image) formData.append('image', data.image);

    return this.api.postFormData<Report>('/api/reports', formData).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.reports.update(reports => [response.data!, ...reports]);
        }
      })
    );
  }

  deleteReport(reportId: number): Observable<ApiResponse> {
    return this.api.delete(`/api/reports/${reportId}`).pipe(
      tap(response => {
        if (response.success) {
          this.reports.update(reports =>
            reports.filter(r => r.report_id !== reportId)
          );
        }
      })
    );
  }

  getNearbyReports(data: NearbyRequest): Observable<ApiResponse<Report[]>> {
    const params = new URLSearchParams({
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      ...(data.radius_km && { radius_km: data.radius_km.toString() })
    });
    return this.api.get<Report[]>(`/api/reports/nearby?${params}`);
  }

  // Hotspots
  getHotspots(): Observable<ApiResponse<{ hotspots: Hotspot[] }>> {
    this.loading.set(true);
    return this.api.get<{ hotspots: Hotspot[] }>('/api/hotspots').pipe(
      tap(response => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.hotspots.set(response.data.hotspots);
        }
      })
    );
  }

  getHotspotReports(hotspotId: number): Observable<ApiResponse<Report[]>> {
    return this.api.get<Report[]>(`/api/hotspots/${hotspotId}/reports`);
  }

  // Waste Types
  getWasteTypes(): Observable<ApiResponse<{ waste_types: WasteType[] }>> {
    return this.api.get<{ waste_types: WasteType[] }>('/api/waste-types').pipe(
      tap(response => {
        if (response.success && response.data) {
          this.wasteTypes.set(response.data.waste_types);
        }
      })
    );
  }

  // Dashboard
  getStatistics(): Observable<ApiResponse<DashboardStatistics>> {
    this.loading.set(true);
    return this.api.get<DashboardStatistics>('/api/dashboard/statistics').pipe(
      tap(response => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.statistics.set(response.data);
        }
      })
    );
  }
}
