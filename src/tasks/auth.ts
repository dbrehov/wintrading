import { launchBrowser } from '../services/browser';
import { sendText, sendPhoto } from '../services/telegram';
import fs from 'fs';

export async function runAuth(headless: boolean = false) {
    const { browser, page } = await launchBrowser(headless);
    try {
        console.log('Перехожу на google.com...');
        await page.goto('https://google.com', { timeout: 60000 });
        console.log('Ожидание 4 минут для ручного входа в аккаунт...');
        await new Promise(resolve => setTimeout(resolve, 240000));

        const cookies = await page.context().cookies();
        const cookiesPath = 'cookies.json';
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
        
        console.log('Куки успешно сохранены в файл:', cookiesPath);
        await sendText(`Куки Google сохранены в файл ${cookiesPath}`);
        await sendPhoto(page, 'Авторизация завершена, куки сохранены');

    } catch (err) {
        console.error('Ошибка в runAuth:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
