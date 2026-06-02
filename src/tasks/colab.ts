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
        
        console.log('Ожидание 10 секунд для полной загрузки интерфейса Drive...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        console.log('Ищу файл colab.ipynb...');
        const fileLocator = page.locator('text=colab.ipynb');
        
        if (await fileLocator.count() > 0) {
            console.log('Файл найден, выполняю двойной клик для открытия...');
            const promise = page.context().waitForEvent('page', { timeout: 30000 }).catch(() => null);
            await fileLocator.first().dblclick();
            const newPage = await promise;
            let targetPage = newPage ? newPage : page;
            
            if (newPage) {
                console.log('Новая страница открыта, ожидаю полной загрузки ноутбука...');
                await targetPage.waitForLoadState('networkidle');
                await new Promise(resolve => setTimeout(resolve, 15000)); // Даем время на подключение среды выполнения (Runtime)
            }

            console.log('Ожидание 5 секунд перед активацией окна...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
                console.log('Активирую окно ноутбука (клик по центру)...');
                await targetPage.mouse.click(600, 400); 
                await new Promise(resolve => setTimeout(resolve, 5000));

                console.log('Попытка запустить все ячейки через горячие клавиши...');
                
                // Повторяем нажатие несколько раз для надежности в headless режиме
                for (let i = 0; i < 2; i++) {
                    await targetPage.keyboard.press('Control+F9');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await targetPage.keyboard.press('Meta+F9'); 
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                console.log('Команды запуска отправлены. Ожидаю выполнения кода (30 секунд)...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                await sendPhoto(targetPage, 'Результат запуска всех ячеек в Colab');
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
