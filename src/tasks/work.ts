import { launchBrowser } from '../services/browser';
import { sendText, sendPhoto, sendDocument } from '../services/telegram';
import fs from 'fs';
import path from 'path';

export async function runWork(headless: boolean = true) {
    const { browser, page } = await launchBrowser(headless);
    try {
        const targetUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/auth';
        console.log(`Перехожу на ${targetUrl}...`);
        await page.goto(targetUrl, { timeout: 60000 });
        
        console.log('Ожидаю появления полей ввода...');
        await page.waitForSelector('input[formcontrolname="username"]', { timeout: 60000 });

        console.log('Ввожу логин и пароль...');
        await page.fill('input[formcontrolname="username"]', 'brehov@gmail.com');
        await page.fill('input[formcontrolname="password"]', 'winlv-tradehive-ui');
        
        console.log('Нажимаю Enter...');
        await page.keyboard.press('Enter');

        // Ожидаем загрузки после входа
        await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => console.log('Ошибка или таймаут навигации, продолжаем...'));
        await new Promise(resolve => setTimeout(resolve, 5000));

        const watchlistUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/watchlist-builder/BINANCE_FUTURES/BTCUSDT';
        console.log(`Перехожу на страницу Watchlist Builder (BTCUSDT): ${watchlistUrl}...`);
        await page.goto(watchlistUrl, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Ожидаю загрузки списка монет...');
        const containerSelector = 'body > app-root > hive-app > div > div > div > hive-watchlist-builder > as-split > as-split-area:nth-child(2) > nav > as-split';
        await page.waitForSelector(containerSelector, { timeout: 20000 }).catch(() => console.log('Предупреждение: Контейнер списка не найден'));
        
        console.log('Извлекаю данные из списка Watchlist...');
        const watchlistData = await page.evaluate((selector) => {
            const container = document.querySelector(selector);
            if (!container) return 'Контейнер списка не найден';
            
            const rows = Array.from(container.querySelectorAll('li[role="option"]'));
            if (rows.length > 0) {
                return rows.map(row => {
                    const symbol = row.querySelector('.symbol')?.textContent?.trim() || '???';
                    const columns = Array.from(row.querySelectorAll('.data-column'))
                                        .map(col => col.textContent?.trim())
                                        .filter(text => text)
                                        .join(' | ');
                    return `${symbol}: ${columns}`;
                }).join('\\n');
            }
            
            // Если структурированные строки не найдены, возвращаем просто текст контейнера
            return container.textContent?.trim() || 'Данные внутри контейнера пусты';
        }, containerSelector);

        await sendText(`📊 Список Watchlist:\\n${watchlistData}`);

        const cookiesPath = path.join(process.cwd(), 'wintrading.json');
        console.log('Сохраняю обновленные куки в wintrading.json...');
        const cookies = await page.context().cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

        console.log('Отправляю файл с куками в Telegram...');
        await sendDocument(cookiesPath, 'Свежие куки WinTrading');
        await sendText('📁 Файл wintrading.json отправлен в Telegram');

        console.log('Ожидание 25 секунд перед финальным скриншотом...');
        await new Promise(resolve => setTimeout(resolve, 25000));
        await sendPhoto(page, 'WinTrading: Trend Screener загружен и куки сохранены');

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
