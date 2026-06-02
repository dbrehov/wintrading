import { runColab } from './tasks/colab';
import { runAuth } from './tasks/auth';
import { runWork } from './tasks/work';
import { execSync } from 'child_process';

(async () => {
  const arg = process.argv[2];
  const subArg = process.argv[3];
  const isHeadless = subArg === 'less';

  try {
    if (arg === 'colab') {
      console.log(`Запуск режима: Colab... (${isHeadless ? 'Безголовый' : 'Видимый'})`);
      await runColab(isHeadless);
    } else if (arg === 'cookie' || arg === 'auth') {
      console.log(`Запуск режима: Авторизация... (${isHeadless ? 'Безголовый' : 'Видимый'})`);
      await runAuth(isHeadless);
    } else if (arg === 'work' || arg === 'status') {
      console.log(`Запуск режима: Проверка статуса... (${isHeadless ? 'Безголовый' : 'Видимый'})`);
      await runWork(isHeadless);
    } else {
      console.log('Доступные команды: colab, colab less, cookie/auth, work/status');
      process.exit(0);
    }

    // Попытка отправить компьютер в сон после успешного завершения задачи
    try {
      console.log('Задача завершена. Отправляю компьютер в спящий режим...');
      execSync('osascript -e "tell application \\"System Events\\" to sleep"');
    } catch (sleepErr) {
      console.error('Не удалось отправить компьютер в сон:', sleepErr.message);
    }
  } catch (globalErr) {
    console.error('Критическая ошибка при выполнении задачи:', globalErr);
  }
})();
