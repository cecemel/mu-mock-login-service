# mu-mock-login-service
Service to login into a mu-app.

It manages the triple:
```
  mu:sessionUri session:account foaf:onlineAccountUri
```

## API
### Login
```
  Content-Type: application/vnd.api+json
  POST /sessions
  Body: {
          "data": {
           "relationships": {
             "account":{
               "data": {
                 "id": "mu:uuid of foaf:OnlineAccount",
                 "type": "accounts"
               }
             }
           },
           "type": "sessions"
           }
         }
```
### Get current session
Assumes valid session from mu-identifier
```
  GET /sessions/current
```
### Logout
Assumes valid session from mu-identifier
```
  DELETE /sessions/current
```
