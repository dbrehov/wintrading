import { launchBrowser } from '../services/browser';
import { sendText, sendPhoto } from '../services/telegram';

export async function runWork(headless: boolean = true) {
    const { browser, page } = await launchBrowser(headless);
    try {
        const targetUrl = 'https://wintrading.live/#/app/watchlist-builder';
        console.log(`Перехожу на ${targetUrl}...`);
        await page.goto(targetUrl, { timeout: 60000 });
        await page.waitForSelector('body', { timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const title = await page.title();
        console.log('Сайт доступен. Заголовок:', title);

        await sendText(`✅ Сайт WinTrading доступен\nURL: ${targetUrl}\nTitle: ${title}`);
        await sendPhoto(page, `Статус WinTrading: Доступен`);

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
