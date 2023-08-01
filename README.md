# Green-api test-task

## Специфика

Ради разнообразия решил сделать из второго микросервиса математический микросервис на основе библиотеки [Math.js](https://mathjs.org/) 

Consumer-микросервис возвращает результаты функции math.evaluate().

Принимает запросы с телом по схеме `{ "calc": "мат. выражение" }`

На выходе получается ответ в формате `{ "id": "uuid", "data": "результат", "error"?: "текст ошибки" }`

Если в мат. выражении будут ошибки, то вернётся ответ с ошибкой

## Зависимости

1. `npm install`

## Как запускать

В разных терминалах:

1. `docker-compose up` - поднятие rabbitmq - оно в докере
2. `npm run service:gateway` - запуск producer-сервиса 
3. `npm run service:math` - запуск consumer-сервиса 

## Тестирование

Пример:

```sh
> curl -X POST -H "Content-Type: application/json" -d "{\"calc\": \"1.2 * (2 + 4.5)\"}" http://localhost:3000/calc
> 78
```

Порт можно менять, если у Вас там ещё что-то крутится
