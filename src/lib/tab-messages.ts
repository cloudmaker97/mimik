export const TabMessage = {
  PING: 'PING',
  START_CAPTURE: 'START_CAPTURE',
  STOP_CAPTURE: 'STOP_CAPTURE',
  GET_ROUTE: 'GET_ROUTE',
  URL_CHANGED: 'URL_CHANGED',
  HIDE_OVERLAY: 'HIDE_OVERLAY',
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
} as const;

export type TabMessageType = (typeof TabMessage)[keyof typeof TabMessage];
