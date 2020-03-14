/**
 * API Endpoint to acknowledge an alert - NEEDS WORK STILL!!
 */

export default function(server) {
	server.route({
		path: '/api/srirachaiq_alerts/acknowledge_alert/{id}',
		method: 'GET', //switch to post once comments are added
		handler: function(request, h) {
			
			const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
			const params = request.params || {}
			const payload = request.payload // remember to circle back and add this to the doc
			
			const currentDatetime = new Date(); 
			
			return callWithRequest(request, 'update', {
				index: 'alerts',
				id: params.id,
				body: {
					script: {
						source: "ctx._source.acknowledged = params.acknowledged",
						params : {
							"acknowledged" : true
						}
					},
					script: {
						source: "ctx._source.acknowledged_date = params.acknowledged_date",
						params : {
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