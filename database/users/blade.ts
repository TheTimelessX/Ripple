import UserHandler from "./handler";
import { User } from "../../modules/user";
import { Cache } from "../redis/caching";
import { redis } from "../redis/redis";
import { randomUUID, randomInt } from "crypto";

export class UserBlade {
    private readonly UsernameRegex  : RegExp = /^[a-zA-Z]([a-zA-Z0-9]_?){3,30}[a-zA-Z0-9]$/;
    private readonly BioRegex       : RegExp = /^[\p{L}\p{N}\p{P}\p{Z}\p{S}\p{M}\s\n\r\t]*$/u;
    
    async ensureConnected(): Promise<void> {
        await UserHandler.connect();
    }

    async getUsers(): Promise<User[]> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const allusers = await UserHandler.collection("users").find({ }).toArray();
            resolve(allusers as any as User[]);
            return;
        })
    }

    async getUserById(id: number): Promise<User | null> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const redisuser = await Cache.hgetAll(`user:${id}`);
            if (redisuser){
                resolve(redisuser.user as any as User);
                return;
            }

            const dbuser = await UserHandler.collection("users").findOne({ id });
            if (dbuser){
                await Cache.haddMany(`user:${id}`, dbuser, 1200);
                resolve(dbuser as any as User);
                return;
            } else {
                resolve(null);
                return;
            }
        })
    }

    async getUserByAuth(auth: string): Promise<User | null> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const redisusers = await redis.keys("user:*");

            for (const ruser of redisusers){
                const user = await redis.hgetall(ruser);
                if (user.auth === auth){
                    resolve(user as any as User);
                    return;
                }
            }

            const dbuser = await UserHandler.collection("users").findOne({ auth });
            if (dbuser){
                await Cache.haddMany(`user:${dbuser.id}`, dbuser, 1200);
                resolve(dbuser as any as User);
                return;
            } else {
                resolve(null);
                return;
            }
        })
    }

    async getUserByName(name: string): Promise<User | null> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const redisusers = await redis.keys("user:*");

            for (const ruser of redisusers){
                const user = await redis.hgetall(ruser);
                if (user.name.toLowerCase() === name.toLowerCase()){
                    resolve(user as any as User);
                    return;
                }
            }

            const dbuser = await UserHandler.collection("users").findOne({ name });
            if (dbuser){
                await Cache.haddMany(`user:${dbuser.id}`, dbuser, 1200);
                resolve(dbuser as any as User);
                return;
            } else {
                resolve(null);
                return;
            }
        })
    }

    async add(
        name: string,
        bio: string | null
    ): Promise<object> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            name = name.trim().normalize().toLowerCase();
            bio  = bio === null ? "" : bio.trim().normalize();
            
            if (!(this.UsernameRegex.test(name))){
                return resolve({
                    status: false,
                    message: "invalid name syntax"
                });
            }

            if (!(this.BioRegex.test(bio))){
                return resolve({
                    status: false,
                    message: "invalid bio syntax"
                });
            }

            if (bio.length > 4096){
                return resolve({
                    status: false,
                    message: "bio is too long"
                });
            }

            const userexists = await this.getUserByName(name);
            if (userexists){
                return resolve({
                    status: false,
                    message: "existing name, please try again"
                });
            }

            if (name === "deleted_account"){
                return resolve({
                    status: false,
                    message: "invalid name syntax"
                });
            }

            if (name.includes("⨈")){
                return resolve({
                    status: false,
                    message: "invalid name syntax"
                });
            }

            const user: User = {
                auth: randomUUID(),
                id: randomInt(9999999999),
                verified: false,
                bio, name
            }

            await UserHandler.collection("users").insertOne(user);
            await Cache.haddMany(`user:${user.id}`, user as any as Record<string, unknown>, 1200);

            return resolve({
                status: true,
                result: user
            });
        })
    }

    async update(
        auth: string,
        options: Partial<Omit<User, "auth" | "id" | "verified">>
    ): Promise<object> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const user = await this.getUserByAuth(auth);
            if (!user){
                return resolve({
                    status: false,
                    message: "invalid auth token"
                });
            }

            if (options.name){
                options.name = options.name.trim().normalize().toLowerCase();
            }

            if (options.bio){
                options.bio = options.bio.trim().normalize();
            }

            const newuser = { ...user, ...options };
            
            if (!(this.UsernameRegex.test(newuser.name))){
                return resolve({
                    status: false,
                    message: "invalid name syntax"
                });
            }

            if (!(this.BioRegex.test(newuser.bio))){
                return resolve({
                    status: false,
                    message: "invalid bio syntax"
                });
            }

            if (newuser.bio.length > 4096){
                return resolve({
                    status: false,
                    message: "bio is too long"
                });
            }

            const userexists = await this.getUserByName(newuser.name);
            if (userexists){
                return resolve({
                    status: false,
                    message: "existing name, please try again"
                });
            }

            if (newuser.name === "deleted_account"){
                return resolve({
                    status: false,
                    message: "invalid name syntax"
                });
            }

            if (newuser.name.includes("⨈")){
                return resolve({
                    status: false,
                    message: "invalid name syntax"
                });
            }

            await UserHandler.collection("users").updateOne({ auth }, { $set: { name: newuser.name, bio: newuser.bio } });
            await Cache.haddMany(`user:${user.id}`, newuser as any as Record<string, unknown>, 1200);

            return resolve({
                status: true,
                result: newuser
            });
        })
    }

    async remove(
        auth: string
    ): Promise<object> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const user = await this.getUserByAuth(auth);

            if (!user){
                return resolve({
                    status: false,
                    message: "invalid auth token"
                });
            }

            await UserHandler.collection("users").deleteOne({ auth });
            await Cache.hdelAll(`user:${user.id}`);

            return resolve({
                status: true
            });
        })
    }

    async verify(
        auth: string
    ): Promise<object> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const user = await this.getUserByAuth(auth);

            if (!user){
                return resolve({
                    status: false,
                    message: "invalid auth token"
                });
            }

            user.verified = true;

            await UserHandler.collection("users").updateOne({ auth }, { $set: { verified: true } });
            await Cache.haddMany(`user:${user.id}`, user as any as Record<string, unknown>, 1200);

            return resolve({
                status: true
            });
        })
    }

    async unverify(
        auth: string
    ): Promise<object> {
        await this.ensureConnected();
        return new Promise(async (resolve, reject) => {
            const user = await this.getUserByAuth(auth);

            if (!user){
                return resolve({
                    status: false,
                    message: "invalid auth token"
                });
            }

            user.verified = false;

            await UserHandler.collection("users").updateOne({ auth }, { $set: { verified: false } });
            await Cache.haddMany(`user:${user.id}`, user as any as Record<string, unknown>, 1200);

            return resolve({
                status: true
            });
        })
    }
}
