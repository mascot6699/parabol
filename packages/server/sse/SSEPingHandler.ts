import {HttpRequest, HttpResponse} from 'uWebSockets.js'
import sseClients from '../sseClients'
import getReqAuth from '../utils/getReqAuth'
import AuthToken from '../database/types/AuthToken'

const SSEPingHandler = (res: HttpResponse, req: HttpRequest) => {
  const connectionId = req.getHeader('x-correlation-id')
  const connectionContext = sseClients.get(connectionId)
  if (connectionContext) {
    const authToken = getReqAuth(req)
    if ((authToken as AuthToken).sub === connectionContext.authToken.sub) {
      connectionContext.isAlive = true
    }
  }
  res.end()
}

export default SSEPingHandler
