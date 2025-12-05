import { Component, inject, signal, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
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
              <h1 class="text-xl font-bold">Assistente DuraEco</h1>
              <p class="text-emerald-100 text-sm">Powered by Amazon Nova Pro</p>
            </div>
          </div>
          <button
            (click)="newChat()"
            class="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Nova Conversa
          </button>
        </div>
      </header>

      <!-- API Key Input (se não configurado) -->
      @if (!apiKey()) {
        <div class="max-w-4xl mx-auto w-full p-4">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 class="font-semibold text-yellow-800 mb-2">Configurar API Key</h3>
            <p class="text-yellow-700 text-sm mb-3">
              Para usar o chat com IA, você precisa configurar a API Key do sistema.
            </p>
            <div class="flex gap-2">
              <input
                type="password"
                [(ngModel)]="apiKeyInput"
                placeholder="Digite a API Key"
                class="flex-1 px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <button
                (click)="saveApiKey()"
                class="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4" #messagesContainer>
        <div class="max-w-4xl mx-auto space-y-4">
          @if (chatService.allMessages().length === 0) {
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

          @for (message of chatService.allMessages(); track $index) {
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

          @if (chatService.isLoading()) {
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
          <form (submit)="sendMessage($event)" class="flex gap-3">
            <input
              type="text"
              [(ngModel)]="messageInput"
              name="message"
              placeholder="Digite sua mensagem..."
              [disabled]="chatService.isLoading() || !apiKey()"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              [disabled]="!messageInput.trim() || chatService.isLoading() || !apiKey()"
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
export class Chat implements AfterViewChecked {
  readonly chatService = inject(ChatService);
  readonly authService = inject(AuthService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messageInput = '';
  apiKeyInput = '';
  readonly apiKey = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly suggestions = [
    'Quantos relatórios existem no sistema?',
    'Quais são os hotspots ativos?',
    'Mostre um gráfico dos tipos de resíduos',
    'O que é o DuraEco?'
  ];

  constructor() {
    // Carregar API key do localStorage
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('duraeco_api_key');
      if (savedKey) {
        this.apiKey.set(savedKey);
      }
    }
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

  saveApiKey(): void {
    if (this.apiKeyInput.trim()) {
      this.apiKey.set(this.apiKeyInput.trim());
      if (typeof window !== 'undefined') {
        localStorage.setItem('duraeco_api_key', this.apiKeyInput.trim());
      }
      this.apiKeyInput = '';
    }
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.messageInput.trim() || !this.apiKey()) return;

    const message = this.messageInput.trim();
    this.messageInput = '';
    this.error.set(null);

    this.chatService.sendMessage(message, this.apiKey()!).subscribe({
      error: (err) => {
        const errorMsg = err.error?.detail || 'Erro ao enviar mensagem';
        this.error.set(errorMsg);
      }
    });
  }

  sendSuggestion(suggestion: string): void {
    if (!this.apiKey()) return;
    this.messageInput = suggestion;
    this.sendMessage(new Event('submit'));
  }

  newChat(): void {
    this.chatService.newSession();
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
