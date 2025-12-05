import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  imageUrl?: string;
  mapUrl?: string;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  session_id?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  tool_calls?: string[];
  image_url?: string;
  map_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // State
  private readonly messages = signal<ChatMessage[]>([]);
  private readonly sessionId = signal<string | null>(null);
  private readonly loading = signal(false);

  // Computed
  readonly allMessages = computed(() => this.messages());
  readonly isLoading = computed(() => this.loading());
  readonly currentSessionId = computed(() => this.sessionId());

  // Enviar mensagem para o agente de IA
  sendMessage(content: string, apiKey: string): Observable<ChatResponse> {
    this.loading.set(true);

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMessage]);

    // Preparar request
    const request: ChatRequest = {
      messages: this.messages().map(m => ({ role: m.role, content: m.content })),
      session_id: this.sessionId() || undefined
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    });

    return this.http.post<ChatResponse>(`${this.baseUrl}/api/chat`, request, { headers }).pipe(
      tap(response => {
        this.loading.set(false);
        this.sessionId.set(response.session_id);

        // Adicionar resposta do assistente
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          imageUrl: response.image_url,
          mapUrl: response.map_url
        };
        this.messages.update(msgs => [...msgs, assistantMessage]);
      }),
      catchError(error => {
        this.loading.set(false);
        // Remover mensagem do usuário em caso de erro
        this.messages.update(msgs => msgs.slice(0, -1));
        return throwError(() => error);
      })
    );
  }

  // Limpar conversa
  clearChat(): void {
    this.messages.set([]);
    this.sessionId.set(null);
  }

  // Iniciar nova sessão
  newSession(): void {
    this.clearChat();
  }
}
