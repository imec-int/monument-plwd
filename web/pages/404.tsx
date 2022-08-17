import Head from 'next/head';

const Custom404 = () => (
  <>
    <Head>
      <title>Monument - page not found</title>
    </Head>
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold">404 | Page not found</h1>
        </div>
      </div>
    </div>
  </>
);

export default Custom404;
