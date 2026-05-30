import mongoose from 'mongoose'

let isConnected = false

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return
  await mongoose.connect(process.env.MONGODB_URO!)
  isConnected = true
}