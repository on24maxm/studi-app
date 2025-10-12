import { compare, hash, SignJWT } from "../../deps.ts";
import type { User } from "../models/user.ts";
import pool from "../db/database.ts";

const JWT_SECRET_KEY = Deno.env.get("JWT_SECRET_KEY");
const jwtSecret = new TextEncoder().encode(JWT_SECRET_KEY);


export class UserService {
    async create(name: string, password: string): Promise<User> {
        const passwordHash = await hash(password);
        const [result] = await pool.execute(
            `INSERT INTO users (name, passwordHash) VALUES (?, ?)`, 
            [name, passwordHash]
        );
        
        const sqlResult = result as unknown as { insertId: number };

        const newUser: User = {
            id: sqlResult.insertId,
            name: name,
            createdAt: new Date(),
        };

        return newUser;
    }
    async login(name: string, password: string): Promise<string | null> {
        const [rows] = await pool.execute(`SELECT id, name, passwordHash FROM users WHERE name = ?`, [name]);

        const users = rows as unknown as { id: number, name: string, passwordHash: string}[];

        const user = users[0];

        if(!user)
            return null;

        const passwordsMatch = await compare(password, user.passwordHash);

        if(!passwordsMatch)
            return null;

        const token = await new SignJWT({ id: user.id, name: user.name})
            .setProtectedHeader({ alg: "HS256"})
            .setIssuedAt()
            .setExpirationTime("1d")
            .sign(jwtSecret)
        
        return token;
    }
}