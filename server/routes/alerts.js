/**
 * API Endpoint that returns all alerts, with options for viewing either acknowledged or unacknowledged alerts.
 * This API doesn't paginate since there isn't an expectation that tens of thousands of alerts
 * be generated & analyzed, i.e. this isn't intended to be a SIEM.
 */

export default function(server) {

	const acknowledgedQuery = {
		match: {
			acknowledged: true
		}
	};
				
	const notAcknowledgedQuery = {
		bool: { 
			must_not: [
				{ 
					match: { 
						acknowledged: true 
					} 
				}
			]
		}
	};

	server.route({
		path: '/api/srirachaiq_alerts/alerts',
		method: 'GET',
		handler: function(request, h) {
			
			const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
		    const params = request.query;
		    
			let searchQuery = notAcknowledgedQuery;
			
			let showAcknowledged = false;
			if(params.acknowledged){
				// safely convert string to boolean....
				if(params.acknowledged === 'true'){
					showAcknowledged = true;
				} else {
					showAcknowledged = false;
				}
			}
			
			if(showAcknowledged  === true){
				searchQuery = acknowledgedQuery;
			} else {
				searchQuery = notAcknowledgedQuery
			}
				
			return callWithRequest(request, 'search', {
				index: 'alerts',
				size: 10000,
				body: {
					query: searchQuery
				}
			}).then(function(response){
				
				let initialResults = response.hits.hits;
				let rawSourceFields = initialResults.map(initialResults => { return {
					_id: initialResults._id,
					...initialResults._source
				}});
				let cleanSourceFields = []
				
				return rawSourceFields;
				
			});
			
		}
	});
}
