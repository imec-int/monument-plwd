import { AfterCallback, handleAuth, handleCallback } from '@auth0/nextjs-auth0';

const afterCallback: AfterCallback = (req, res, session) => {
  return session;
};

export default handleAuth({
  async callback(req, res) {
    try {
      await handleCallback(req, res, { afterCallback });
    } catch (error: any) {
      res.status(error.status || 500).end(error.message);
    }
  },
});
