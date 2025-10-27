'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Weekday, TimePeriod } from '@/lib/types';
import { MessageEditModal } from './MessageEditModal';
import { Edit } from 'lucide-react';

interface TimeBasedMessageTableProps {
  messageType: 'welcome' | 'instruction';
}

const weekdayLabels: Record<Weekday, string> = {
  monday: 'Mandag',
  tuesday: 'Tirsdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
};

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export function TimeBasedMessageTable({ messageType }: TimeBasedMessageTableProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    weekday?: Weekday;
    periodId?: number;
    periodName?: string;
    isDefault?: boolean;
  }>({
    isOpen: false,
  });

  // Load time periods
  const timePeriods = useLiveQuery(
    () => db.timePeriods.orderBy('order').toArray(),
    []
  );

  // Load all messages for this type
  const messages = useLiveQuery(
    () => db.timeBasedMessages.where('messageType').equals(messageType).toArray(),
    [messageType]
  );

  // Load default message
  const defaultMessage = useLiveQuery(
    () => db.defaultMessages.where('messageType').equals(messageType).first(),
    [messageType]
  );

  const getMessageCount = (weekday: Weekday, periodId: number): number => {
    if (!messages) return 0;
    const message = messages.find(
      (m) => m.weekday === weekday && m.timePeriodId === periodId
    );
    if (!message || !message.messages) return 0;
    return message.messages.split('\n').filter((line) => line.trim().length > 0).length;
  };

  const getMessages = (weekday: Weekday, periodId: number): string => {
    if (!messages) return '';
    const message = messages.find(
      (m) => m.weekday === weekday && m.timePeriodId === periodId
    );
    return message?.messages || '';
  };

  const handleOpenModal = (weekday: Weekday, period: TimePeriod) => {
    setModalState({
      isOpen: true,
      weekday,
      periodId: period.id,
      periodName: period.name,
      isDefault: false,
    });
  };

  const handleOpenDefaultModal = () => {
    setModalState({
      isOpen: true,
      isDefault: true,
    });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false });
  };

  const handleSaveMessages = async (messagesText: string) => {
    if (modalState.isDefault) {
      // Save default message
      const existing = await db.defaultMessages
        .where('messageType')
        .equals(messageType)
        .first();

      if (existing) {
        await db.defaultMessages.update(existing.id!, {
          messages: messagesText,
          updatedAt: new Date(),
        });
      } else {
        await db.defaultMessages.add({
          messageType,
          messages: messagesText,
          createdAt: new Date(),
        });
      }
    } else if (modalState.weekday && modalState.periodId) {
      // Save time-based message
      const existing = await db.timeBasedMessages
        .where('[weekday+timePeriodId+messageType]')
        .equals([modalState.weekday, modalState.periodId, messageType])
        .first();

      if (existing) {
        await db.timeBasedMessages.update(existing.id!, {
          messages: messagesText,
          updatedAt: new Date(),
        });
      } else {
        await db.timeBasedMessages.add({
          weekday: modalState.weekday,
          timePeriodId: modalState.periodId,
          messageType,
          messages: messagesText,
          createdAt: new Date(),
        });
      }
    }
  };

  if (!timePeriods || !messages) {
    return <div>Laster...</div>;
  }

  if (timePeriods.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-800">
          Du må først definere tidsperioder før du kan legge til meldinger.
        </p>
      </div>
    );
  }

  const title = messageType === 'welcome' ? 'Velkomstmeldinger' : 'Instruksjoner';
  const defaultMessageText = defaultMessage?.messages || '';

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">
                  Ukedag
                </th>
                {timePeriods.map((period) => (
                  <th
                    key={period.id}
                    className="border border-gray-300 px-4 py-2 text-center font-medium"
                  >
                    <div>{period.name}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {period.startTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekdays.map((weekday) => (
                <tr key={weekday} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">
                    {weekdayLabels[weekday]}
                  </td>
                  {timePeriods.map((period) => {
                    const count = getMessageCount(weekday, period.id!);
                    return (
                      <td
                        key={`${weekday}-${period.id}`}
                        className="border border-gray-300 px-4 py-3 text-center"
                      >
                        <button
                          onClick={() => handleOpenModal(weekday, period)}
                          className="w-full px-3 py-2 text-sm rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {count > 0 ? (
                            <>
                              <Edit size={16} />
                              <span>{count} melding{count !== 1 ? 'er' : ''}</span>
                            </>
                          ) : (
                            <span className="text-gray-500">+ Legg til</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-700">Standard melding (fallback)</h3>
              <p className="text-sm text-gray-500">
                Brukes når en slot er tom
              </p>
            </div>
            <button
              onClick={handleOpenDefaultModal}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2"
            >
              <Edit size={18} />
              Rediger
            </button>
          </div>
        </div>
      </div>

      <MessageEditModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSave={handleSaveMessages}
        title={
          modalState.isDefault
            ? `Standard ${title.toLowerCase()} (fallback)`
            : `${weekdayLabels[modalState.weekday!]} - ${modalState.periodName} - ${title}`
        }
        initialMessages={
          modalState.isDefault
            ? defaultMessageText
            : modalState.weekday && modalState.periodId
            ? getMessages(modalState.weekday, modalState.periodId)
            : ''
        }
      />
    </div>
  );
}
