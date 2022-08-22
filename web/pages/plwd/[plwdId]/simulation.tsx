import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Container, Header, MapCustomMarker, MapGeofence } from '@components';
import { Cross } from '@components/icons/Cross';
import { Eye } from '@components/icons/Eye';
import { Flag } from '@components/icons/Flag';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import * as turf from '@turf/turf';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Map, MapRef } from 'react-map-gl';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useCalendarEvents } from 'src/hooks/useCalendarEvents';
import useInterval from 'src/hooks/useInterval';
import * as yup from 'yup';

const simulationPoint = yup.object({
  location: yup.object({
    address: yup.string().required(),
    lat: yup.number().required(),
    lng: yup.number().required(),
  }),
  time: yup.string().required(),
});

const simulationSchema = yup.object({
  selectedEventId: yup.string().required().min(1),
  points: yup.array().of(simulationPoint).required().min(1),
  isRunningSimulation: yup.boolean().required(),
});

type ISimulationPoint = yup.InferType<typeof simulationPoint>;
type ISimulationSchema = yup.InferType<typeof simulationSchema>;

const initialViewState = {
  latitude: 51.21645030497296,
  longitude: 4.423584313166383,
  zoom: 15,
};

const postSimulationStep = (data: {
  selectedEventId: string;
  point: ISimulationPoint;
}) => {
  fetch('/api/simulation', {
    method: 'post',
    body: JSON.stringify(data),
  });
};

// The watch sends the wearer's location to our backend every 30 seconds.
// Via the logic below we're going to simulate this behaviour.
const SECOND = 1000; // note: 1000ms equals to 1s
const WATCH_LOCATION_UPDATE_INTERVAL = 5000;
const COUNTDOWN = WATCH_LOCATION_UPDATE_INTERVAL / SECOND;
const MAX_DISTANCE = 150;

const getLateDate = (startTime: string) => {
  const now = dayjs();
  const lateTime = dayjs(startTime).add(10, 'minutes');
  const lateHours = parseInt(dayjs(lateTime).format('HH'));
  const lateMinutes = parseInt(dayjs(lateTime).format('mm'));
  const lateDate = dayjs(now).set('hour', lateHours).set('minute', lateMinutes);

  return lateDate;
};

const getFormattedEndpoint = (endpoint: any) => {
  return { location: { ...endpoint, address: '' }, time: '' };
};

export const getServerSideProps = withPageAuthRequired();

