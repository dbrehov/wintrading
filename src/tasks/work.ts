import { launchBrowser } from '../services/browser';
import { sendPhoto, sendText, sendDocument } from '../services/telegram';
import fs from 'fs';
import path from 'path';

export async function runWork(headless: boolean = true) {
    const { browser, page } = await launchBrowser(headless);
    try {
        // 1. Попытка загрузки куки для ускорения входа
        const cookiesPath = path.join(process.cwd(), 'wintrading.json');
        if (fs.existsSync(cookiesPath)) {
            console.log('Загружаю куки из wintrading.json...');
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
            await page.context().addCookies(cookies);
            console.log('Куки успешно загружены.');
        }

        const watchlistUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/watchlist-builder/';
        
        // Пробуем сразу перейти на страницу Watchlist, чтобы проверить, работают ли куки
        console.log(`Пробую перейти на ${watchlistUrl}...`);
        await page.goto(watchlistUrl, { waitUntil: 'networkidle', timeout: 60000 });

        // Проверяем, не перекинуло ли нас на страницу авторизации
        const currentUrl = page.url();
        if (currentUrl.includes('/app/auth') || await page.locator('input[formcontrolname="username"]').isVisible()) {
            console.log('Куки не сработали или истекли. Выполняю авторизацию...');
            
            const targetUrl = 'https://winlv-tradehive-ui-df56.twc1.net/#/app/auth';
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

            // После логина возвращаемся на Watchlist
            console.log(`Перехожу на страницу Watchlist Builder: ${watchlistUrl}...`);
            await page.goto(watchlistUrl, { waitUntil: 'networkidle', timeout: 60000 });
        } else {
            console.log('Авторизация через куки прошла успешно!');
        }
        
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

        console.log('Извлекаю структурированные данные и заголовки из Watchlist...');
        const { headers, rows } = await page.evaluate(() => {
            const container = document.querySelector('.scroll-content');
            if (!container) return { headers: [], rows: [] };
            
            // 1. Извлекаем динамические заголовки
            const headerRow = container.querySelector('.navigation-headers');
            const extractedHeaders = [];
            if (headerRow) {
                const symbolHeader = headerRow.querySelector('.name-header')?.textContent?.trim() || 'Монета';
                extractedHeaders.push(symbolHeader);
                const dataHeaders = Array.from(headerRow.querySelectorAll('.data-column'))
                                        .map(col => col.textContent?.trim() || 'Column');
                extractedHeaders.push(...dataHeaders);
            }

            // 2. Извлекаем данные строк
            const rowElements = Array.from(container.querySelectorAll('li[role="option"]'));
            const extractedRows = rowElements.map(row => {
                const symbol = row.querySelector('.symbol')?.textContent?.trim() || '???';
                const columns = Array.from(row.querySelectorAll('.data-column'))
                                    .map(col => col.textContent?.trim() || '');
                return { symbol, columns };
            });

            return { headers: extractedHeaders, rows: extractedRows };
        });
        
        if (rows.length > 0) {
            console.log(`Данные извлечены, сохраняю в файл...`);
            
            const finalHeaders = headers.length > 0 ? headers : ['Символ', ...Array(10).fill('Col')];
            
            // Формируем содержимое файла в формате TSV (Tab-Separated Values)
            // Это позволит легко открыть данные в Excel или Google Sheets
            let fileContent = finalHeaders.join('\\t') + '\\n';
            
            rows.forEach(row => {
                const rowData = [row.symbol, ...row.columns].join('\\t');
                fileContent += rowData + '\\n';
            });
            
            const dataFilePath = path.join(process.cwd(), 'watchlist_data.txt');
            fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
            
            await sendDocument(dataFilePath, '📊 Актуальный список Watchlist (Данные)');
            await sendText(`✅ Данные успешно собраны и отправлены в виде файла. Всего монет: ${rows.length}`);
        } else {
            await sendText('❌ Не удалось извлечь данные из списка монет');
        }

        console.log('Делаю финальный скриншот...');
        await sendPhoto(page, 'WinTrading: Скриншот Watchlist Builder');

        // Сохраняем и отправляем обновленные куки в Telegram
        const finalCookiesPath = path.join(process.cwd(), 'wintrading.json');
        console.log('Сохраняю обновленные куки в wintrading.json...');
        const cookies = await page.context().cookies();
        fs.writeFileSync(finalCookiesPath, JSON.stringify(cookies, null, 2));

        console.log('Отправляю файл с куками в Telegram...');
        await sendDocument(finalCookiesPath, 'Свежие куки WinTrading');
        await sendText('📁 Файл wintrading.json обновлен и отправлен');

    } catch (err) {
        console.error('Ошибка в runWork:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
