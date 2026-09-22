import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL;

if (!RABBITMQ_URL) {
  throw new Error("RABBITMQ_URL is not set — check apps/order-worker/.env");
}

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL!);
  const channel = await connection.createChannel();
  console.log("Channel Opened Succesfully");
}

void main();
