import { runColab } from './tasks/colab';
import { runAuth } from './tasks/auth';
import { runWork } from './tasks/work';

(async () => {
  const arg = process.argv[2];
  const subArg = process.argv[3];
  const isHeadless = subArg === 'less';

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
  }
})();
