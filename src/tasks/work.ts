import { launchBrowser } from '../services/browser';
import { sendText, sendPhoto, sendDocument } from '../services/telegram';
import fs from 'fs';
import path from 'path';

export async function runWork(headless: boolean = true) {
    const { browser, page } = await launchBrowser(headless);
    try {
        const cookiesPath = path.join(process.cwd(), 'wintrading.json');
        if (fs.existsSync(cookiesPath)) {
            console.log('Загружаю куки из wintrading.json...');
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
            await page.context().addCookies(cookies);
            console.log('Куки загружены.');
        }

        const targetUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/auth';
        console.log(`Перехожу на ${targetUrl}...`);
        await page.goto(targetUrl, { timeout: 60000 });
        
        // Проверяем, нужно ли вводить логин (если мы видим поле username)
        const loginField = await page.$('input[formcontrolname="username"]');
        if (loginField) {
            console.log('Авторизация требуется. Ввожу логин и пароль...');
            await page.fill('input[formcontrolname="username"]', 'brehov@gmail.com');
            await page.fill('input[formcontrolname="password"]', 'winlv-tradehive-ui');
            
            console.log('Нажимаю Enter...');
            await page.keyboard.press('Enter');

            // Ожидаем загрузки после входа
            await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => console.log('Ошибка или таймаут навигации, продолжаем...'));
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            console.log('Мы уже авторизованы (куки сработали).');
        }

        const title = await page.title();
        console.log('Текущая страница:', title);

        await sendText(`✅ WinTrading доступен\nURL: ${targetUrl}\nTitle: ${title}`);
        await sendPhoto(page, `WinTrading: Статус проверки`);

        console.log('Перезагружаю страницу для чистого перехода...');
        await page.close();
        const newPage = await browser.contexts()[0].newPage();
        
        const watchlistUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/watchlist-builder';
        console.log(`Перехожу напрямую на страницу Watchlist Builder: ${watchlistUrl}...`);
        await newPage.goto(watchlistUrl, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Ожидание 5 секунд...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Сохраняю обновленные куки в wintrading.json...');
        const cookies = await newPage.context().cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

        console.log('Отправляю файл с куками в Telegram...');
        await sendDocument(cookiesPath, 'Свежие куки WinTrading');
        await sendText('📁 Обновленный файл wintrading.json отправлен в Telegram');

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
