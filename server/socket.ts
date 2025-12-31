import { MessageBlade } from "../database/messages/blade";
import { fastify as fast } from "fastify";
import fastifycors from '@fastify/cors';
import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { Socket } from 'socket.io';

const messageBlade = new MessageBlade();
const fastify = fast({
  logger: true
});

fastify.register(fastifycors, {
  origin: "*"
});

const httpServer: HTTPServer = fastify.server;
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("sign", () => {
    socket.join("global-room");
  });

  socket.on("sendMessage", async (data: { from_auth: string, text: string }) => {
    console.log(data)
    await messageBlade.add(data.from_auth, data.text).then(async (msg) => {
        console.log("new message detected")
        const _msg = {
            from_id: (msg as any).message.from_id,
            text: (msg as any).message.text,
            name: (msg as any).message.from.name,
            verified: (msg as any).message.from.verified == 'false' ? false : true
        }
        io.to("global-room").emit("newMessage", _msg);
    })
  });

  socket.on("disconnect", (reason: string) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });
});

(async () => {
    try {
    await fastify.listen({ port: 7002, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();
