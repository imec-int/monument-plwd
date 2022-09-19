const withPlugins = require('next-compose-plugins');
const nextTranslate = require('next-translate');

const withTM = require('next-transpile-modules')([
  '@fullcalendar/common',
  '@fullcalendar/daygrid',
  '@fullcalendar/interaction',
  '@fullcalendar/react',
  '@fullcalendar/timegrid',
]);

const redirects = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

/** @type {import('next').NextConfig} */
module.exports = withPlugins([[nextTranslate], [withTM], [redirects]], {
  reactStrictMode: true,
  // https://nextjs.org/docs/advanced-features/output-file-tracing#automatically-copying-traced-files-experimental
  // and https://github.com/vercel/next.js/pull/32258
  output: 'standalone',
});
