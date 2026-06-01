import { launchBrowser } from '../services/browser';
import { sendText, sendPhoto } from '../services/telegram';

export async function runStatus() {
    const { browser, page } = await launchBrowser(false);
    try {
        console.log('Перехожу на checkip.amazonaws.com...');
        await page.goto('https://checkip.amazonaws.com/', { timeout: 60000 });
        await page.waitForSelector('body', { timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const ip = await page.evaluate(() => document.body.innerText.trim());
        console.log('Публичный IP:', ip);

        await sendText(`Ваш публичный IP: ${ip}`);
        await sendPhoto(page, `Ваш публичный IP: ${ip}`);

    } catch (err) {
        console.error('Ошибка в runStatus:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
