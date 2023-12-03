"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let GameGateway = exports.GameGateway = class GameGateway {
    constructor() {
        this.waitingFriend = null;
        this.waitingRooms = {
            classic: null,
            crazy: null,
            IA: null,
        };
        this.rooms = {};
    }
    handleConnection(client, ...args) {
        console.log('A client just connected: ' + client.id);
    }
    handleDisconnect(client) {
        console.log('A client disconnected: ' + client.id);
        for (const gameMode in this.waitingRooms) {
            if (this.waitingRooms[gameMode]?.id === client.id) {
                this.waitingRooms[gameMode] = null;
            }
        }
        if (this.waitingFriend?.id === client.id) {
            this.waitingFriend = null;
        }
        for (const room in this.rooms) {
            if (this.rooms[room].players[0].id === client.id ||
                this.rooms[room].players[1].id === client.id) {
                client.broadcast.to(room).emit('PlayerDisconnected', {});
                clearInterval(this.rooms[room].intervalId);
                delete this.rooms[room];
            }
        }
    }
    handleFriendsMode(client) {
        if (this.waitingFriend) {
            const room = `${this.waitingFriend.id}-${client.id}`;
            client.join(room);
            this.waitingFriend.join(room);
            const initialBall = {
                pos: { x: 0, y: 0 },
                speed: 6 / 16,
                angle: Math.PI / 4,
            };
            this.rooms[room] = {
                ballPos: initialBall.pos,
                moveAngle: initialBall.angle,
                ballSpeed: initialBall.speed,
                intervalId: setInterval(() => this.updateBallPosition(room, initialBall, 'classic'), 1000 / 60),
                players: [
                    { id: this.waitingFriend.id, pos: 0 },
                    { id: client.id, pos: 0 },
                ],
            };
            this.server
                .to(this.waitingFriend.id)
                .emit('startgame', { room: room, SecondPlayer: 1, chosen: 'classic' });
            this.server
                .to(client.id)
                .emit('startgame', { room: room, SecondPlayer: 2, chosen: 'classic' });
            this.waitingFriend = null;
        }
        else {
            this.waitingFriend = client;
        }
    }
    handleGameMode(client, gameMode) {
        console.log(`Client ${client.id} chose ${gameMode} mode`);
        if (gameMode === 'IA') {
            const room = `${client.id}`;
            console.log(`Game started in ${gameMode} mode and ${client.id}`);
            client.join(room);
            const initialBall = {
                pos: { x: 0, y: 0 },
                speed: 6 / 16,
                angle: Math.PI / 4,
            };
            this.rooms[room] = {
                ballPos: initialBall.pos,
                moveAngle: initialBall.angle,
                gameMode: gameMode,
                ballSpeed: initialBall.speed,
                intervalId: setInterval(() => this.updateBallPosition(room, initialBall, gameMode), 1000 / 60),
                players: [
                    { id: client.id, pos: 0 },
                    { id: null, pos: 0 },
                ],
            };
            this.server
                .to(client.id)
                .emit('startgame', { room: room, SecondPlayer: 1, chosen: gameMode });
            this.waitingRooms[gameMode] = null;
        }
        else if (this.waitingRooms[gameMode]) {
            const room = `${this.waitingRooms[gameMode].id}-${client.id}`;
            client.join(room);
            this.waitingRooms[gameMode].join(room);
            const initialBall = {
                pos: { x: 0, y: 0 },
                speed: 6 / 16,
                angle: Math.PI / 4,
            };
            this.rooms[room] = {
                ballPos: initialBall.pos,
                moveAngle: initialBall.angle,
                ballSpeed: initialBall.speed,
                intervalId: setInterval(() => this.updateBallPosition(room, initialBall, gameMode), 1000 / 60),
                players: [
                    { id: this.waitingRooms[gameMode].id, pos: 0 },
                    { id: client.id, pos: 0 },
                ],
            };
            this.server
                .to(this.waitingRooms[gameMode].id)
                .emit('startgame', { room: room, SecondPlayer: 1, chosen: gameMode });
            this.server
                .to(client.id)
                .emit('startgame', { room: room, SecondPlayer: 2, chosen: gameMode });
            console.log(`Game started in ${gameMode} mode between ${this.waitingRooms[gameMode].id} and ${client.id}`);
            this.waitingRooms[gameMode] = null;
        }
        else {
            this.waitingRooms[gameMode] = client;
        }
    }
    updateBallPosition(room, ball, mode) {
        let newX = ball.pos.x - ball.speed * Math.cos(ball.angle);
        let newY = ball.pos.y + ball.speed * Math.sin(ball.angle);
        const paddleHeight = 6.625;
        if (newX > 540 / 16 &&
            newY <= this.rooms[room].players[1].pos + paddleHeight / 2 &&
            newY >= this.rooms[room].players[1].pos - paddleHeight / 2) {
            newX = 540 / 16;
            ball.angle = Math.PI - ball.angle;
        }
        if (newX < -535 / 16 &&
            newY <= this.rooms[room].players[0].pos + paddleHeight / 2 &&
            newY >= this.rooms[room].players[0].pos - paddleHeight / 2) {
            newX = -535 / 16;
            ball.angle = Math.PI - ball.angle;
        }
        if (newX < -575 / 16 || newX > 580 / 16) {
            if (newX < -575 / 16) {
                this.server.to(this.rooms[room].players[0].id).emit('rightscored');
                this.server.to(this.rooms[room].players[1].id).emit('leftscored');
                newX = 0;
                newY = 0;
                ball.speed = 6 / 16;
            }
            else if (newX > 580 / 16) {
                this.server.to(this.rooms[room].players[0].id).emit('leftscored');
                this.server.to(this.rooms[room].players[1].id).emit('rightscored');
                newX = 0;
                newY = 0;
                ball.speed = 6 / 16;
            }
        }
        if (newY < -320 / 16 || newY > 325 / 16) {
            newY = newY < -320 / 16 ? -320 / 16 : 325 / 16;
            ball.angle *= -1;
            ball.speed += 0.03;
        }
        ball.pos = { x: newX, y: newY };
        this.server.to(this.rooms[room].players[0].id).emit('ballmove', ball.pos);
        this.server.to(this.rooms[room].players[1].id).emit('ballmove', ball.pos);
        if (this.rooms[room]?.gameMode === 'IA') {
            const maxPos = 17.5;
            const minPos = -17.187;
            const paddlepos1 = Math.min(Math.max(ball.pos.y, minPos), maxPos);
            this.server
                .to(this.rooms[room].players[0].id)
                .emit('paddlemove', paddlepos1);
            this.rooms[room].players[1].pos = paddlepos1;
        }
    }
    handlepaddlemove(client, payload) {
        client.broadcast.to(payload.room).emit('paddlemove', payload.pos);
        if (this.rooms[payload.room] && payload.SecondPlayer === 1) {
            this.rooms[payload.room].players[0].pos = payload.pos;
        }
        else if (this.rooms[payload.room] && payload.SecondPlayer === 2) {
            this.rooms[payload.room].players[1].pos = payload.pos;
        }
    }
};
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('friends'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleFriendsMode", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('gameMode'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleGameMode", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('paddlemove'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handlepaddlemove", null);
exports.GameGateway = GameGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true, namespace: 'game' })
], GameGateway);
//# sourceMappingURL=game.gateway.js.map