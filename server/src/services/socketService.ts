import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface SocketMessage {
  type: string;
  data?: any;
}

class SocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const ip = req.socket.remoteAddress;
      console.log(`[WebSocket] Client connected from ${ip}. Active clients: ${this.clients.size}`);

      // Send initial welcome & connection confirmation
      ws.send(JSON.stringify({
        type: 'connection:established',
        data: {
          message: 'Connected to Family TV Guardian Realtime Intelligence Stream',
          activeClients: this.clients.size,
          timestamp: new Date().toISOString(),
        },
      }));

      ws.on('message', (raw: string) => {
        try {
          const parsed: SocketMessage = JSON.parse(raw.toString());
          this.handleClientMessage(ws, parsed);
        } catch (err) {
          console.warn('[WebSocket] Invalid JSON received:', raw);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WebSocket] Client disconnected. Active clients: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.warn('[WebSocket] Client error:', err);
        this.clients.delete(ws);
      });
    });

    console.log(`⚡ WebSocket Server initialized on path /ws`);
  }

  private handleClientMessage(ws: WebSocket, message: SocketMessage): void {
    console.log(`[WebSocket] Received event: ${message.type}`);
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: new Date().toISOString() } }));
        break;
      case 'tv:app_switch':
        this.broadcast('app:active', message.data);
        break;
      case 'tv:frame_sample':
        this.broadcast('frame:new', message.data);
        break;
      default:
        this.broadcast(message.type, message.data);
    }
  }

  /**
   * Broadcasts a realtime event to all connected web clients and TV devices.
   */
  public broadcast(type: string, data: any): void {
    if (!this.wss || this.clients.size === 0) return;

    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }
}

export const socketService = new SocketService();
