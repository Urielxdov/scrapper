const { Client } = require('pg')

const client = new Client({
  connectionString: "postgresql://postgres:123456@localhost:5433/scrapping",
})

async function test() {
  try {
    await client.connect()
    console.log("✅ ¡CONEXIÓN EXITOSA DE NODE A POSTGRESQL EN DOCKER!")
    const res = await client.query('SELECT NOW()')
    console.log("Hora del servidor Docker:", res.rows[0].now)
    await client.end()
  } catch (err) {
    console.error("❌ ERROR REAL DE CONEXIÓN:", err.message)
  }
}

test()