// Бизнес-логика записей на приём.
// Ключевая инвариант: один слот (doctorId, date, timeSlot) не может быть
// занят дважды. Достигается транзакцией + уникальным индексом в Schedule.

import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import type { AppointmentDTO } from '../../../shared/types';

type AppointmentWithRelations = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  status: string;
  createdAt: Date;
  doctor?: { fullName: string } | null;
  patient?: { fullName: string } | null;
};

export function toAppointmentDTO(a: AppointmentWithRelations): AppointmentDTO {
  return {
    id: a.id,
    doctorId: a.doctorId,
    doctorName: a.doctor?.fullName ?? '',
    patientId: a.patientId,
    patientName: a.patient?.fullName ?? '',
    date: a.date,
    timeSlot: a.timeSlot,
    status: a.status as AppointmentDTO['status'],
    createdAt: a.createdAt.toISOString(),
  };
}

/** Свободные интервалы врача на дату. */
export async function getFreeSlots(doctorId: string, date: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw HttpError.notFound('Врач не найден', 'DOCTOR_NOT_FOUND');

  const slots = await prisma.schedule.findMany({
    where: { doctorId, date, isBooked: false },
    orderBy: { timeSlot: 'asc' },
    select: { date: true, timeSlot: true },
  });
  return slots;
}

/**
 * Создаёт запись и атомарно занимает слот.
 * Если слот отсутствует или уже занят — ошибка 409.
 */
export async function createAppointment(
  patientId: string,
  doctorId: string,
  date: string,
  timeSlot: string
): Promise<AppointmentDTO> {
  return prisma.$transaction(async (tx) => {
    const doctor = await tx.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw HttpError.notFound('Врач не найден', 'DOCTOR_NOT_FOUND');

    const slot = await tx.schedule.findUnique({
      where: { doctorId_date_timeSlot: { doctorId, date, timeSlot } },
    });

    if (!slot) {
      throw HttpError.badRequest(
        'Такого интервала нет в расписании врача',
        'SLOT_NOT_FOUND'
      );
    }
    if (slot.isBooked) {
      throw HttpError.conflict('Это время уже занято', 'SLOT_TAKEN');
    }

    // Занимаем слот (updateMany с условием isBooked=false защищает от гонки).
    const booked = await tx.schedule.updateMany({
      where: { id: slot.id, isBooked: false },
      data: { isBooked: true },
    });
    if (booked.count === 0) {
      throw HttpError.conflict('Это время уже занято', 'SLOT_TAKEN');
    }

    const appointment = await tx.appointment.create({
      data: { patientId, doctorId, date, timeSlot, status: 'active' },
      include: { doctor: true, patient: true },
    });

    return toAppointmentDTO(appointment);
  });
}

/** Записи конкретного пациента. */
export async function listPatientAppointments(patientId: string) {
  const items = await prisma.appointment.findMany({
    where: { patientId },
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    include: { doctor: true },
  });
  return items.map(toAppointmentDTO);
}

/** Отмена записи: проверяем владельца (или админа), освобождаем слот. */
export async function cancelAppointment(
  appointmentId: string,
  requesterId: string,
  isAdmin: boolean
): Promise<AppointmentDTO> {
  return prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) throw HttpError.notFound('Запись не найдена', 'APPOINTMENT_NOT_FOUND');

    if (!isAdmin && appt.patientId !== requesterId) {
      throw HttpError.forbidden('Это не ваша запись');
    }
    if (appt.status === 'cancelled') {
      throw HttpError.badRequest('Запись уже отменена', 'ALREADY_CANCELLED');
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'cancelled' },
    });

    // Освобождаем слот в расписании.
    await tx.schedule.updateMany({
      where: { doctorId: appt.doctorId, date: appt.date, timeSlot: appt.timeSlot },
      data: { isBooked: false },
    });

    const updated = await tx.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });
    return toAppointmentDTO(updated);
  });
}

/**
 * Перенос записи на новый слот (новый врач/дата/время).
 * Старый слот освобождается, новый занимается — всё в одной транзакции.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  requesterId: string,
  isAdmin: boolean,
  newDate: string,
  newTimeSlot: string,
  newDoctorIdInput?: string
): Promise<AppointmentDTO> {
  return prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) throw HttpError.notFound('Запись не найдена', 'APPOINTMENT_NOT_FOUND');
    if (!isAdmin && appt.patientId !== requesterId) {
      throw HttpError.forbidden('Это не ваша запись');
    }
    if (appt.status === 'cancelled') {
      throw HttpError.badRequest('Нельзя перенести отменённую запись', 'ALREADY_CANCELLED');
    }

    // Если врач не указан — переносим у того же врача.
    const newDoctorId = newDoctorIdInput ?? appt.doctorId;

    const newSlot = await tx.schedule.findUnique({
      where: {
        doctorId_date_timeSlot: {
          doctorId: newDoctorId,
          date: newDate,
          timeSlot: newTimeSlot,
        },
      },
    });
    if (!newSlot) {
      throw HttpError.badRequest(
        'Такого интервала нет в расписании врача',
        'SLOT_NOT_FOUND'
      );
    }

    const isSameSlot =
      newDoctorId === appt.doctorId &&
      newDate === appt.date &&
      newTimeSlot === appt.timeSlot;

    if (!isSameSlot) {
      if (newSlot.isBooked) {
        throw HttpError.conflict('Это время уже занято', 'SLOT_TAKEN');
      }
      const booked = await tx.schedule.updateMany({
        where: { id: newSlot.id, isBooked: false },
        data: { isBooked: true },
      });
      if (booked.count === 0) {
        throw HttpError.conflict('Это время уже занято', 'SLOT_TAKEN');
      }
      // Освобождаем старый слот.
      await tx.schedule.updateMany({
        where: {
          doctorId: appt.doctorId,
          date: appt.date,
          timeSlot: appt.timeSlot,
        },
        data: { isBooked: false },
      });
    }

    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: { doctorId: newDoctorId, date: newDate, timeSlot: newTimeSlot },
      include: { doctor: true, patient: true },
    });
    return toAppointmentDTO(updated);
  });
}
