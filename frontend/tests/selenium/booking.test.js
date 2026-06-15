/*
 * ============================================================================
 *  АВТОТЕСТ ИНТЕРФЕЙСА (Selenium WebDriver)
 *  Сценарий: пациент записывается на приём и отменяет запись
 * ============================================================================
 *
 *  ЧТО ЭТОТ ТЕСТ ДЕЛАЕТ (простыми словами):
 *  Программа сама открывает браузер Chrome, как это сделал бы живой человек,
 *  и по шагам проверяет, что сайт работает правильно:
 *     1. открывает сайт;
 *     2. входит под тестовым пациентом (логин + пароль);
 *     3. выбирает врача и дату;
 *     4. выбирает свободное время и записывается;
 *     5. убеждается, что запись появилась в "Личном кабинете";
 *     6. отменяет запись и проверяет, что статус стал "Отменена".
 *
 *  Если хоть одна проверка не прошла — тест честно об этом скажет и покажет,
 *  на каком именно шаге возникла проблема.
 *
 *  КАК ЗАПУСТИТЬ (сайт уже должен быть запущен):
 *     1) Терминал №1 (backend):   cd backend  && npm run dev
 *     2) Терминал №2 (frontend):  cd frontend && npm run dev
 *     3) Терминал №3 (тест):      cd frontend && npm run selenium:test
 *
 *  Браузер откроется сам. Чтобы он работал "невидимо" (без окна), запустите:
 *     PowerShell:  $env:HEADLESS=1; npm run selenium:test
 *     Bash:        HEADLESS=1 npm run selenium:test
 * ============================================================================
 */

import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

// ВАЖНО (исправление запуска через "npm run"):
// При запуске скриптов через npm в PATH добавляется папка node_modules/.bin,
// где может лежать устаревший драйвер chromedriver (например, версии 118),
// не совместимый с вашей версией Chrome. Из-за этого браузер не запускается.
// Убираем эту папку из PATH — тогда Selenium сам подберёт и скачает драйвер
// под установленный Chrome. Делаем это ДО запуска браузера.
{
  const sep = process.platform === 'win32' ? ';' : ':';
  process.env.PATH = (process.env.PATH || '')
    .split(sep)
    .filter((p) => {
      const low = p.toLowerCase();
      return !(low.includes('node_modules') && low.includes('.bin'));
    })
    .join(sep);
}

// --- Настройки (можно переопределить через переменные окружения) ---
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';
const PATIENT_EMAIL = process.env.SELENIUM_EMAIL || 'patient@test.local';
const PATIENT_PASSWORD = process.env.SELENIUM_PASSWORD || 'Patient123!';
const HEADLESS = process.env.HEADLESS === '1';
const WAIT = 10000; // максимум ждём появления элемента, мс

// --- Счётчики проверок ---
let passed = 0;
let failed = 0;
let currentStep = 0;

// ---------- Вспомогательные функции для красивого вывода ----------

function line() {
  console.log('────────────────────────────────────────────────────────────');
}

function banner(text) {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  ' + text);
  console.log('══════════════════════════════════════════════════════════════');
}

function step(title, explanation) {
  currentStep += 1;
  console.log('');
  console.log(`▶ ШАГ ${currentStep}: ${title}`);
  if (explanation) console.log(`   (${explanation})`);
}

function ok(message) {
  passed += 1;
  console.log(`   ✅ ОК: ${message}`);
}

function fail(message) {
  failed += 1;
  console.log(`   ❌ ОШИБКА: ${message}`);
}

function info(message) {
  console.log(`   • ${message}`);
}

// Небольшая пауза, чтобы человек успел увидеть действие на экране.
function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Найти элемент по data-testid и дождаться, пока он появится на странице.
function find(driver, testId) {
  const locator = By.css(`[data-testid="${testId}"]`);
  return driver.wait(until.elementLocated(locator), WAIT, `Не дождались элемента "${testId}"`);
}

// Надёжный клик: находим элемент, прокручиваем к нему и кликаем программно.
// Программный клик (element.click()) вызывает тот же обработчик, что и реальное
// нажатие, но устойчив к особенностям headless-браузера (например, к невидимому
// слою нативного календаря у поля <input type="date">, который иногда
// перехватывает обычный клик мышью).
async function click(driver, testId) {
  // Несколько попыток: в режиме разработки React может перерисовать страницу
  // ровно в момент клика, из-за чего ссылка на элемент "устаревает". В этом
  // случае просто находим элемент заново и повторяем.
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const el = await find(driver, testId);
      await driver.executeScript(
        'arguments[0].scrollIntoView({block:"center"}); arguments[0].click();',
        el
      );
      return;
    } catch (e) {
      const stale = e.name === 'StaleElementReferenceError' || /stale element/i.test(e.message);
      if (stale && attempt < 5) {
        await pause(250);
        continue;
      }
      throw e;
    }
  }
}

