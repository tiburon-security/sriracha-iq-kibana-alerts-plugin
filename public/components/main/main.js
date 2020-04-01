import React from "react";
import {
	EuiPage,
	EuiPageHeader,
	EuiTitle,
	EuiPageBody,
	EuiPageContent,
	EuiPageContentBody,
	EuiButton,
	EuiButtonIcon,
	EuiIconTip,
	EuiDescriptionList,
	EuiInMemoryTable,
	EuiSpacer,
	EuiFlexGroup,
	EuiFlexItem,
	EuiSwitch
} from "@elastic/eui";

import { RIGHT_ALIGNMENT } from "@elastic/eui/lib/services";


/**
 * Table that displays ElastAlert's and allows for acknowledging
 */
export class Main extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			data : [],
			filters: [],
			itemIdToExpandedRowMap: {},
			selectedItems: [],
			
			// Determines whether or not to fetch new or acknowledged alerts
			showAcknowledged: false,
			
			// Key for table render state
			key: "abcd123" 
		};
		
		this.indexPatterns = {}
		
	}
	
	
	componentDidMount() {
		this.fetchIndexPatterns().then(() =>{
			this.fetchData();
		});
	}	
 
 
	/**
	 * Fetch data for the table
	 */
	fetchData(){
		fetch(`../api/srirachaiq_alerts/alerts?acknowledged=${this.state.showAcknowledged}`)
			.then(response => {
				if (!response.ok) {
					alert("Failed to fetch alerts - try refreshing the page.");
					console.error(response);
					throw "Failed to fetch alerts."
				} else {	
					return response.json();	
				}
			})
			.then(data =>{
				const prevStateAcknowledged = this.state.showAcknowledged;
			
				this.setState({ data: data }, ()=>{
					this.rerenderTable();
				});
			});	
	}


	/**
	 * Forces update of the table by regenerating it's unique key
	 */
	rerenderTable(){
		const rand = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join("");
	
		this.setState({
			key: rand
		})
	}

	
	/**
	 * Creates array mapping of ID->Title for every Kibana Index Pattern
	 */
	fetchIndexPatterns(){
		return new Promise((resolve, reject) => {
			fetch("../api/saved_objects/_find?type=index-pattern&fields=title&per_page=10000")
				.then(response => {
					if (!response.ok) {
						alert("Failed to fetch index patterns - try refreshing the page.");
						console.error(response);
						throw "Failed to fetch index patterns."
					} else {	
						return response.json();	
					}
				})
				.then(data =>{
					let indexPatternMappings = {};
					
					for(let obj of data.saved_objects){
						indexPatternMappings[obj.attributes.title] = obj.id;
					}

					this.indexPatterns = indexPatternMappings; 
					
					resolve();
				});	
		});

	};
	
	
	/**
	 * Finds the Kibana Index Pattern UUID that matches an Elasticsearch Index name
	 */
	getIndexID(elasticIndexName){
	
		let uuid = null;
	
		for(const [k, v] of Object.entries(this.indexPatterns)){
		    const patt = new RegExp(k);
		    if(patt.test(elasticIndexName)){
		        uuid = v
		        return uuid;
		    }
		}
		
		return uuid;
	}
	
	
	/**
	 * Generates convenience links to the original document highlighted in the alert
	 */
	generateKibanaLinks(id, indexPatternName, timestamp){
		
		let indexId = this.getIndexID(indexPatternName);
		
		// Expand date ranges for our context selection
		let dateObj = new Date(Date.parse(timestamp));

		let startDateObj =  new Date(dateObj.getTime());
		startDateObj.setHours("00", "00", "00", "000");
		
		let endDateObj = new Date(dateObj.getTime());
		endDateObj.setHours("23", "59", "59", "999")
		
		const documentLink = `../app/kibana#/discover?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${startDateObj.toISOString()}',to:'${endDateObj.toISOString()}'))&_a=(columns:!(_source),filters:!(),index:'${indexId}',interval:auto,query:(language:kuery,query:'_id%20:"${id}"'),sort:!(!('@timestamp',desc)))`
		const contextLink = `../app/kibana#/discover/context/${indexId}/${id}?_a=(columns:!(_source),filters:!(),predecessorCount:5,sort:!('@timestamp',desc),successorCount:5)&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${startDateObj.toISOString()}',to:'${endDateObj.toISOString()}'))`		
		
		return { documentLink, contextLink };
	}
	
	
	/**
	 * Flattens nested Object into single layer Object
	 */
	flattenObject(obj) {
		var toReturn = {};
		
		for (var i in obj) {
			if (!obj.hasOwnProperty(i)) continue;
			
			if ((typeof obj[i]) == 'object') {
				var flatObject = this.flattenObject(obj[i]);
				for (var x in flatObject) {
					if (!flatObject.hasOwnProperty(x)) continue;
					
					toReturn[i + '.' + x] = flatObject[x];
				}
			} else {
				toReturn[i] = obj[i];
			}
		}
		return toReturn;
	}


	/**
	 * Toggles display of document details in a sub-row within the table
	 */
	toggleDetails = item => {
		const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
		const builtInFields = ["_id", "_type", "_index", "@timestamp"]
		
		if (itemIdToExpandedRowMap[item._id]) {
			delete itemIdToExpandedRowMap[item._id];
		} else {

			let listItems = []
			
			listItems.push(				
				{
					title: "Timestamp",
					description: item.match_body["@timestamp"]
				},
				{
					title: "ID",
					description: item.match_body["_id"]
				},
				{
					title: "Index",
					description: item.match_body["_index"]
				}
			)
			
			for(const [key, value] of Object.entries(item.match_body)){
				
				// Strip out built-in fields
				if(!builtInFields.includes(key)){
				
					// Flatten Object of objects
					if(typeof(value) === "object"){

						let flattenedVal = this.flattenObject(value);
						
						for(const [flatKey, flatValue] of Object.entries(flattenedVal)){
							listItems.push({
								title: flatKey,
								description: flatValue
							})	
						}
					}
					else {	
						listItems.push({
							title: key,
							description: value
						})	
					}
				}
			}
						
			itemIdToExpandedRowMap[item._id] = (
				<EuiDescriptionList 
					style={{
						"maxHeight": "600px",
						"overflow": "scroll",
						"columnCount": "3",
						"width": "100%"
					}}
					listItems={listItems} />
			); 

		}
		this.setState({ itemIdToExpandedRowMap });
	};


	/**
	 * Renders a button acknowledging selected alerts
	 */
	renderAcknowledgeButton() {
		const { selectedItems } = this.state;

		if (selectedItems.length === 0) {
			return;
		}

		return (
			<EuiButton color="primary" iconType="check" onClick={this.onClickAcknowledge}>
				Acknowledge {selectedItems.length} alerts
			</EuiButton>
		);
	}


	/**
	 * Updates server & UI in response to the acknowledge button being selected
	 */
	onClickAcknowledge = () => {
		const { selectedItems } = this.state;
				
		for(let item of selectedItems){
			fetch(`../api/srirachaiq_alerts/acknowledge_alert/${item._id}`)
				.then(response => {
					if (!response.ok) {
						alert(`Failed to acknowledge alert ${item._id} - try again.`);
						console.error(response);
						throw `Failed to acknowledge alert ${item._id}.`
					} else {
						// Filter out acknowledged alerts from view			
						return this.state.data.filter(e => {
							if(e._id === item._id){
								return false;
							}
							return true;
						})
					}
				})
				
				.then(updatedData => {
					// Update UI to reflect changes
					this.setState({
						data: updatedData,
						selectedItems: [],
					}, ()=>{
						this.rerenderTable();
					});
				});
		}
		
	};
	
	
	/**
	 * Updates application state when a row is selected
	 */
	onSelectionChange = selectedItems => {
		this.setState({ selectedItems });
	};


	/**
	 * Render react component UI
	 */
	render() {

		const { title } = this.props;
	
		const columns = [
			{
				field: "alert_time",
				name: "Detection Date",
				dataType: "date",
				sortable: (item => {
					return new Date(item.match_time);
				})
			},
			{
				field: "match_time",
				name: "Event Date",
				dataType: "date",
				sortable: (item => {
					return new Date(item.match_time);
				})
			},		
			{
				field: "rule_name",
				name: "Rule",
				dataType: "string",
				sortable: true
			},			
			{
				field: "_id",
				name: "ID",
				dataType: "string",
				sortable: true
			},			
			{ 
				align: RIGHT_ALIGNMENT,
				render: item => {
					const { documentLink, contextLink } = this.generateKibanaLinks(item.match_body["_id"], item.match_body["_index"], item.match_body["@timestamp"]);
					
					return (
						<EuiFlexGroup justifyContent="flexEnd">
							<EuiFlexItem grow={false}>
								<a
									href={documentLink}
									target="_blank"
								>
									<EuiIconTip
										aria-label="View Original Document"
										type="link"
										content="View Original Document"
									/>
								</a>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								|
							</EuiFlexItem>
							
							<EuiFlexItem grow={false}>
								<a 
									href={contextLink}
									target="_blank"
								>
									<EuiIconTip
										aria-label="Context: View Surrounding Documents"
										type="bullseye"
										content="Context: View Surrounding Documents"
									/>
								</a>
							</EuiFlexItem>
						</EuiFlexGroup>
					)
				},
			},			
			{ 
				align: RIGHT_ALIGNMENT,
				width: "40px",
				isExpander: true,
				render: item => (
					<EuiButtonIcon
						onClick={() => this.toggleDetails(item)}
						aria-label={this.state.itemIdToExpandedRowMap[item._id] ? "Collapse" : "Expand"}
						iconType={this.state.itemIdToExpandedRowMap[item._id] ? "arrowUp" : "arrowDown"}
					/>
				),
			},
		];
		
	    const search = {
			box: {
				incremental: true
			}
		}	

		const selection = {
			selectable: item => !item.acknowledged,
			selectableMessage: selectable =>
				!selectable ? "Alert already acknowledged" : undefined,
			onSelectionChange: this.onSelectionChange,
		};
		
		const defaultSorting = {
			sort: {
				field: "Detection Date",
				direction: "asc",
			},
		};
		
		const pagination = {
			pageSizeOptions: [25, 50, 100, 150, 200]
		}
		
		const acknowledgeButton = this.renderAcknowledgeButton();

		return (
			<EuiPage>
				<EuiPageBody>
					<EuiPageHeader>
						<EuiTitle size="l">
							<h1>SrirachaIQ Alerts</h1>
						</EuiTitle>
					</EuiPageHeader>
					<EuiPageContent>
						<EuiPageContentBody>
							<EuiFlexGroup justifyContent="spaceBetween">
								<EuiFlexItem grow={false}>
									{acknowledgeButton}
								</EuiFlexItem>
								<EuiFlexItem grow={false} >
									<EuiSwitch
										label="Show Acknowledged Alerts"
										checked={this.state.showAcknowledged}
										onChange={() => {
										
											this.setState(prevState => ({
												showAcknowledged: !prevState.showAcknowledged,
											}), ()=>{
												this.fetchData();
											})
											
										}}
									/>
								</EuiFlexItem>
							</EuiFlexGroup>
							<EuiSpacer size="l" />
							<EuiInMemoryTable
								key={this.state.key}
								itemId="_id"
								items={this.state.data}
								columns={columns}
								pagination={pagination}
								sorting={defaultSorting}
								search={search}
								isExpandable={true}
								itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
								isSelectable={true}
								selection={selection}
							/>
						</EuiPageContentBody>
					</EuiPageContent>
				</EuiPageBody>
			</EuiPage>
		);
	}
}
