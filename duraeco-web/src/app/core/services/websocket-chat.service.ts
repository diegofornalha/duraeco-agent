/**
 * WebSocket Chat Service - Real-time streaming chat com Claude Agent SDK
 *
 * Inspirado em: /Users/2a/Desktop/duraeco/chat-simples/js/app.js
 * Backend: /Users/2a/Desktop/duraeco/backend-ai/routes/chat_routes.py
 *
 * Características:
 * - WebSocket streaming em tempo real
 * - RAG com busca vetorial (image + location embeddings)
 * - Indicadores de ferramentas (tool_start, tool_result)
 * - Reconexão automática com exponential backoff
 * - State management com Angular Signals
 */

import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  mapUrl?: string;
}

export interface ToolEvent {
  tool: string;
  tool_use_id: string;
  status: 'running' | 'done' | 'error';
  input?: any;
  content?: string;
}

export interface WebSocketMessage {
  type: 'user_message_saved' | 'text_chunk' | 'thinking' | 'tool_start' | 'tool_result' | 'result' | 'error';
  conversation_id?: string;
  content?: string;
  tool?: string;
  tool_use_id?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  cost?: number;
  duration_ms?: number;
  num_turns?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketChatService {
  private readonly authService = inject(AuthService);

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectDelay = 1000; // Start with 1s
  private reconnectTimeout?: number;

  // Signals (state management)
  readonly messages = signal<ChatMessage[]>([]);
  readonly isConnected = signal(false);
  readonly isTyping = signal(false);
  readonly activeTools = signal<Map<string, ToolEvent>>(new Map());
  readonly conversationId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly thinkingContent = signal<string>(''); // Debug: conteúdo do thinking

  /**
   * Conectar ao WebSocket do backend
   */
  connect(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.error('[WebSocketChat] No token available');
      this.error.set('Não autenticado. Faça login novamente.');
      return;
    }

    // WebSocket URL com token como query param
    const wsProtocol = environment.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = environment.apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/chat/ws?token=${token}`;

    console.log('[WebSocketChat] Connecting to:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebSocketChat] Connected');
      this.isConnected.set(true);
      this.error.set(null);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Limpar timeout de reconexão se houver
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('[WebSocketChat] Error parsing message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocketChat] WebSocket error:', error);
      this.error.set('Erro de conexão com o servidor');
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocketChat] Closed:', event.code, event.reason);
      this.isConnected.set(false);
      this.isTyping.set(false);

      // Não reconectar se foi fechamento normal (código 1000) ou unauthorized (4001)
      if (event.code === 1000 || event.code === 4001) {
        console.log('[WebSocketChat] Connection closed normally or unauthorized');
        if (event.code === 4001) {
          this.error.set('Sessão expirada. Faça login novamente.');
        }
        return;
      }

      // Tentar reconectar
      this.attemptReconnect();
    };
  }

  /**
   * Tentar reconexão com exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocketChat] Max reconnect attempts reached');
      this.error.set('Não foi possível reconectar. Atualize a página.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocketChat] Reconnecting... attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff: 1s, 2s, 4s, 8s, 15s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15000);
  }

  /**
   * Handler para mensagens do WebSocket
   */
  private handleMessage(data: WebSocketMessage): void {
    console.log('[WebSocketChat] Message:', data.type, data);

    switch (data.type) {
      case 'user_message_saved':
        this.conversationId.set(data.conversation_id ?? null);
        this.isTyping.set(true);
        this.error.set(null);
        break;

      case 'text_chunk': {
        // Append to last assistant message or create new
        const content = data.content ?? '';
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];

        if (lastMsg && lastMsg.role === 'assistant') {
          // Atualizar ultima mensagem
          lastMsg.content += content;
          this.messages.set([...msgs]);
        } else {
          // Criar nova mensagem do assistente
          this.messages.update(m => [...m, {
            role: 'assistant' as const,
            content: content,
            timestamp: new Date()
          }]);
        }
        break;
      }

      case 'thinking':
        // Optionally show in debug panel
        this.thinkingContent.update(t => t + (data.content ?? ''));
        console.log('[WebSocketChat] Thinking:', data.content);
        break;

      case 'tool_start': {
        const toolUseId = data.tool_use_id ?? '';
        const toolName = data.tool ?? 'unknown';
        this.activeTools.update(tools => {
          const newTools = new Map(tools);
          newTools.set(toolUseId, {
            tool: toolName,
            tool_use_id: toolUseId,
            status: 'running',
            input: data.input
          });
          return newTools;
        });
        break;
      }

      case 'tool_result': {
        const toolUseId = data.tool_use_id ?? '';
        this.activeTools.update(tools => {
          const newTools = new Map(tools);
          const tool = newTools.get(toolUseId);
          if (tool) {
            tool.status = data.is_error ? 'error' : 'done';
            tool.content = data.content;
            newTools.set(toolUseId, tool);

            // Auto-remove after 3s
            setTimeout(() => {
              this.activeTools.update(t => {
                const updated = new Map(t);
                updated.delete(toolUseId);
                return updated;
              });
            }, 3000);
          }
          return newTools;
        });
        break;
      }

      case 'result':
        this.isTyping.set(false);
        console.log('[WebSocketChat] Conversation complete:', {
          cost: data.cost,
          duration_ms: data.duration_ms,
          num_turns: data.num_turns
        });

        // Limpar thinking content
        this.thinkingContent.set('');
        break;

      case 'error':
        this.isTyping.set(false);
        this.error.set(data.error || 'Erro desconhecido');
        console.error('[WebSocketChat] Error:', data.error);

        // Remover última mensagem do usuário em caso de erro
        this.messages.update(msgs => {
          const filtered = msgs.filter(m => m.role !== 'user' || msgs.indexOf(m) !== msgs.length - 1);
          return filtered;
        });
        break;
    }
  }

  /**
   * Enviar mensagem
   */
  sendMessage(content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocketChat] WebSocket not connected');
      this.error.set('Não conectado. Tentando reconectar...');
      this.connect();
      return;
    }

    if (!content.trim()) {
      return;
    }

    // Add user message locally
    this.messages.update(m => [...m, {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }]);

    // Send to server
    const payload = {
      message: content.trim(),
      conversation_id: this.conversationId()
    };

    console.log('[WebSocketChat] Sending message:', payload);
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Limpar chat (manter conversação no servidor)
   */
  clearChat(): void {
    this.messages.set([]);
    this.conversationId.set(null);
    this.activeTools.set(new Map());
    this.thinkingContent.set('');
    this.error.set(null);
  }

  /**
   * Nova sessão (limpa local + força nova sessão no servidor)
   */
  newSession(): void {
    this.clearChat();
  }

  /**
   * Desconectar WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      console.log('[WebSocketChat] Disconnecting...');
      this.ws.close(1000, 'User disconnected'); // 1000 = normal closure
      this.ws = null;
    }

    this.isConnected.set(false);
    this.isTyping.set(false);
  }

  /**
   * Ícones para ferramentas (UI helper)
   */
  getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
      'mcp__duraeco__search_similar_waste_images': '🔍',
      'mcp__duraeco__search_reports_by_location': '📍',
      'mcp__duraeco__execute_sql_query': '💾',
      'search_similar_waste_images': '🔍',
      'search_reports_by_location': '📍',
      'execute_sql_query': '💾',
    };
    return icons[toolName] || '🔧';
  }

  /**
   * Nome legível da ferramenta (UI helper)
   */
  getToolDisplayName(toolName: string): string {
    const names: Record<string, string> = {
      'mcp__duraeco__search_similar_waste_images': 'Buscar imagens similares',
      'mcp__duraeco__search_reports_by_location': 'Buscar por localização',
      'mcp__duraeco__execute_sql_query': 'Consultar banco de dados',
      'search_similar_waste_images': 'Buscar imagens similares',
      'search_reports_by_location': 'Buscar por localização',
      'execute_sql_query': 'Consultar banco de dados',
    };
    return names[toolName] || toolName;
  }
}
