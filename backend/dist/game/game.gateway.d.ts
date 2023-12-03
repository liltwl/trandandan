import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
interface Ball {
    pos: {
        x: number;
        y: number;
    };
    speed: number;
    angle: number;
}
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private waitingFriend;
    private waitingRooms;
    private rooms;
    handleConnection(client: Socket, ...args: any[]): void;
    handleDisconnect(client: Socket): void;
    handleFriendsMode(client: Socket): void;
    handleGameMode(client: Socket, gameMode: 'classic' | 'crazy' | 'IA'): void;
    updateBallPosition(room: string, ball: Ball, mode: string): void;
    handlepaddlemove(client: Socket, payload: {
        room: string;
        pos: number;
        SecondPlayer: number;
        ball: Ball;
    }): void;
}
export {};
