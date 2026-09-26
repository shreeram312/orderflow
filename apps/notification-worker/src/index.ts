/**
 * Notification worker — tells the customer when their order moves.
 *
 * Consumes the status events the API publishes when kitchen staff tap a button,
 * plus the accept/reject decision from the order worker:
 *
 *   order.confirmed   "Your order is confirmed"
 *   order.rejected    "Sorry — <reason>"
 *   order.preparing   "Your food is being prepared"
 *   order.ready       "Your order is ready for pickup"
 *
 * Bind those four keys explicitly rather than the `order.*` wildcard, or this
 * queue also receives order.created — which the customer is already looking at.
 *
 * Six calls, same as the order worker:
 *   connect -> createChannel -> assertExchange -> assertQueue -> bindQueue -> consume
 */

export {};
