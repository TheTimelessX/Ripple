import { userBlade } from "../database/messages/blade";
import { fastify as fast } from "fastify";

const fastify = fast({ logger: true });

fastify.post("/signup", async (request, reply) => {
    const { name, bio } = request.body as { name: string, bio: string | null };
    const stat = await userBlade.add(name, bio);
    if ((stat as any).status === true){
        return reply.send(stat);
    } else {
        return reply.code(500).send(stat);
    }
});

fastify.post("/getMe", async (request, reply) => {
    const { auth } = request.body as { auth: string };
    const stat = await userBlade.getUserByAuth(auth);
    if (!stat){
        return reply.code(500).send({ status: false, message: "invalid auth token" });
    } else {
        return reply.send({ status: true, result: stat });
    }
});

fastify.post("/getUserById", async (request, reply) => {
    const { id } = request.body as { id: number };
    const stat = await userBlade.getUserById(id);
    if (!stat){
        return reply.code(500).send({ status: false, message: "invalid user id" });
    } else {
        delete (stat as any).auth;
        return reply.send({ status: true, result: stat });
    }
});

fastify.post("/getUserByName", async (request, reply) => {
    const { name } = request.body as { name: string };
    const stat = await userBlade.getUserByName(name);
    if (!stat){
        return reply.code(500).send({ status: false, message: "invalid username" });
    } else {
        delete (stat as any).auth;
        return reply.send({ status: true, result: stat });
    }
});

fastify.listen({ port: 6000, host: "0.0.0.0" }, async (err, addr) => {
    if (err){
        console.error(err.message);
    }

    if (addr){
        console.log(addr);
    }
});
