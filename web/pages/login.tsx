import { getServerSidePropsWrapper, getSession } from '@auth0/nextjs-auth0';
import { Container, Login } from '@components';
import { GetServerSidePropsContext } from 'next';

const callback = async (ctx: GetServerSidePropsContext) => {
  const session = getSession(ctx.req, ctx.res);

  if (session) {
    return {
      redirect: {
        destination: '/switch',
        permanent: false,
      },
      props: {},
    };
  }

  return { props: {} };
};

// Documentation on why we're doing this:
// https://github.com/auth0/nextjs-auth0/blob/main/FAQ.md#3-im-getting-the-warningerror-you-should-not-access-res-after-getserversideprops-resolves
export const getServerSideProps = getServerSidePropsWrapper(callback);

const LoginPage: React.FC = () => {
  return (
    <Container>
      <Login />
    </Container>
  );
};

export default LoginPage;
