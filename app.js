import { app, query } from 'mu';
import bodyParser from 'body-parser';
import { getSessionIdHeader, error } from './utils';
import { removeOldSessions,
         selectAccount,
         insertNewSessionForAccount,
         selectAccountBySession, selectCurrentSession } from './lib/session';

app.use(bodyParser.json({ type: 'application/vnd.api+json'}));
app.use(bodyParser.json());

/**
 * POST /sessions

 * Body
 *  data: {
 *    relationships: {
 *      account:{
 *        data: {
 *          id: "account_id",
 *          type: "accounts"
 *        }
 *      }
 *    },
 *    type: "sessions"
 *  }
 *  Returns 201 on successful login
 *          400 if session header is missing
 *          400 on login failure (incorrect user/password or inactive account)
 **/
app.post('/sessions', async function( req, res, next ) {
  const sessionUri = getSessionIdHeader(req);
  if (!sessionUri) return error(res, 'Session header is missing');

  let accountId = null;
  try {
    accountId = req.body['data']['relationships']['account']['data']['id'];
  } catch(e){
    console.error(`Error parsing accountId ${JSON.stringfy(accountId)}`);
  }
  if(!accountId) return error(res, `Issues retreiving id from ${req.body}`);

  try {
    await removeOldSessions(sessionUri);

    const constAccountData = await selectAccount(accountId);

    if(!constAccountData.accountUri) return error(res, `No matching account found for ${accountId}`);

    const { _, sessionId } = await insertNewSessionForAccount(constAccountData.accountUri, sessionUri);

    return res.header('mu-auth-allowed-groups', 'CLEAR').status(201).send({
        links: {
          self: '/sessions/current'
        },
        data: {
          type: 'sessions',
          id: sessionId,
          attributes: {}
        },
        relationships: {
          account: {
            links: { related: `/accounts/${accountId}` },
            data: { type: 'accounts', id: accountId }
          }
        }
    });
  }
  catch(e){
    return next(new Error(e.message));
  }

});


/**
 * Log out from the current session, i.e. detaching the session from the user's account.
 *
 * @return [204] On successful logout
 * @return [400] If the session header is missing or invalid
*/
app.delete('/sessions/current', async function(req, res, next) {
  const sessionUri = getSessionIdHeader(req);
  if (!sessionUri)
    return error(res, 'Session header is missing');

  try {
    const { accountUri } = await selectAccountBySession(sessionUri);
    if (!accountUri)
      return error(res, 'Invalid session');

    await removeOldSessions(sessionUri);

    return res.header('mu-auth-allowed-groups', 'CLEAR').status(204).end();
  } catch(e) {
    return next(new Error(e.message));
  }
});


/**
 * Get the current session
 *
 * @return [200] The current session
 * @return [400] If the session header is missing or invalid
*/
app.get('/sessions/current', async function(req, res, next) {
  const sessionUri = getSessionIdHeader(req);
  if (!sessionUri)
    return next(new Error('Session header is missing'));

  try {
    const { accountUri, accountId } = await selectAccountBySession(sessionUri);
    if (!accountUri)
      return error(res, 'Invalid session');

    const  { _, sessionId } = await selectCurrentSession(accountUri);

    return res.status(201).send({
        links: {
          self: '/sessions/current'
        },
        data: {
          type: 'sessions',
          id: sessionId,
          attributes: {}
        },
        relationships: {
          account: {
            links: { related: `/accounts/${accountId}` },
            data: { type: 'accounts', id: accountId }
          }
        }
    });
  } catch(e) {
    return next(new Error(e.message));
  }
});
