import * as dotenv from 'dotenv'
dotenv.config()
import { verifySecret } from './lib/password'

async function run() {
  const hash = 'pbkdf2-sha256-v1$310000$L6J8w7hS5X3AfjynF57B5w$pe6tzkFmHUGMvhuDwz4a14MMnhxh5sAvIzIpu40SZWM'
  const isValid = await verifySecret('CO01B', hash)
  console.log("Is password valid?", isValid)
}

run().catch(console.error)
