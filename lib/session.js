import { uuid, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';

const removeOldSessions = async function(sessionUri) {
  await update(
    `PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
     PREFIX session: <http://mu.semte.ch/vocabularies/session/>

     DELETE WHERE {
       GRAPH <http://mu.semte.ch/graphs/sessions> {
           ${sparqlEscapeUri(sessionUri)} session:account ?account ;
                                          mu:uuid ?id .
       }
     }`);
};

const selectAccount = async function(accountId){
  const queryResult = await query(`
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>

    SELECT ?account WHERE {
        GRAPH ?g {
          ?account a foaf:OnlineAccount ;
                   mu:uuid ${sparqlEscapeString(accountId)} .
      }
    }
  `
  );

  if (queryResult.results.bindings.length) {
    const result = queryResult.results.bindings[0];
    return { accountUri: result.account.value, accountId };
  } else {
    return { accountUri: null, accountId: null };
  }
};

const insertNewSessionForAccount = async function(account, sessionUri) {
  const sessionId = uuid();
  const now = new Date();

  let insertData = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>

    INSERT DATA {
      GRAPH <http://mu.semte.ch/graphs/sessions> {
        ${sparqlEscapeUri(sessionUri)} mu:uuid ${sparqlEscapeString(sessionId)} ;
                                 session:account ${sparqlEscapeUri(account)} .
     }
   }`;

  await update(insertData);
  return { sessionUri, sessionId };
};

const selectAccountBySession = async function(session) {
  const q = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>

    SELECT ?account ?accountId
    WHERE {
      GRAPH <http://mu.semte.ch/graphs/sessions> {
          ${sparqlEscapeUri(session)} session:account ?account .
      }
      GRAPH ?g {
          ?account a foaf:OnlineAccount ;
                   mu:uuid ?accountId .
      }
    }`;
  console.log(q);
  const queryResult = await query(q);
  if (queryResult.results.bindings.length) {
    const result = queryResult.results.bindings[0];
    return { accountUri: result.account.value, accountId: result.accountId.value };
  } else {
    return { accountUri: null, accountId: null };
  }
};

const selectCurrentSession = async function(account) {
  const queryResult = await query(`
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>

    SELECT ?session ?sessionId
    WHERE {
      GRAPH <http://mu.semte.ch/graphs/sessions> {
          ?session session:account ${sparqlEscapeUri(account)} ;
                   mu:uuid ?sessionId .
      }
    }`);

  if (queryResult.results.bindings.length) {
    const result = queryResult.results.bindings[0];
    return {
      sessionUri: result.session.value,
      sessionId: result.sessionId.value
    };
  } else {
    return  { sessionUri: null, sessionId: null };
  }
};

export {
  removeOldSessions,
  selectAccount,
  insertNewSessionForAccount,
  selectAccountBySession,
  selectCurrentSession
}
