import { Component, inject, signal, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WebSocketChatService, ChatMessage } from '../../core/services/websocket-chat.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col relative">
      <!-- Header -->
      <header class="bg-emerald-600 text-white p-4 shadow-lg">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a routerLink="/dashboard" class="hover:bg-emerald-700 p-2 rounded-lg transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <div>
              <h1 class="text-xl font-bold flex items-center gap-2">
                Assistente DuraEco
                @if (chatService.isConnected()) {
                  <span class="w-2 h-2 bg-green-400 rounded-full" title="Conectado"></span>
                } @else {
                  <span class="w-2 h-2 bg-red-400 rounded-full animate-pulse" title="Desconectado"></span>
                }
              </h1>
              <p class="text-emerald-100 text-sm">Claude Agent SDK + RAG (Busca Vetorial)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="chatService.toggleHistory()"
              class="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
              [class.ring-2]="chatService.showHistory()"
              [class.ring-white]="chatService.showHistory()"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Historico
            </button>
            <button
              (click)="newChat()"
              class="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Nova Conversa
            </button>
          </div>
        </div>
      </header>

      <!-- History Sidebar -->
      @if (chatService.showHistory()) {
        <div class="absolute inset-0 z-50 flex" (click)="chatService.showHistory.set(false)">
          <!-- Backdrop -->
          <div class="flex-1 bg-black/30"></div>
          <!-- Sidebar -->
          <div class="w-80 bg-white shadow-xl flex flex-col h-full" (click)="$event.stopPropagation()">
            <div class="p-4 border-b flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Historico de Conversas</h2>
              <button (click)="chatService.showHistory.set(false)" class="text-gray-500 hover:text-gray-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto">
              @if (chatService.isLoadingSessions()) {
                <div class="p-4 text-center text-gray-500">
                  <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando...
                </div>
              } @else if (chatService.sessions().length === 0) {
                <div class="p-4 text-center text-gray-500">
                  <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Nenhuma conversa ainda
                </div>
              } @else {
                <div class="divide-y">
                  @for (session of chatService.sessions(); track session.session_id) {
                    <div class="p-3 hover:bg-gray-50 cursor-pointer group"
                         [class.bg-emerald-50]="chatService.conversationId() === session.session_id">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0" (click)="chatService.loadSession(session.session_id)">
                          <p class="text-sm font-medium text-gray-800 truncate">{{ session.title || 'Nova conversa' }}</p>
                          <p class="text-xs text-gray-500 mt-1">{{ chatService.formatRelativeDate(session.created_at) }}</p>
                        </div>
                        <button
                          (click)="confirmDelete(session.session_id, $event)"
                          class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition"
                          title="Apagar conversa"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Tool Indicators Panel -->
      @if (chatService.activeTools().size > 0) {
        <div class="bg-blue-50 border-b border-blue-200 p-3">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center gap-2 text-sm text-blue-700 font-medium mb-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Ferramentas em execução:
            </div>
            <div class="flex flex-wrap gap-2">
              @for (tool of Array.from(chatService.activeTools().values()); track tool.tool_use_id) {
                <div class="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border"
                     [class.border-blue-300]="tool.status === 'running'"
                     [class.border-green-300]="tool.status === 'done'"
                     [class.border-red-300]="tool.status === 'error'">
                  @if (tool.status === 'running') {
                    <div class="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  } @else if (tool.status === 'done') {
                    <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  } @else {
                    <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  }
                  <span class="text-xs">
                    {{ chatService.getToolIcon(tool.tool) }} {{ chatService.getToolDisplayName(tool.tool) }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      }


      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4" #messagesContainer>
        <div class="max-w-4xl mx-auto space-y-4">
          @if (chatService.messages().length === 0) {
            <div class="text-center py-12">
              <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-gray-700 mb-2">Olá! Como posso ajudar?</h2>
              <p class="text-gray-500 mb-6">Pergunte sobre relatórios, hotspots, estatísticas ou peça gráficos e mapas.</p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                @for (suggestion of suggestions; track suggestion) {
                  <button
                    (click)="sendSuggestion(suggestion)"
                    class="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition"
                  >
                    <span class="text-gray-700">{{ suggestion }}</span>
                  </button>
                }
              </div>
            </div>
          }

          @for (message of chatService.messages(); track $index) {
            <div [class]="message.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
              <div [class]="message.role === 'user'
                ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]'
                : 'bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%] shadow-sm'">

                @if (message.role === 'assistant') {
                  <div class="prose prose-sm max-w-none" [innerHTML]="formatMessage(message.content)"></div>

                  @if (message.imageUrl) {
                    <img [src]="message.imageUrl" alt="Gráfico gerado" class="mt-3 rounded-lg max-w-full"/>
                  }

                  @if (message.mapUrl) {
                    <a [href]="message.mapUrl" target="_blank"
                       class="mt-3 inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                      Ver mapa interativo
                    </a>
                  }
                } @else {
                  <p>{{ message.content }}</p>
                }
              </div>
            </div>
          }

          @if (chatService.isTyping()) {
            <div class="flex justify-start">
              <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div class="flex items-center gap-2">
                  <div class="flex gap-1">
                    <div class="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                  </div>
                  <span class="text-gray-500 text-sm">Processando...</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Input -->
      <div class="border-t bg-white p-4">
        <div class="max-w-4xl mx-auto">
          @if (chatService.error()) {
            <div class="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="flex-1">
                <p class="font-medium">Erro</p>
                <p class="text-sm">{{ chatService.error() }}</p>
              </div>
              <button (click)="chatService.error.set(null)" class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          }
          <form (submit)="sendMessage($event)" class="flex gap-3">
            <input
              type="text"
              [(ngModel)]="messageInput"
              name="message"
              placeholder="Digite sua mensagem..."
              [disabled]="chatService.isTyping() || !chatService.isConnected()"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              [disabled]="!messageInput.trim() || chatService.isTyping() || !chatService.isConnected()"
              class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  readonly chatService = inject(WebSocketChatService);
  readonly authService = inject(AuthService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messageInput = '';

  readonly suggestions = [
    'Quantos relatórios existem no sistema?',
    'Quais são os hotspots ativos?',
    'Mostre um gráfico dos tipos de resíduos'
  ];

  // Helper para template (para usar Array.from)
  readonly Array = Array;

  ngOnInit(): void {
    // Conectar ao WebSocket quando componente inicializar
    this.chatService.connect();
  }

  ngOnDestroy(): void {
    // Desconectar ao destruir componente
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.messageInput.trim()) return;

    const message = this.messageInput.trim();
    this.messageInput = '';

    // WebSocket service já gerencia o envio e os estados
    this.chatService.sendMessage(message);
  }

  sendSuggestion(suggestion: string): void {
    this.messageInput = suggestion;
    this.sendMessage(new Event('submit'));
  }

  newChat(): void {
    this.chatService.newSession();
  }

  confirmDelete(sessionId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Tem certeza que deseja apagar esta conversa?')) {
      this.chatService.deleteSession(sessionId);
    }
  }

  formatMessage(content: string): string {
    // Converter markdown básico para HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-2 rounded-lg max-w-full"/>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-emerald-600 hover:underline">$1</a>');
  }
}