const Simulation = () => {
  const { plwd } = useAppUserContext();
  const { enqueueSnackbar } = useSnackbar();
  const { data: calendarEvents = [] } = useCalendarEvents(plwd.id);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(COUNTDOWN);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [notificationSent, setNotificationSent] = useState<boolean>(false);
  const mapRef = useRef<MapRef>(null);

  const {
    control,
    formState: { isValid, isDirty },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<ISimulationSchema>({
    mode: 'onChange',
    defaultValues: {
      points: [{ time: new Date().toISOString() }],
      isRunningSimulation: false,
    },
    resolver: yupResolver(simulationSchema),
  });

  const watchSelectedEventId = watch('selectedEventId');
  const watchPoints = useWatch({ control, name: 'points' });
  const isRunningSimulation = useWatch({
    control,
    name: 'isRunningSimulation',
  });

  const flyToPoint = useCallback((point: { lng: number; lat: number }) => {
    if (mapRef && mapRef.current) {
      mapRef.current.flyTo({ center: [point.lng, point.lat], zoom: 15 });
    }
  }, []);

  const endpoint: { startTime: string; lng: number; lat: number } | undefined =
    useMemo(() => {
      if (!watchSelectedEventId) return undefined;

      const selectedEvent = calendarEvents.find(
        (c) => c.id === watchSelectedEventId
      );

      if (!selectedEvent) return undefined;

      const location = selectedEvent.address?.geometry.location;

      flyToPoint(location);

      return {
        ...location,
        startTime: selectedEvent.startTime,
      };
    }, [calendarEvents, watchSelectedEventId, flyToPoint]);

  const onAddPoint = useCallback(() => {
    setValue('points', [
      ...watchPoints,
      {
        time: new Date().toISOString(),
        location: { address: '', lat: NaN, lng: NaN },
      },
    ]);
  }, [setValue, watchPoints]);

  const onDeletePoint = useCallback(
    (index: number) => {
      const watchPointsWithoutDeletedIndex = [...watchPoints];
      watchPointsWithoutDeletedIndex.splice(index, 1);
      setValue('points', watchPointsWithoutDeletedIndex);
    },
    [watchPoints, setValue]
  );

  const onStopSimulation = useCallback(() => {
    setSimulationStep(0);
    setValue('isRunningSimulation', false);
    setCountdown(COUNTDOWN);
    setNotificationSent(false);
    setCurrentDistance(null);
  }, [setSimulationStep, setValue]);

  const reachedJourneyEnd = useMemo(() => {
    return simulationStep >= watchPoints.length;
  }, [simulationStep, watchPoints]);

  const isLastStep = useMemo(() => {
    return simulationStep >= watchPoints.length - 1;
  }, [simulationStep, watchPoints]);

  const delayWatch = useMemo(() => {
    if (!isRunningSimulation) return null;

    return reachedJourneyEnd ? null : WATCH_LOCATION_UPDATE_INTERVAL;
  }, [isRunningSimulation, reachedJourneyEnd]);

  const delayCountdown = useMemo(() => {
    if (!isRunningSimulation) return null;

    return reachedJourneyEnd ? null : SECOND;
  }, [isRunningSimulation, reachedJourneyEnd]);

  const onResetForm = useCallback(() => {
    reset();
    flyToPoint({
      lng: initialViewState.longitude,
      lat: initialViewState.latitude,
    });
  }, [reset, flyToPoint]);

  const calculateDistance = useCallback(
    (pointA: ISimulationPoint, pointB: ISimulationPoint) => {
      const pointA_ = turf.point([pointA.location.lng, pointA.location.lat]);
      const pointB_ = turf.point([pointB.location.lng, pointB.location.lat]);

      return turf.distance(pointA_, pointB_, { units: 'meters' });
    },
    []
  );

  useInterval(async () => {
    console.warn(
      `Should execute every ${COUNTDOWN} seconds`,
      dayjs().format('HH:mm:ss')
    );

    if (!notificationSent) {
      postSimulationStep({
        selectedEventId: watchSelectedEventId,
        point: watchPoints[simulationStep],
      });
    }

    let pointA;
    let pointB;

    if (endpoint?.lat && endpoint?.lng) {
      pointA = getFormattedEndpoint(endpoint);
      pointB = watchPoints[simulationStep];

      const pointBDate = dayjs(pointB.time);
      const distance = calculateDistance(pointA, pointB);
      const lateDate = getLateDate(endpoint.startTime);
      if (distance > MAX_DISTANCE) {
        const isLate = pointBDate.isAfter(lateDate);
        if (!notificationSent && isLate) {
          enqueueSnackbar('A notification should be sent', {
            variant: 'info',
            preventDuplicate: true,
          });
          setNotificationSent(true);
        }
      }
      console.warn(`Point A to Point B distance is ${distance} meters`);
    }

    if (isLastStep) {
      onStopSimulation();
      enqueueSnackbar('Simulation completed', {
        variant: 'success',
        preventDuplicate: true,
      });

      return;
    }

    const incrementedSimulationStep = simulationStep + 1;
    setSimulationStep(incrementedSimulationStep);
    flyToPoint(watchPoints[incrementedSimulationStep].location);
    if (pointA) {
      const currentDistance = Math.floor(
        calculateDistance(pointA, watchPoints[incrementedSimulationStep])
      );
      setCurrentDistance(currentDistance);
    }
    setCountdown(COUNTDOWN);
  }, delayWatch);

  useInterval(() => {
    setCountdown((s) => s - 1);
  }, delayCountdown);

  const onSubmit = async (data: ISimulationSchema) => {
    const [firstPoint] = data.points;
    setValue('isRunningSimulation', true);
    if (endpoint?.lat && endpoint?.lng) {
      const pointA = getFormattedEndpoint(endpoint);
      const currentDistance = Math.floor(calculateDistance(pointA, firstPoint));
      setCurrentDistance(currentDistance);
    }
    flyToPoint(firstPoint.location);
  };

  return (
    <Container className="h-screen">
      <Header tabTitle="Monument - Simulation" />
      <div className="flex h-[100%] pb-8">
        <form className="mr-10 min-w-[20rem]" onSubmit={handleSubmit(onSubmit)}>
          <h3 className="font-bold text-lg mb-5">Simulate a journey</h3>
          {watchPoints.map((field, index) => (
            <div
              className="flex flex-row items-center form-control w-full mb-2"
              key={index}
            >
              <div
                className={`mr-4 pl-1 pr-1 text-center ${
                  simulationStep === index && isRunningSimulation
                    ? 'border-b-4 border-sky-400 text-sky-400'
                    : ''
                }`}
              >
                {index + 1}
              </div>
              <div>
                <Controller
                  control={control}
                  name={`points.${index}.location`}
                  render={({ field: { value, onChange } }) =>
                    isRunningSimulation ? (
                      <input
                        className={'input input-bordered w-full'}
                        disabled
                        type="text"
                        value={value.address}
                      />
                    ) : (
                      <Autocomplete
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                        className={'input input-bordered w-full'}
                        defaultValue={value?.address || ''}
                        language="en"
                        onChange={(evt: React.MouseEvent<HTMLInputElement>) => {
                          // Clear the address, lat and lng value when we reset the input
                          if (evt.currentTarget.value === '') {
                            onChange({
                              address: evt.currentTarget.value,
                              lat: NaN,
                              lng: NaN,
                            });
                          }
                        }}
                        onPlaceSelected={(places) => {
                          if (!places) return;

                          // Note: the optional chaining should normally not be necessary
                          // but we've added it just to prevent any errors being thrown.
                          const point = {
                            address: places.formatted_address,
                            lat: places?.geometry?.location?.lat() ?? 0,
                            lng: places?.geometry?.location?.lng() ?? 0,
                          };
                          onChange(point);
                          flyToPoint(point);
                        }}
                        options={{
                          types: ['address'],
                        }}
                        placeholder="Enter address"
                      />
                    )
                  }
                />
                <Controller
                  control={control}
                  name={`points.${index}.time`}
                  render={({ field: { value, onChange } }) => (
                    <TimePicker
                      ampm={false}
                      disabled={isRunningSimulation}
                      onChange={(time) =>
                        onChange(time ?? new Date().toISOString())
                      }
                      renderInput={(params) => (
                        <TextField
                          size="small"
                          style={{ marginTop: '0.25rem', width: '100%' }}
                          {...params}
                        />
                      )}
                      value={value ?? new Date()}
                    />
                  )}
                />
              </div>
              {field.location?.lat && field.location?.lng ? (
                <Eye
                  className="ml-2 hover:cursor-pointer"
                  onClick={() => flyToPoint(field.location)}
                />
              ) : null}
              {index === watchPoints.length - 1 && index !== 0 ? (
                <Cross
                  className={`ml-2 ${
                    index === 0 ? 'opacity-0' : 'hover:cursor-pointer'
                  }`}
                  onClick={() => (index === 0 ? null : onDeletePoint(index))}
                />
              ) : null}
            </div>
          ))}
          {watchPoints.length >= 5 ? null : (
            <button
              className="btn btn-outline btn-info ml-8 mb-4"
              disabled={isRunningSimulation}
              onClick={onAddPoint}
              type="button"
            >
              Add point
            </button>
          )}
          <div className="flex flex-row items-center form-control w-full mt-4">
            <div className="mr-4 text-center">
              <Flag />
            </div>
            <div className="w-full form-control">
              <select
                {...register('selectedEventId')}
                className="select select-bordered w-full"
                disabled={isRunningSimulation}
              >
                {[{ id: '', title: 'Select event' }, ...calendarEvents].map(
                  (event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  )
                )}
              </select>
            </div>
            {endpoint ? (
              <Eye
                className="ml-2 hover:cursor-pointer"
                onClick={() => flyToPoint(endpoint)}
              />
            ) : null}
          </div>
          {endpoint ? (
            <div className="alert alert-info shadow-lg mt-8">
              <div>
                <svg
                  className="stroke-current flex-shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                <p>
                  Event starts at{' '}
                  <b>
                    {dayjs(endpoint.startTime ?? new Date()).format('HH:mm')}
                  </b>
                  , the person is considered late after{' '}
                  <b>
                    {dayjs(endpoint.startTime ?? new Date())
                      .add(10, 'minutes')
                      .format('HH:mm')}
                  </b>
                  .
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex justify-between mt-3">
            {isRunningSimulation ? null : (
              <button
                className="btn btn-success"
                disabled={!isValid}
                type="submit"
              >
                Start simulation
              </button>
            )}
            {isRunningSimulation ? (
              <button
                className="btn btn-error"
                onClick={onStopSimulation}
                type="button"
              >
                Stop simulation
              </button>
            ) : (
              <button
                className="btn btn-outline"
                disabled={!isDirty}
                onClick={onResetForm}
                type="button"
              >
                Reset form
              </button>
            )}
          </div>
        </form>
        <div className="relative h-full w-full rounded-box overflow-hidden mb-8">
          {reachedJourneyEnd || !isRunningSimulation ? null : (
            <div className="absolute top-3 right-3 flex flex-col p-2 bg-primary rounded-box text-neutral-content z-10 items-center">
              <span className="text-center">Sending event in</span>
              <span className="countdown font-mono text-5xl text-center">
                {/* @ts-expect-error - not sure how to type this */}
                <span style={{ '--value': countdown }}></span>
              </span>
              <span className="text-center">sec</span>
            </div>
          )}
          {currentDistance ? (
            <div className="absolute top-3 left-3 flex flex-col p-2 bg-primary rounded-box text-neutral-content z-10 items-center">
              <span className="text-center">
                Current distance: {currentDistance} m
              </span>
            </div>
          ) : null}
          <Map
            initialViewState={initialViewState}
            mapStyle="mapbox://styles/mapbox/dark-v9"
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            ref={mapRef}
          >
            {watchPoints.map((field, idx) => {
              if (!field.location?.lat || !field.location?.lng) return null;

              return (
                <MapCustomMarker key={idx} {...field.location}>
                  {idx + 1}
                </MapCustomMarker>
              );
            })}
            {endpoint ? (
              <>
                <MapGeofence coordinates={[endpoint.lng, endpoint.lat]} />
                <MapCustomMarker {...endpoint}>
                  <Flag />
                </MapCustomMarker>
              </>
            ) : null}
          </Map>
        </div>
      </div>
    </Container>
  );
};

Simulation.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Simulation;
