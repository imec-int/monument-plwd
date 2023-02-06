const nextTranslate = require('next-translate');

/** @type {import('next').NextConfig} */
module.exports = nextTranslate({
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
  reactStrictMode: true,
  // https://nextjs.org/docs/advanced-features/output-file-tracing#automatically-copying-traced-files-experimental
  // and https://github.com/vercel/next.js/pull/32258
  output: 'standalone',
});
