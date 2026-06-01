import { runColab } from './tasks/colab';
import { runAuth } from './tasks/auth';
import { runWork } from './tasks/work';

(async () => {
  const arg = process.argv[2];
  const subArg = process.argv[3];

  if (arg === 'colab') {
    const isHeadless = subArg === 'less';
    console.log(`Запуск режима: Colab... (${isHeadless ? 'Безголовый' : 'Видимый'})`);
    await runColab(isHeadless);
  } else if (arg === 'cookie' || arg === 'auth') {
    console.log('Запуск режима: Авторизация...');
    await runAuth();
  } else if (arg === 'work' || arg === 'status') {
    console.log('Запуск режима: Проверка статуса...');
    await runWork();
  } else {
    console.log('Доступные команды: colab, colab less, cookie/auth, work/status');
  }
})();
