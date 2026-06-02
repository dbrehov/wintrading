import { launchBrowser } from '../services/browser';
import { sendPhoto } from '../services/telegram';

export async function runWork(headless: boolean = true) {
    const { browser, page } = await launchBrowser(headless);
    try {
        const targetUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/auth';
        console.log(`Перехожу на страницу авторизации: ${targetUrl}...`);
        await page.goto(targetUrl, { timeout: 60000 });
        
        console.log('Ожидаю появления полей ввода...');
        await page.waitForSelector('input[formcontrolname="username"]', { timeout: 60000 });

        console.log('Ввожу логин и пароль...');
        await page.fill('input[formcontrolname="username"]', 'brehov@gmail.com');
        await page.fill('input[formcontrolname="password"]', 'winlv-tradehive-ui');
        
        console.log('Нажимаю Enter...');
        await page.keyboard.press('Enter');

        // Ожидаем загрузки после входа
        await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Переходим на страницу Watchlist
        const watchlistUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/watchlist-builder/';
        console.log(`Перехожу на страницу Watchlist Builder: ${watchlistUrl}...`);
        await page.goto(watchlistUrl, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Извлекаю весь текст со страницы...');
        const pageText = await page.evaluate(() => document.body.innerText);
        
        const marker = 'Настройки';
        const markerIndex = pageText.indexOf(marker);
        
        if (markerIndex !== -1) {
            const contentAfterMarker = pageText.substring(markerIndex + marker.length).trim();
            console.log('Маркер найден, отправляю текст после него...');
            await sendText(`📊 Данные Watchlist (после "Настройки"):\\n${contentAfterMarker}`);
        } else {
            console.log('Маркер "Настройки" не найден, отправляю весь текст...');
            await sendText(`📊 Текст страницы (маркер не найден):\\n${pageText}`);
        }

        console.log('Делаю финальный скриншот...');
        await sendPhoto(page, 'WinTrading: Скриншот Watchlist Builder');

    } catch (err) {
        console.error('Ошибка в runWork:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
