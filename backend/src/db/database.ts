import { mysql } from "../../deps.ts";
// import "@std/dotenv/load";

const pool = mysql.createPool({
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    host: Deno.env.get("DB_HOST"),
    port: Number(Deno.env.get("DB_PORT")),
    user: Deno.env.get("DB_USER"),
    password: Deno.env.get("DB_PASSWORD"),
    database: Deno.env.get("DB_DATABASE"),
});

try {
  const connection = await pool.getConnection();
  console.log('😈 Successfully connected to MariaDB');
  connection.release();
} catch(error) {
  console.log("😈 Connection not successfull");
  console.error(error);
  Deno.exit(1);
}

export default pool;