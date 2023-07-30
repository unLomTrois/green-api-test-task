// Gateway-сервис на Express

import express from "express";

import amqp from "amqplib";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";

const app = express();

const SERVER_PORT = 3000;
const RABBIT_MQ_URL = "amqp://localhost";

app.use(bodyParser.json());

/**
 * @type {amqp.Channel}
 */
let channel;

// Функция для отправки задания в очередь RabbitMQ
async function sendToTaskQueue(data) {
    try {
        const queueName = "tasks";
        await channel.assertQueue(queueName, { durable: true });
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));

        console.log(`Отправка данных в очередь ${queueName}:`, data);
    } catch (error) {
        console.error("Ошибка отправки в очередь:", error.message);
    }
}

// схема json-а: { "calc": "2+2" }
app.post("/calc", async (req, res) => {
    try {
        const requestData = req.body;

        // Генерируем уникальный id для запроса
        const requestId = uuidv4();

        // Отправка данных в очередь RabbitMQ с уникальным id запроса
        await sendToTaskQueue({ id: requestId, data: requestData });

        // Ожидание ответа из очереди "responses"
        const responseData = await waitFromReponseQueue(requestId);

        res.status(200).json(responseData.data);
    } catch (error) {
        console.error("Ошибка обработки запроса:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

async function waitFromReponseQueue(requestId) {
    return await new Promise(async (resolve) => {
        const consumerTag = `${requestId}-consumer`;
        await channel.consume(
            "responses",
            (message) => {
                const data = JSON.parse(message.content.toString());

                if (data.id === requestId) {
                    // Отправляем подтверждение об успешной обработке ответа
                    channel.ack(message);

                    // Отменяем подписку на очередь "responses"
                    channel.cancel(consumerTag);

                    // Возвращаем данные ответа
                    resolve(data);
                }
            },
            { noAck: false, consumerTag: consumerTag }
        );
    });
}

// Инициализация подключения к RabbitMQ перед запуском сервера
async function initRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBIT_MQ_URL);
        channel = await connection.createChannel();
        console.log("Подключение к RabbitMQ");
    } catch (error) {
        console.error("Ошибка подключения к RabbitMQ:", error.message);
        process.exit(1); // Завершить процесс сервера в случае ошибки
    }
}

// Запуск микросервиса после установки подключения с RabbitMQ
initRabbitMQ().then(() => {
    app.listen(SERVER_PORT, () => {
        console.log(`Сервер запущен на http://localhost:${SERVER_PORT}`);
    });
});
