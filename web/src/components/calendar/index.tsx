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
    return data
      ? data.map((e: IEvent) => ({
          id: e.id,
          title: e.title,
          start: new Date(e.startTime),
          end: new Date(e.endTime),
          extendedProps: {
            address: e.address,
            externalContacts: e.externalContacts.map((c) => c.id),
            pickedUp: e.pickedUp,
            repeat: e.repeat,
            caretakers: e.carecircleMembers.map((c) => c.id),
          },
        }))
      : [];
  }, [data]);

  const fetchCalendarEvents = () => mutate(`/api/calendar-events/${plwd.id}`);

  const fieldProps = {
    ...(headerToolbarEnabled && {
      headerToolbar: {
        center: canManageCalendar
          ? 'new dayGridMonth,timeGridWeek,timeGridDay'
          : 'dayGridMonth,timeGridWeek,timeGridDay',
      },
    }),
  };

  const eventClick = useCallback((event: any) => {
    setSelectedEvent(event.event);
  }, []);

  const calendarCustomButtons = useMemo(
    () =>
      canManageCalendar
        ? {
            new: {
              text: 'Add event',
              click: () => eventClick({ event: {} }),
            },
          }
        : undefined,
    [canManageCalendar, eventClick]
  );

  return (
    <div className="card w-full p-8 shadow-xl">
      {selectedEvent ? (
        <ModalEventDetails
          caretakers={caretakers}
          externalContacts={externalContacts}
          fetchCalendarEvents={fetchCalendarEvents}
          plwd={plwd}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
        />
      ) : null}
      <FullCalendar
        customButtons={calendarCustomButtons}
        eventClick={canManageCalendar ? eventClick : undefined}
        events={calendarEvents}
        height={height || '500px'}
        initialView={initialView || 'dayGridMonth'}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        {...fieldProps}
      />
    </div>
  );
};
