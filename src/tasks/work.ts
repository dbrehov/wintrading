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
        
        console.log('Ожидание 5 секунд для полной загрузки данных...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Выполняю скроллинг влево-вправо для активации всех колонок...');
        await page.evaluate(async () => {
            const container = document.querySelector('.scroll-content');
            if (container) {
                // Скролл вправо
                container.scrollLeft = container.scrollWidth;
                // Небольшая пауза для рендеринга
                await new Promise(r => setTimeout(r, 1000));
                // Скролл обратно влево
                container.scrollLeft = 0;
            }
        });

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
                                    .filter(text => text);
                return { symbol, columns };
            });
        });
        
        if (Array.isArray(watchlistData) && watchlistData.length > 0) {
            console.log(`Данные извлечены, формирую таблицу...`);
            
            const headers = ['Символ', 'VOL5m', 'V24h', 'CH24h'];
            const symbolWidth = Math.max(...watchlistData.map(r => r.symbol.length), headers[0].length) + 2;
            
            let table = '```\n';
            // Header
            table += headers.map((h, i) => {
                if (i === 0) return h.padEnd(symbolWidth);
                return h.padEnd(10);
            }).join(' ') + '\n';
            
            table += '-'.repeat(symbolWidth + 30) + '\n';
            
            // Rows
            watchlistData.forEach(row => {
                const symbolPart = row.symbol.padEnd(symbolWidth);
                const colsPart = row.columns.map(c => c.padEnd(10)).join(' ');
                table += `${symbolPart} ${colsPart}\n`;
            });
            
            table += '```';
            
            await sendText(`📊 Список Watchlist:\\n${table}`);
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
