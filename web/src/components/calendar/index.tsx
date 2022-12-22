/* eslint-disable */
// Make sure that the FullCalendar is imported before the plugins
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
/* eslint-enable */
import { ModalEventDetails } from '@components';
import { useCallback, useMemo, useState } from 'react';
import { ICalendar, IEvent } from '@interfaces';
import { useSWRConfig } from 'swr';
import { useCarecircle } from 'src/hooks/useCarecircle';
import { useExternalContacts } from 'src/hooks/useExternalContacts';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useCalendarEvents } from 'src/hooks/useCalendarEvents';
import { usePermissions } from 'src/hooks/usePermissions';
import dayjs from 'dayjs';

export const Calendar: React.FC<ICalendar> = ({
  initialView,
  height,
  headerToolbarEnabled = true,
}) => {
  const { plwd } = useAppUserContext();
  const { canManageCalendar } = usePermissions();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { mutate } = useSWRConfig();

  const { data: caretakers = [] } = useCarecircle(plwd.id);
  const { data: externalContacts = [] } = useExternalContacts(plwd.id);
  const { data = [] } = useCalendarEvents(plwd.id);

  const calendarEvents = useMemo(() => {
    // Add styling to calendar events
    return data.map((e: IEvent) => ({
      backgroundColor: e.address ? 'rgb(55, 136, 216)' : 'rgb(240, 0, 184)',
      borderColor: e.address ? 'rgb(55, 136, 216)' : 'rgb(240, 0, 184)',
      display: 'block',
      end: new Date(e.endTime),
      id: e.id,
      start: new Date(e.startTime),
      title: e.title,
      extendedProps: {
        address: e.address,
        caretakers: e.carecircleMembers.map((c) => c.id),
        date: e.date,
        externalContacts: e.externalContacts.map((c) => c.id),
        pickedUp: e.pickedUp,
        repeat: e.repeat,
      },
    }));
  }, [data]);

  const fetchCalendarEvents = () => mutate(`/api/calendar-events/${plwd.id}`);

  const fieldProps = {
    ...(headerToolbarEnabled && {
      headerToolbar: {
        left: 'title',
        center: canManageCalendar
          ? 'newCalendarEvent dayGridMonth,timeGridWeek,timeGridDay'
          : 'dayGridMonth,timeGridWeek,timeGridDay',
        right: 'today prev,next',
      },
    }),
  };

  const eventClick = useCallback((event: any) => {
    setSelectedEvent(event.event);
  }, []);

  const triggerEmptyEvent = useCallback(() => {
    eventClick({ event: {} });
  }, [eventClick]);

  const clickGridCell = useCallback(
    (event) => {
      const start = dayjs(event.start).add(8, 'hour');
      const end = dayjs(event.start).add(9, 'hour');
      const mutatedEvent = { ...event, start, end };
      eventClick({ event: mutatedEvent });
    },
    [eventClick]
  );

  const calendarCustomButtons = useMemo(
    () =>
      canManageCalendar
        ? {
            newCalendarEvent: {
              text: 'Add event',
              click: triggerEmptyEvent,
            },
          }
        : undefined,
    [canManageCalendar, triggerEmptyEvent]
  );

  return (
    <div className="card w-full p-8 shadow-xl">
      {selectedEvent ? (
        <ModalEventDetails
          allEvents={data}
          caretakers={caretakers}
          externalContacts={externalContacts}
          fetchCalendarEvents={fetchCalendarEvents}
          plwd={plwd}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
        />
      ) : null}
      <FullCalendar
        allDaySlot={false}
        customButtons={calendarCustomButtons}
        eventClick={canManageCalendar ? eventClick : undefined}
        eventTimeFormat={{
          hour: '2-digit',
          hour12: false,
          meridiem: false,
          minute: '2-digit',
        }}
        events={calendarEvents}
        height={height || '680px'}
        initialView={initialView || 'dayGridMonth'}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        select={clickGridCell}
        selectConstraint={{ start: dayjs().subtract(1, 'day').toISOString() }}
        selectLongPressDelay={1}
        selectable
        {...fieldProps}
      />
    </div>
  );
};
