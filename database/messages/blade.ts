import MessageHandler from "./handler";
import { UserBlade } from "../users/blade";
import { Message } from "../../modules/message";
import { randomInt } from "crypto";

export const userBlade = new UserBlade();

export class MessageBlade {
    private readonly TextMessageRegex: RegExp = /^[\p{L}\p{N}\p{P}\p{Z}\p{S}\p{M}\s\n\r\t]*$/u;

    async ensureConnected(): Promise<void> {
        await MessageHandler.connect();
    }

    async getMessages(): Promise<Message[]> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const allmessages = await MessageHandler.collection("messages").find({ }).sort({ createdAt: -1 }).limit(25).toArray() as any as Omit<Message, "from">[];
            const newfrommessages: Message[] = [];
            for (const msg of allmessages as any as Message[]){
                const user = await userBlade.getUserById(msg.from_id);
                if (!user){
                    msg.from = null;
                    newfrommessages.push(msg);
                } else {
                    msg.from = user;
                    newfrommessages.push(msg);
                }
            }

            return resolve(newfrommessages);
        })
    }

    async add(
        from_auth: string,
        text: string
    ): Promise<object> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const user = await userBlade.getUserByAuth(from_auth);
            text = text.trim().normalize();
            if (!user){
                return resolve({
                    status: false,
                    message: "invalid auth token"
                });
            }

            if ((text.length === 0) || (text.length > 4096)){
                return resolve({
                    status: false,
                    message: "invalid text length"
                });
            }

            if (!(this.TextMessageRegex.test(text))){
                return resolve({
                    status: false,
                    message: "invalid text syntax"
                });
            }

            const message: Omit<Message, "from"> = {
                from_id: user.id,
                id: randomInt(99999999999999), text
            }

            delete (user as any).auth;
            await MessageHandler.collection("messages").insertOne(message);
            return resolve({ status: true, message: {
                ...message,
                from: user
            }});
        })
    }
}
