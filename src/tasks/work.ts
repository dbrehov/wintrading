import { launchBrowser } from '../services/browser';
import { sendPhoto, sendText } from '../services/telegram';

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
        
        console.log('Извлекаю текст страницы и применяю фильтрацию по маркерам...');
        const pageText = await page.evaluate(() => document.body.innerText);
        
        const lines = pageText
            .split('\\n')
            .map(l => l.trim())
            .filter(Boolean);

        const startIndex = lines.findIndex(line => line === 'Ордер №');
        const endIndex = lines.findIndex(line => line === 'О Bitget');

        if (startIndex !== -1) {
            const sliceStart = startIndex + 1;
            const sliceEnd = endIndex > sliceStart ? endIndex : lines.length;
            const orderLines = lines.slice(sliceStart, sliceEnd).join('\\n');
            
            console.log(`Маркеры найдены, извлечено строк: ${lines.slice(sliceStart, sliceEnd).length}`);
            await sendText(`📊 Данные по ордерам:\\n${orderLines}`);
        } else {
            console.log('Маркер "Ордер №" не найден, отправляю весь текст страницы...');
            await sendText(`📊 Маркер "Ордер №" не найден. Полный текст страницы:\\n${pageText}`);
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
