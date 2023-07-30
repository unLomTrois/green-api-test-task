// Математический consumer-сервис

import amqp from "amqplib";

import { evaluate } from "mathjs";

const RABBIT_MQ_URL = "amqp://localhost";

// Функция для отправки результатов обработки в очередь "responses"

/**
 * @param {amqp.Channel} channel
 * @param {*} data
 */
async function sendResponseToQueue(channel, data) {
    try {
        const queueName = "responses";
        await channel.assertQueue(queueName, { durable: true });

        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
            persistent: true,
        });

        console.log(`Отправка данных в очередь ${queueName}:`, data);
    } catch (error) {
        console.error("Ошибка отправки в очередь:", error.message);
    }
}

// Функция для обработки входных данных и отправки результатов в очередь "responses"

/**
 * @param {amqp.Channel} channel
 * @param {Buffer} content
 */
async function processTask(channel, content) {
    try {
        const { id, data } = JSON.parse(content.toString());

        console.log("Полученное задание:", { id, data });

        // Вычисление значения выражения
        const result = evaluate(data.calc);
        const responseData = { id, data: result };

        // Отправка результата обработки в очередь "responses"
        await sendResponseToQueue(channel, responseData);
    } catch (error) {
        console.error("Ошибка обработки задания:", error.message);
    }
}

/**
 * Функция для подписки на очередь RabbitMQ и обработки заданий
 * @param {amqp.Channel} channel
 */
async function runMicroservice(channel) {
    try {
        const queueName = "tasks";
        await channel.assertQueue(queueName);
        channel.prefetch(1);

        console.log("Ожидание задач...");

        // ждём задачи
        channel.consume(
            queueName,
            async (message) => {
                await processTask(channel, message.content);

                // Подтверждение успешной обработки задания
                channel.ack(message);
            },
            { noAck: false }
        );
    } catch (error) {
        console.error("Ошибка обработки микросервиса:", error.message);
        process.exit(1); // Завершить процесс M2 в случае ошибки
    }
}

/**
 * Инициализация подключения к RabbitMQ перед запуском сервера
 * @returns {Promise<amqp.Channel>}
 */
async function initRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBIT_MQ_URL);
        const channel = await connection.createChannel();
        console.log("Подключение к RabbitMQ");
        return channel;
    } catch (error) {
        console.error("Ошибка подключения к RabbitMQ:", error.message);
        process.exit(1);
    }
}

// Запуск микросервиса после установки подключения с RabbitMQ
initRabbitMQ().then((channel) => {
    runMicroservice(channel);
});
