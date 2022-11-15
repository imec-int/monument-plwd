import 'tailwindcss/tailwind.css';
import '@fullcalendar/common/main.css';
import '@fullcalendar/daygrid/main.css';
import '@fullcalendar/timegrid/main.css';
import '../src/styles/globals.css';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { CustomError } from 'lib/CustomError';
import { NextPage } from 'next';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { SnackbarProvider } from 'notistack';
import { ReactElement, ReactNode } from 'react';
import { SWRConfig } from 'swr';

export type PageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: PageWithLayout;
};

function MyApp({ Component, pageProps, router }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <Head>
        <title>Monument</title>
      </Head>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider maxSnack={3}>
          <SWRConfig
            value={{
              onError: (error: CustomError) => {
                if (error.statusCode === 401) {
                  router.push('/api/auth/logout');

                  return;
                }
              },
            }}
          >
            {getLayout(<Component {...pageProps} />)}
          </SWRConfig>
        </SnackbarProvider>
      </LocalizationProvider>
    </>
  );
}

export default MyApp;