// Вычисляем ближайший будний день в формате ГГГГ-ММ-ДД.
// (Расписание не заводится на выходные, поэтому берём будни.)
function nearestWeekday() {
  const d = new Date();
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().slice(0, 10);
}

// Установить значение в поле даты так, чтобы React это "заметил".
function setDate(driver, testId, value) {
  return driver.executeScript(
    `
    const el = document.querySelector('[data-testid="' + arguments[0] + '"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, arguments[1]);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    `,
    testId,
    value
  );
}

// ---------------------------- Сам тест ----------------------------

async function run() {
  banner('АВТОТЕСТ: запись пациента на приём (через браузер)');
  console.log('Что проверяем: пациент входит в систему, выбирает врача и время,');
  console.log('записывается, видит запись в личном кабинете и отменяет её.');
  console.log('');
  info(`Адрес сайта:      ${SITE_URL}`);
  info(`Тестовый логин:   ${PATIENT_EMAIL}`);
  info(`Режим браузера:   ${HEADLESS ? 'невидимый (headless)' : 'видимый'}`);

  // Готовим браузер Chrome.
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1200,900');

  let driver;
  try {
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  } catch (e) {
    banner('НЕ УДАЛОСЬ ЗАПУСТИТЬ БРАУЗЕР');
    console.log('Скорее всего, не установлен Google Chrome.');
    console.log('Подробность для разработчика:', e.message);
    process.exit(1);
  }

  try {
    // ---------- ШАГ 1 ----------
    step('Открываю сайт', 'браузер переходит на страницу входа');
    try {
      await driver.get(SITE_URL);
      await find(driver, 'auth-form');
    } catch (e) {
      // Частая ситуация: сайт не запущен. Объясняем простыми словами.
      const refused = /ERR_CONNECTION_REFUSED|ERR_CONNECTION|ECONNREFUSED|not reachable/i.test(
        e.message
      );
      if (refused) {
        banner('САЙТ НЕ ОТКРЫВАЕТСЯ — СКОРЕЕ ВСЕГО, ОН НЕ ЗАПУЩЕН');
        console.log(`По адресу ${SITE_URL} никто не отвечает.`);
        console.log('');
        console.log('Перед запуском теста нужно запустить ДВА сервера в отдельных окнах:');
        console.log('   1) Бэкенд:   cd backend  && npm run dev     (адрес http://localhost:4000)');
        console.log('   2) Фронтенд: cd frontend && npm run dev     (адрес http://localhost:5173)');
        console.log('   3) И один раз наполнить базу:  cd backend && npm run seed');
        console.log('');
        console.log('Когда оба окна напишут, что серверы запущены — снова запустите этот тест.');
        fail('Сайт недоступен (сервер не запущен)');
        throw new Error('Сайт недоступен');
      }
      throw e;
    }
    ok('Страница входа загрузилась, форма авторизации на месте');
    await pause(500);

    // ---------- ШАГ 2 ----------
    step('Ввожу логин и пароль и нажимаю "Войти"');
    await (await find(driver, 'email-input')).sendKeys(PATIENT_EMAIL);
    await (await find(driver, 'password-input')).sendKeys(PATIENT_PASSWORD);
    info(`Введён email: ${PATIENT_EMAIL}`);
    info('Введён пароль: ********');
    await click(driver, 'submit-button');

    // После входа пациента должна открыться страница записи.
    await find(driver, 'booking-page');
    ok('Вход выполнен — открылась страница записи на приём');
    await pause(500);

    // ---------- ШАГ 3 ----------
    step('Проверяю, что в списке есть врачи');
    const doctorSelect = await find(driver, 'doctor-select');
    const doctorOptions = await doctorSelect.findElements(By.css('option'));
    if (doctorOptions.length > 0) {
      const firstDoctor = await doctorOptions[0].getText();
      ok(`Врачи загрузились (${doctorOptions.length} шт.). Выбран: "${firstDoctor}"`);
    } else {
      fail('Список врачей пуст — записаться не на кого');
    }
    await pause(300);

    // ---------- ШАГ 4 ----------
    step('Выбираю ближайший будний день', 'на выходные расписание не заводится');
    const date = nearestWeekday();
    await setDate(driver, 'date-input', date);
    info(`Выбрана дата: ${date}`);
    // Ждём, пока на странице появятся кнопки времени (а не фиксированную паузу).
    await driver.wait(
      until.elementLocated(By.css('[data-testid^="slot-"]')),
      WAIT,
      'Свободное время так и не загрузилось'
    );

    // ---------- ШАГ 5 ----------
    step('Выбираю первое свободное время');
    const slotButtons = await driver.findElements(By.css('[data-testid^="slot-"]'));
    if (slotButtons.length === 0) {
      fail('На выбранную дату нет свободного времени. Запустите "npm run seed" в backend.');
      throw new Error('Нет свободных слотов для записи');
    }
    const chosenTime = await slotButtons[0].getText();
    info(`Найдено свободных интервалов: ${slotButtons.length}`);
    info(`Нажимаю на время: ${chosenTime}`);
    // Заново находим кнопку прямо перед кликом — на случай, если React
    // перерисовал список (иначе ссылка может "устареть").
    await click(driver, `slot-${chosenTime}`);

    // Должна открыться страница подтверждения (ждём смены адреса, затем элемент).
    await driver.wait(until.urlContains('/confirm'), WAIT, 'Не перешли на страницу подтверждения');
    await find(driver, 'confirm-page');
    const confirmTime = await (await find(driver, 'confirm-time')).getText();
    ok(`Открылась страница подтверждения. Время на ней: ${confirmTime}`);
    await pause(500);

    // ---------- ШАГ 6 ----------
    step('Подтверждаю запись');
    await click(driver, 'confirm-button');

    // После подтверждения переходим в личный кабинет.
    await find(driver, 'dashboard-page');
    await find(driver, 'appointments-table');
    ok('Запись создана — открылся личный кабинет со списком записей');
    await pause(500);

    // ---------- ШАГ 7 ----------
    step('Проверяю, что новая запись видна в кабинете и активна');
    const rows = await driver.findElements(By.css('[data-testid^="appointment-row-"]'));
    info(`Записей в кабинете: ${rows.length}`);
    // Сразу запоминаем идентификатор записи (текст из data-testid кнопки отмены),
    // чтобы не держать "живую" ссылку на элемент между шагами — DOM может
    // перерисоваться, и старая ссылка станет недействительной.
    const cancelButtons = await driver.findElements(By.css('[data-testid^="cancel-button-"]'));
    let apptId = null;
    if (cancelButtons.length > 0) {
      const testIdAttr = await cancelButtons[0].getAttribute('data-testid');
      apptId = testIdAttr.replace('cancel-button-', '');
      ok('Есть активная запись с кнопкой "Отменить"');
    } else {
      fail('Не нашлась активная запись с кнопкой отмены');
    }
    await pause(500);

    // ---------- ШАГ 8 ----------
    step('Отменяю запись и проверяю, что статус стал "Отменена"');
    if (apptId) {
      info(`Отменяю запись с идентификатором: ${apptId}`);
      // Заново находим кнопку отмены прямо перед кликом (по запомненному id).
      await click(driver, `cancel-button-${apptId}`);

      // Ждём, пока в ячейке статуса появится слово "Отмен".
      // Во время обновления список ненадолго показывает "Загрузка…", поэтому
      // используем findElements (массив) и спокойно ждём, если ячейки пока нет.
      const statusLocator = By.css(`[data-testid="appointment-status-${apptId}"]`);
      await driver.wait(
        async () => {
          const els = await driver.findElements(statusLocator);
          if (els.length === 0) return false;
          const text = await els[0].getText().catch(() => '');
          return text.includes('Отмен');
        },
        WAIT,
        'Статус так и не сменился на "Отменена"'
      );
      const statusCells = await driver.findElements(statusLocator);
      const statusText = statusCells.length ? await statusCells[0].getText() : '(не найдено)';
      ok(`Запись успешно отменена. Текущий статус: "${statusText}"`);
    } else {
      fail('Отменять нечего — активной записи не было');
    }
    await pause(800);
  } catch (e) {
    fail('Тест прерван из-за непредвиденной ситуации');
    console.log('   Подробность для разработчика:', e.message);
  } finally {
    if (driver) await driver.quit();
  }

  // ----------------------- Итоговый отчёт -----------------------
  console.log('');
  line();
  banner('ИТОГ ПРОВЕРКИ');
  console.log(`   Успешных проверок:  ${passed}`);
  console.log(`   Проваленных:        ${failed}`);
  console.log('');
  if (failed === 0) {
    console.log('   ✅ ВСЁ РАБОТАЕТ. Все проверки пройдены успешно.');
  } else {
    console.log('   ❌ ЕСТЬ ПРОБЛЕМЫ. Смотрите строки с пометкой "ОШИБКА" выше.');
  }
  line();

  // Код выхода: 0 — успех, 1 — были ошибки (удобно для CI).
  process.exit(failed === 0 ? 0 : 1);
}

run();
