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
            console.log(`Данные извлечены, формирую подробный файл с категориями...`);
            
            const categoryMap = {
                'Объем': ['V1m', 'V5m', 'V15M', 'V30M', 'V1h', 'V2h', 'V6h', 'V12h', 'V24h'],
                'Изменение цены': ['CH5M', 'CH15M', 'CH30M', 'CH1h', 'CH2h', 'CH6h', 'CH12h', 'CH24h'],
                'Волатильность': ['N1/30', 'N5/14', 'VOL5m', 'VOL15M', 'VOL30M', 'VOL1h', 'VOL2h', 'VOL6h', 'VOL12h', 'VOL24h'],
                'Корреляция к BTC': ['COR3M', 'COR5M', 'COR15M', 'COR30M', 'COR1h', 'COR2h', 'COR6h', 'COR12h', 'COR24h'],
                'Уровни': ['HL1M', 'HL5M', 'HL15M', 'HL1H', 'HL4H', 'HL1D'],
                'Трендовые уровни': ['TL1M', 'TL5M', 'TL15M', 'TL1H', 'TL4H', 'TL1D'],
                'Сделки': ['T5m', 'T15M', 'T30M', 'T1h', 'T2h', 'T6h', 'T12h', 'T24h'],
                'Повышенные объемы': ['VIdx1m', 'VIdx5m', 'VIdx10m', 'VIdx15M', 'VIdx20M', 'VIdx30M', 'VIdx1h', 'VIdx2h', 'VIdx6h', 'VIdx12h', 'VIdx24h'],
                'Открытый интерес': ['OI1m', 'OI5m', 'OI15m', 'OI30m', 'OI1h', 'OI2h', 'OI4h', 'OI6h', 'OI12h', 'OI24h']
            };

            const finalHeaders = headers.length > 0 ? headers : ['Символ', ...Array(10).fill('Col')];
            
            // Создаем строку категорий для верхней части файла
            let categoriesRow = 'Монета'.padEnd(15, ' ') + ' ';
            
            const headerCategories = finalHeaders.map((h, i) => {
                if (i === 0) return 'Монета';
                for (const [cat, cols] of Object.entries(categoryMap)) {
                    if (cols.includes(h)) return cat;
                }
                return 'Прочее';
            });

            // Формируем строку категорий (повторяем категорию для каждого столбца)
            categoriesRow += headerCategories.slice(1).map(cat => cat.padEnd(10, ' ')).join(' ');

            // Собираем содержимое файла
            let fileContent = 'КАТЕГОРИИ:\\n' + categoriesRow + '\\n';
            fileContent += 'ЗАГОЛОВКИ:\\n' + finalHeaders.join('\\t') + '\\n';
            fileContent += 'ДАННЫЕ:\\n';
            
            rows.forEach(row => {
                fileContent += [row.symbol, ...row.columns].join('\\t') + '\\n';
            });
            
            const dataFilePath = path.join(process.cwd(), 'watchlist_data.txt');
            fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
            
            await sendDocument(dataFilePath, '📊 Подробный список Watchlist (с категориями)');
            await sendText(`✅ Данные успешно собраны с детализацией. Всего монет: ${rows.length}`);
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
