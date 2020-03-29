/**
 * API Endpoint to acknowledge an alert
 */

export default function(server) {
	server.route({
		path: '/api/srirachaiq_alerts/acknowledge_alert/{id}',
		method: 'GET',
		handler: function(request, h) {
			
			const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
			const params = request.params || {}
			
			const currentDatetime = new Date(); 
			
			return callWithRequest(request, 'update', {
				index: 'alerts',
				id: params.id,
				body: {
					script: {
						source: "ctx._source.acknowledged = params.acknowledged; ctx._source.acknowledged_date = params.acknowledged_date" ,
						params : {
							"acknowledged" : true,
							"acknowledged_date" : currentDatetime.toISOString()
						}
					}
				}
				
			}).then(function(response){
				return response
			});
			
		}
	});
}
