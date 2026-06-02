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
        
        console.log('Ожидаю загрузки страницы...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const cookiesPath = path.join(process.cwd(), 'wintrading.json');
        console.log('Сохраняю обновленные куки в wintrading.json...');
        const cookies = await page.context().cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

        console.log('Отправляю файл с куками в Telegram...');
        await sendDocument(cookiesPath, 'Свежие куки WinTrading');
        await sendText('📁 Файл wintrading.json отправлен в Telegram');

        console.log('Ожидание 25 секунд перед финальным скриншотом и парсингом...');
        await new Promise(resolve => setTimeout(resolve, 25000));
        
        console.log('Извлекаю данные из списка Watchlist (.scroll-content)...');
        const watchlistData = await page.evaluate(() => {
            const container = document.querySelector('.scroll-content');
            if (!container) return 'Контейнер .scroll-content не найден';
            return container.innerText.trim() || 'Данные внутри контейнера пусты';
        });

        await sendText(`📊 Список Watchlist (полный текст):\\n${watchlistData}`);

        await sendPhoto(page, 'WinTrading: Trend Screener загружен и куки сохранены');

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
