import { launchBrowser } from '../services/browser';
import { sendText, sendPhoto } from '../services/telegram';
import fs from 'fs';

export async function runColab(headless: boolean = true) {
    const { browser, page } = await launchBrowser(headless);
    try {
        const cookiesPath = 'cookies.json';
        if (!fs.existsSync(cookiesPath)) {
            throw new Error(`Файл куки ${cookiesPath} не найден! Сначала запустите auth.`);
        }
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
        await page.context().addCookies(cookies);
        console.log('Куки успешно загружены.');

        console.log('Перехожу на Google Drive...');
        await page.goto('https://drive.google.com/drive/u/0/home', { timeout: 60000 });
        await page.waitForSelector('body', { timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Ищу файл colab.ipynb...');
        const fileLocator = page.locator('text=colab.ipynb');
        
        if (await fileLocator.count() > 0) {
            console.log('Файл найден, выполняю двойной клик для открытия...');
            const promise = page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
            await fileLocator.first().dblclick();
            const newPage = await promise;
            let targetPage = newPage ? newPage : page;
            if (newPage) await targetPage.waitForLoadState('networkidle');

            console.log('Ожидание 5 секунд перед запуском кода...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
                console.log('Активирую окно ноутбука (клик по центру)...');
                await targetPage.mouse.click(600, 400); // Клик в область документа
                await new Promise(resolve => setTimeout(resolve, 5000));

                console.log('Попытка запустить все ячейки через горячие клавиши...');
                
                // Пробуем оба варианта (Ctrl и Cmd) для надежности
                await targetPage.keyboard.press('Control+F9');
                await new Promise(resolve => setTimeout(resolve, 500));
                await targetPage.keyboard.press('Meta+F9'); 
                
                console.log('Команды запуска отправлены.');
                
                // Ждем 10 секунд, чтобы код в ноутбуке успел поработать перед скриншотом
                await new Promise(resolve => setTimeout(resolve, 10000));
                await sendPhoto(targetPage, 'Результат попытки запуска через горячие клавиши');
            } catch (menuErr) {
                console.error('Ошибка при нажатии горячих клавиш:', menuErr);
            }
        } else {
            console.error('Файл colab.ipynb не найден.');
            await sendPhoto(page, 'Ошибка: файл не найден');
        }
    } catch (err) {
        console.error('Ошибка в runColab:', err);
    } finally {
        await browser.close();
        console.log('Браузер закрыт.');
    }
}
