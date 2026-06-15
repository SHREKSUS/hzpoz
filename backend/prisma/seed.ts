// Сидинг БД синтетическими (обезличенными) данными:
//   - врачи-офтальмологи
//   - расписание на ближайшие дни
//   - тестовые пользователи (пациент + регистратор) из переменных окружения
//
// Запуск: npm run seed

import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { env } from '../src/config/env';

// Врачи (обезличенные синтетические данные).
const DOCTORS = [
  { fullName: 'Иванова Анна Петровна', specialty: 'Офтальмолог' },
  { fullName: 'Смирнов Дмитрий Сергеевич', specialty: 'Офтальмолог-хирург' },
  { fullName: 'Кузнецова Ольга Викторовна', specialty: 'Детский офтальмолог' },
];

// Рабочие интервалы дня.
const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

// Сколько дней вперёд формировать расписание.
const DAYS_AHEAD = 14;

function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log('Очистка прежних данных...');
  await prisma.appointment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  console.log('Создание врачей...');
  const doctors = [];
  for (const d of DOCTORS) {
    doctors.push(await prisma.doctor.create({ data: d }));
  }

  console.log('Создание расписания...');
  const today = new Date();
  const scheduleData: { doctorId: string; date: string; timeSlot: string }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    // Пропускаем выходные.
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue;

    const date = dateToISO(day);
    for (const doctor of doctors) {
      for (const timeSlot of TIME_SLOTS) {
        scheduleData.push({ doctorId: doctor.id, date, timeSlot });
      }
    }
  }
  await prisma.schedule.createMany({ data: scheduleData });

  console.log('Создание тестовых пользователей...');
  await prisma.user.create({
    data: {
      email: env.SEED_PATIENT_EMAIL,
      passwordHash: await bcrypt.hash(env.SEED_PATIENT_PASSWORD, 10),
      fullName: 'Тестовый Пациент',
      role: 'patient',
    },
  });
  await prisma.user.create({
    data: {
      email: env.SEED_REGISTRAR_EMAIL,
      passwordHash: await bcrypt.hash(env.SEED_REGISTRAR_PASSWORD, 10),
      fullName: 'Регистратор Регистратурова',
      role: 'registrar',
    },
  });

  // Несколько дополнительных синтетических пациентов.
  for (let i = 1; i <= 3; i++) {
    await prisma.user.create({
      data: {
        email: `patient${i}@test.local`,
        passwordHash: await bcrypt.hash('Patient123!', 10),
        fullName: `Пациент №${i}`,
        role: 'patient',
      },
    });
  }

  const totalSlots = await prisma.schedule.count();
  console.log('Готово:');
  console.log(`  врачей: ${doctors.length}`);
  console.log(`  слотов расписания: ${totalSlots}`);
  console.log(`  пациент: ${env.SEED_PATIENT_EMAIL} / ${env.SEED_PATIENT_PASSWORD}`);
  console.log(`  регистратор: ${env.SEED_REGISTRAR_EMAIL} / ${env.SEED_REGISTRAR_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
