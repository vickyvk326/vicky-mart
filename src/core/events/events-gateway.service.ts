import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(EventsGateway.name);
  }

  handleConnection(client: Socket) {
    this.logger.info(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.info(`Client disconnected: ${client.id}`);
  }

  // A generic join event for any room
  @SubscribeMessage('subscribe')
  handleJoinRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    client.join(data.room);
    this.logger.info(`Client ${client.id} joined room: ${data.room}`);
    return { event: 'subscribed', data: `Joined ${data.room}` };
  }

  // A generic leave event
  @SubscribeMessage('unsubscribe')
  handleLeaveRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.room);
    this.logger.info(`Client ${client.id} left room: ${data.room}`);
  }

  /**
   * Send an event to a specific room
   * @param room The ID of the room (e.g., jobId, userId)
   * @param event The name of the event (e.g., 'scraper_log', 'notify')
   * @param payload The data to send
   */
  emitToRoom(room: string, event: string, payload: any) {
    this.server.to(room).emit(event, payload);
  }

  sendMessageToRoom(jobId: string, message: string) {
    this.emitToRoom(jobId, 'scraper_event', {
      type: 'LOG',
      message,
      timestamp: new Date(),
    });
  }

  // Broadcast to everyone connected to the server
  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
