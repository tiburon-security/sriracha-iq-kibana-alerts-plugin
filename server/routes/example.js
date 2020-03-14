export default function(server) {
  server.route({
    path: '/api/srirachaiq_alerts/example',
    method: 'GET',
    handler() {
      return { time: new Date().toISOString() };
    },
  });
}
