'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MessageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (messages: string) => Promise<void>;
  title: string;
  initialMessages: string;
}

export function MessageEditModal({
  isOpen,
  onClose,
  onSave,
  title,
  initialMessages,
}: MessageEditModalProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(messages);
      onClose();
    } catch (error) {
      console.error('Failed to save messages:', error);
      alert('Kunne ikke lagre meldinger. Se konsollen for detaljer.');
    } finally {
      setIsSaving(false);
    }
  };

  const messageCount = messages
    .split('\n')
    .filter(line => line.trim().length > 0)
    .length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-gray-600 mb-4">
            Skriv inn meldinger, én per linje. Systemet vil velge tilfeldig melding fra listen.
          </p>

          <textarea
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Skriv meldinger her, én per linje..."
          />

          <p className="text-sm text-gray-500 mt-2">
            Antall meldinger: <strong>{messageCount}</strong>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Lagrer...' : 'Lagre endringer'}
          </button>
        </div>
      </div>
    </div>
  );
}
