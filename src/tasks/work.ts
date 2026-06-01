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

        const title = await page.title();
        console.log('Авторизация выполнена. Заголовок страницы:', title);

        await sendText(`✅ Авторизация в WinTrading прошла успешно\nURL: ${targetUrl}\nTitle: ${title}`);

        const watchlistUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/watchlist-builder';
        console.log(`Перехожу на страницу Watchlist Builder: ${watchlistUrl}...`);
        await page.goto(watchlistUrl, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Ожидание 5 секунд...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Извлекаю данные из списка Watchlist...');
        const watchlistData = await page.evaluate(() => {
            const list = document.querySelector('ul[aria-label="app.WatchlistBuilder"]');
            if (!list) return 'Список не найден';
            
            const rows = Array.from(list.querySelectorAll('li[role="option"]'));
            return rows.map(row => {
                const symbol = row.querySelector('.symbol')?.textContent?.trim() || '???';
                const columns = Array.from(row.querySelectorAll('.data-column'))
                                    .map(col => col.textContent?.trim())
                                    .join(' | ');
                return `${symbol}: ${columns}`;
            }).join('\\n');
        });

        await sendText(`📊 Список Watchlist:\\n${watchlistData}`);

        const cookiesPath = path.join(process.cwd(), 'wintrading.json');
        console.log('Сохраняю обновленные куки в wintrading.json...');
        const cookies = await page.context().cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

        console.log('Отправляю файл с куками в Telegram...');
        await sendDocument(cookiesPath, 'Свежие куки WinTrading');
        await sendText('📁 Файл wintrading.json отправлен в Telegram');

        await sendPhoto(page, 'WinTrading: Watchlist Builder загружен и куки сохранены');

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
