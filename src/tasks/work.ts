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
        
        console.log('Извлекаю структурированные данные из Watchlist...');
        const watchlistData = await page.evaluate(() => {
            const container = document.querySelector('.scroll-content');
            if (!container) return 'Контейнер списка (.scroll-content) не найден';
            
            const rows = Array.from(container.querySelectorAll('li[role="option"]'));
            if (rows.length === 0) {
                return 'Данные в списке не найдены';
            }

            return rows.map(row => {
                const symbol = row.querySelector('.symbol')?.textContent?.trim() || '???';
                const columns = Array.from(row.querySelectorAll('.data-column'))
                                    .map(col => col.textContent?.trim())
                                    .filter(text => text)
                                    .join(' | ');
                return `${symbol}: ${columns}`;
            }).join('\\n');
        });
        
        if (watchlistData && watchlistData.length > 0) {
            console.log(`Данные извлечены, отправляю в Telegram...`);
            await sendText(`📊 Список Watchlist:\\n${watchlistData}`);
        } else {
            await sendText('❌ Не удалось извлечь данные из списка монет');
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
