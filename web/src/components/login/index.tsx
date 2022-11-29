// components/login
import Image from 'next/image';
import Link from 'next/link';
import useTranslation from 'next-translate/useTranslation';

export const Login: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="items-center flex flex-auto justify-center h-screen">
      <div className="card w-[26rem] bg-base-100 shadow-xl">
        <div className="px-10 mt-10 relative w-xl h-24">
          <Image
            alt="Monument logo"
            layout="fill"
            objectFit="contain"
            src="/images/interreg-logo.svg"
          />
        </div>
        <div className="card-body items-center text-center">
          <h2 className="card-title">{t('loginTitle')}</h2>
          <p className="mb-4">{t('loginDescription')}</p>
          <p>{t('loginDescription2')}</p>
          <div className="card-actions mt-8 gap-4 flex-col flex lg:flex-row">
            <Link href={'/api/auth/login?returnTo=/switch'}>
              <button className="btn btn-secondary w-28">
                {t('loginButton')}
              </button>
            </Link>
            <label className="text-gray-400 mt-2 hidden lg:block">-</label>
            <Link href={'/api/signup?returnTo=/setup'}>
              <button className="btn btn-secondary w-28">
                {t('signUpButton')}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
