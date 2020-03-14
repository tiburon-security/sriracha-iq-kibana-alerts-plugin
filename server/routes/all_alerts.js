/**
 * API Endpoint that returns all alerts - TODO add parameter to show/hide acknowledged alerts
 * This API doesn't paginate since there isn;t an expectation that tens of thousands of alerts
 * be generated & analyzed, i.e. this isn't intended to be a SIEM.
 */

export default function(server) {
	server.route({
		path: '/api/srirachaiq_alerts/all_alerts',
		method: 'GET',
		handler: function(request, h) {
			
			const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
			
			return callWithRequest(request, 'search', {
				index: 'alerts',
				size: 10000,
				body: {
					query: {
						match_all: {}
					}
				}
			}).then(function(response){
				
				let initialResults = response.hits.hits;
				let rawSourceFields = initialResults.map(initialResults => { return {
					_id: initialResults._id,
					...initialResults._source
				}});
				let cleanSourceFields = []
				
				for(const el of rawSourceFields){
					let newEl = {}
					let matchedBody = {}
					let objKeys = Object.keys(el)
					
					for(const objKey of objKeys){
						if(objKey.startsWith("match_body_")){
							let trimmed = objKey.substring(11);
							matchedBody[trimmed] = el[objKey]
						} else { 
							newEl[objKey] = el[objKey]
						}

						newEl["matched_document"] = matchedBody
						cleanSourceFields.push(newEl)
					}
				}
				
				return cleanSourceFields;
			});
			
		}
	});
}