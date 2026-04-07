import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { ActivityPopupItem, ShowFrequency } from '../../api/modules/activityPopup';
import { resolveUploadUrl } from '../../api/modules/upload';

const DISMISSED_PREFIX = 'activity-popup-dismissed:';
const DAILY_PREFIX = 'activity-popup-daily:';

export function isActivityPopupDismissed(item: ActivityPopupItem): boolean {
  if (item.showFrequency === 'every_time') return false;

  if (item.showFrequency === 'once') {
    return localStorage.getItem(`${DISMISSED_PREFIX}${item.id}`) === '1';
  }

  if (item.showFrequency === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(`${DAILY_PREFIX}${item.id}`) === today;
  }

  return false;
}

export function dismissActivityPopup(item: ActivityPopupItem): void {
  if (item.showFrequency === 'once') {
    localStorage.setItem(`${DISMISSED_PREFIX}${item.id}`, '1');
  } else if (item.showFrequency === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`${DAILY_PREFIX}${item.id}`, today);
  }
}

const CLOSE_LABELS: Record<ShowFrequency, string> = {
  once: '关闭',
  daily: '今天不再提醒',
  every_time: '关闭',
};

interface ActivityPopupModalProps {
  item: ActivityPopupItem;
  isOpen: boolean;
  hasNext?: boolean;
  onClose: () => void;
  onNext?: () => void;
  onNavigate?: (url: string) => void;
}

function PosterMode({ item, hasNext, onClose, onNext, onNavigate }: Omit<ActivityPopupModalProps, 'isOpen'>) {
  const hasLink = item.linkUrl && item.linkText;
  const imageUrl = resolveUploadUrl(item.image);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center max-w-[320px] w-full animate-in zoom-in-95 duration-200">
        <div
          className="w-full rounded-2xl overflow-hidden shadow-lg"
          onClick={hasLink ? () => onNavigate?.(item.linkUrl) : undefined}
        >
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full block"
            style={{ maxHeight: '70vh', objectFit: 'contain' }}
          />
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          {hasNext && (
            <button
              className="flex items-center text-sm font-medium py-2 px-5 rounded-full bg-white/90 text-gray-800 shadow active:bg-white"
              onClick={onNext}
            >
              查看新活动 <ChevronRight size={14} className="ml-0.5" />
            </button>
          )}
          <button
            className="text-sm py-2 px-5 rounded-full bg-black/40 text-white/90 active:bg-black/60"
            onClick={onClose}
          >
            {CLOSE_LABELS[item.showFrequency]}
          </button>
        </div>
      </div>
    </div>
  );
}

function RichTextMode({ item, hasNext, onClose, onNext, onNavigate }: Omit<ActivityPopupModalProps, 'isOpen'>) {
  const hasLink = item.linkUrl && item.linkText;
  const hasHtmlMarkup = /<\/?[a-z][\s\S]*>/i.test(item.content);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="bg-white dark:bg-gray-900 w-full max-w-[340px] rounded-2xl shadow-lg relative z-10 flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="px-5 pt-6 pb-3 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
            {item.title}
          </h2>
        </div>

        <div className="px-5 overflow-y-auto no-scrollbar flex-1 min-h-0">
          {hasHtmlMarkup ? (
            <div
              className="pb-4 text-md leading-relaxed text-gray-700 dark:text-gray-300 [&_a]:break-all [&_a]:text-primary-start [&_img]:mx-auto [&_img]:my-4 [&_img]:max-w-full [&_p]:mb-4 [&_table]:w-full [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_th]:border [&_th]:border-gray-200 [&_th]:p-2 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-800 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 dark:[&_td]:border-gray-700 dark:[&_th]:border-gray-700"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          ) : (
            <div className="pb-4 text-md whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
              {item.content}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 shrink-0 flex flex-col items-center gap-2">
          {hasLink && (
            <button
              className="w-full h-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-gradient-to-r from-brand-start to-brand-end text-white text-base font-medium shadow-sm active:opacity-80"
              onClick={() => onNavigate?.(item.linkUrl)}
            >
              {item.linkText}
            </button>
          )}
          {hasNext && (
            <button
              className="flex items-center text-sm text-gray-600 dark:text-gray-300 font-medium active:text-gray-800 dark:active:text-gray-100 py-1"
              onClick={onNext}
            >
              查看新活动 <ChevronRight size={14} className="ml-0.5" />
            </button>
          )}
          <button
            className="text-sm text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300 py-1"
            onClick={onClose}
          >
            {CLOSE_LABELS[item.showFrequency]}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ActivityPopupModal: React.FC<ActivityPopupModalProps> = ({
  item,
  isOpen,
  hasNext,
  onClose,
  onNext,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const isPoster = !!item.image;

  if (isPoster) {
    return <PosterMode item={item} hasNext={hasNext} onClose={onClose} onNext={onNext} onNavigate={onNavigate} />;
  }

  return <RichTextMode item={item} hasNext={hasNext} onClose={onClose} onNext={onNext} onNavigate={onNavigate} />;
};
