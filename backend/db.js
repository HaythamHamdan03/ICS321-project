// backend/db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: 'soccer',
  password: 'Yaryar2003',
  port: "5432",
});

export default pool;
