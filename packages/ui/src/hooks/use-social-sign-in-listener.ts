import { useEffect, useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { signInWithSocial } from '@/apis/social';
import { parseQueryParameters } from '@/utils';

import useApi, { ErrorHandlers } from './use-api';
import { PageContext } from './use-page-context';
import { stateValidation } from './utils';

const useSocialSignInListener = () => {
  const { setToast } = useContext(PageContext);
  const { t } = useTranslation(undefined, { keyPrefix: 'main_flow' });
  const parameters = useParams();
  const navigate = useNavigate();

  const signInWithSocialErrorHandlers: ErrorHandlers = useMemo(
    () => ({
      'user.identity_not_exists': (error) => {
        if (parameters.connector) {
          navigate(`/social-register/${parameters.connector}`, {
            replace: true,
            state: {
              ...(error.data as Record<string, unknown> | undefined),
            },
          });
        }
      },
    }),
    [navigate, parameters.connector]
  );

  const { result, run: asyncSignInWithSocial } = useApi(
    signInWithSocial,
    signInWithSocialErrorHandlers
  );

  const signInWithSocialHandler = useCallback(
    async (connectorId: string, state: string, code: string) => {
      void asyncSignInWithSocial({
        connectorId,
        code,
        redirectUri: `${window.location.origin}/callback/${connectorId}`, // For validation use only
      });
    },
    [asyncSignInWithSocial]
  );

  useEffect(() => {
    if (result?.redirectTo) {
      window.location.assign(result.redirectTo);
    }
  }, [result]);

  // Social Sign-In Callback Handler
  useEffect(() => {
    if (!parameters.connector) {
      return;
    }

    const { state, code, ...rest } = parseQueryParameters(window.location.search);

    if (!state || !stateValidation(state, parameters.connector)) {
      setToast(t('error.invalid_connector_auth'));

      return;
    }

    void signInWithSocialHandler(parameters.connector, state, code ?? JSON.stringify(rest));
  }, [parameters.connector, setToast, signInWithSocialHandler, t]);
};

export default useSocialSignInListener;