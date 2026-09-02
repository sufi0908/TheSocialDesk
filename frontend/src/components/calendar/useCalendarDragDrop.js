import { useState, useCallback, useRef } from 'react';

/**
 * useCalendarDragDrop
 * Hook managing native HTML5 drag-and-drop state, hovered drop targets,
 * drag preview data, and drop resolution for the SocialDesk Content Calendar.
 */
export const useCalendarDragDrop = ({ onScheduleDrop, onRescheduleDrop, canManage = true }) => {
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'QUEUE_ITEM' | 'CALENDAR_ITEM', item: object, sourceDate?: string }
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null); // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'
  const draggedItemRef = useRef(null);

  const handleDragStart = useCallback(
    (e, item, type = 'CALENDAR_ITEM', sourceDate = null) => {
      if (!canManage) return;

      const payload = {
        type,
        item,
        sourceDate: sourceDate || item.date || null,
      };

      setDraggedItem(payload);
      draggedItemRef.current = payload;
      setIsDragging(true);

      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.setData('text/plain', String(item.id || item.contentId));
      } catch (err) {
        // Fallback for strict browsers
        e.dataTransfer.setData('text/plain', String(item.id || item.contentId));
      }
    },
    [canManage]
  );

  const handleDragOver = useCallback(
    (e, dateKey) => {
      if (!canManage || !draggedItemRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (hoveredDate !== dateKey) {
        setHoveredDate(dateKey);
      }
    },
    [canManage, hoveredDate]
  );

  const handleDragLeave = useCallback(
    (e, dateKey) => {
      if (!canManage) return;
      // Only clear if leaving to an outside element
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setHoveredDate((prev) => (prev === dateKey ? null : prev));
    },
    [canManage]
  );

  const handleDrop = useCallback(
    (e, targetDate, targetTime = null) => {
      if (!canManage) return;
      e.preventDefault();
      e.stopPropagation();

      const activePayload = draggedItemRef.current || draggedItem;
      setHoveredDate(null);
      setIsDragging(false);
      setDraggedItem(null);
      draggedItemRef.current = null;

      if (!activePayload || !activePayload.item || !targetDate) return;

      const { item, type, sourceDate } = activePayload;

      if (type === 'QUEUE_ITEM') {
        // Approved item dropped onto calendar
        if (onScheduleDrop) {
          onScheduleDrop({
            item,
            targetDate,
            targetTime: targetTime || '14:00',
          });
        }
      } else if (type === 'CALENDAR_ITEM') {
        // Scheduled post dragged to another date/time
        const isSameDate = sourceDate === targetDate;
        const isSameTime = targetTime ? item.time === targetTime : true;

        if (isSameDate && isSameTime) {
          // Dropped on exact same slot, no change needed
          return;
        }

        if (onRescheduleDrop) {
          onRescheduleDrop({
            item,
            sourceDate: sourceDate || item.date,
            targetDate,
            targetTime: targetTime || item.time || '14:00',
          });
        }
      }
    },
    [canManage, draggedItem, onScheduleDrop, onRescheduleDrop]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    setHoveredDate(null);
    draggedItemRef.current = null;
  }, []);

  return {
    draggedItem,
    isDragging,
    hoveredDate,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
};

export default useCalendarDragDrop;
