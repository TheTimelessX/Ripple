import { User } from "./user";

export interface Message {
    id: number;
    from: User | null; // will omit for recording on dbs
    from_id: number;
    text: string;
}
