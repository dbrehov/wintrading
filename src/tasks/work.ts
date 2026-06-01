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
        await sendPhoto(page, `WinTrading: Авторизован`);

        console.log('Ожидаю появления всплывающего окна с кнопкой "OK"...');
        await page.waitForSelector('button.confirm-btn:has-text("OK")', { state: 'visible', timeout: 15000 });
        console.log('Кликаю по кнопке "OK" (подтверждение)...');
        await page.click('button.confirm-btn:has-text("OK")');
        
        console.log('Кликаю по ссылке "Монеты" для перехода в Watchlist Builder...');
        await page.click('a[href="#/app/watchlist-builder"]');
        
        console.log('Ожидание 5 секунд...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Сохраняю куки в wintrading.json...');
        const cookies = await page.context().cookies();
        const cookiesPath = path.join(process.cwd(), 'wintrading.json');
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

        console.log('Отправляю файл с куками в Telegram...');
        await sendDocument(cookiesPath, 'Свежие куки WinTrading');
        await sendText('📁 Файл wintrading.json отправлен в Telegram');

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
