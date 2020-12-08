import EditorActionsManager from '../managers/EditorActionsManager'
import FileOperationsManager, {IPathwayInfo} from '../managers/FileOperationsManager'
import {IProfileMetaData,IPathwayData,EModalType} from '../ui/react-pathway-mapper'
import SaveLoadUtility from './SaveLoadUtility'
import {toast} from 'react-toastify';
import NGCHM from '../utils/NGCHM';
import PathwayActions from '../utils/PathwayActions'

/*
	Class to handle loading of pathways from external databases.
	There are functions for:
		- querying external databases and loading the corresponding pathway
		- converting pathway information to PathwayMapper format
*/
export default class LoadFromExternalDatabase {
	editor: EditorActionsManager
	pathwayActions: PathwayActions

	constructor(editor,pathwayActions) {
		this.editor = editor
		this.pathwayActions = pathwayActions
	}

	/*
		Function to query NDEX for a given pathway and load that pathway
		into PathwayMapper 
		
		Inputs:
			uuid: string UUID of specific pathway from NDEx
	*/
	ndex = (uuid) => {
		let url = 'http://www.ndexbio.org/v2/network/' + uuid 
		let request = new XMLHttpRequest()
		request.onreadystatechange = () => {
			if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
				let cxJSON = JSON.parse(request.responseText);
				let pmFormat = this.cx2pm(cxJSON)
				let pathwayData: IPathwayData = SaveLoadUtility.parseGraph(pmFormat['pathway'], false)
				this.editor.loadFile(pathwayData.nodes, pathwayData.edges)
				this.pathwayActions.setPathwayInfo({
					pathwayTitle: pmFormat['name'],
					pathwayDetails: pmFormat['description'],
					fileName: 'ndex_pathway.txt'
				})
				toast.success('Loaded NDEx pathway: '+pmFormat['name'], {position: 'top-left'})
			} else if (request.readyState === XMLHttpRequest.DONE && request.status != 200) {
				let jsonResponse = JSON.parse(request.response)
				toast.error('NDEx error: '+jsonResponse.message, {position: 'top-left'})
				console.error('Error getting uuid "'+uuid+'" from NDEx. NDEx error message: ' + jsonResponse.message)
			}
		}
		request.open('GET',url)
		request.setRequestHeader('Content-Type', 'application/json')
		request.send()
	}

	/* 
		Function to convert from CX format to PathwayMapper format 
		
		Inputs:
			cxJSON: Object CX object describing pathway
		Returns:
			Object with keys:
				pathway: string pathway in PathwayMapper format
				name: string name of pathway
				description: string description of pathway
	*/
	cx2pm = (cxJSON) => {
		let pathway = ''
		// get name of pathway
		let cxEntry = cxJSON.filter( n => JSON.stringify(Object.keys(n)) === JSON.stringify(['networkAttributes']))
		let networkAttributesList = cxEntry[0]['networkAttributes']
		let name = networkAttributesList.filter( e => e.n === 'name')[0]['v']
		let description = networkAttributesList.filter( e => e.n === 'description')[0]['v']
		pathway += name + '\n\n\n--NODE_NAME\tNODE_ID\tNODE_TYPE\tPARENT_ID\tPOSX\tPOSY\tWIDTH\tHEIGHT--\n'
		// get nodes of pathway
		cxEntry = cxJSON.filter( n => JSON.stringify(Object.keys(n)) === JSON.stringify(['nodes']))
		let cxNodes = cxEntry[0]['nodes']
		let nodes = [] // <-- nodes to use in pathway
		cxNodes.forEach((n) => {
			let elem = {id: n['@id'], name: n['n'], type: n['r']}
			nodes.push(elem)
		})
		// get cartesian layout
		cxEntry = cxJSON.filter( n => JSON.stringify(Object.keys(n)) === JSON.stringify(['cartesianLayout']))
		let cartesianLayoutList = cxEntry[0]['cartesianLayout']
		cartesianLayoutList.forEach((cl) => {
			nodes.forEach((n) => {
				if (n.id == cl.node) {
					n['x'] = cl['x']
					n['y'] = cl['y']
				}
			})
		})
		let width = 100; 
		let height = 20;
		nodes.forEach((n) => {
			pathway += n.name+'\t'+n.id+'\t'+n.type+'\t-1\t'+n.x+'\t'+n.y+'\t'+width+'\t'+height+'\n'
		})
		// get edges
		cxEntry = cxJSON.filter( n => JSON.stringify(Object.keys(n)) === JSON.stringify(['edges']))
		let edgesList = cxEntry[0]['edges']
		let edges = []  // <-- edges to use in pathway
		edgesList.forEach((e) => {
			let elem = {id: 'edg_'+e['@id'], source: e['s'], target: e['t']}
			edges.push(elem)
		})
		pathway += '\n--EDGE_ID\tSOURCE\tTARGET\tEDGE_TYPE\tINTERACTION_PUBMED_ID\tEDGE_NAME\tEDGE_BENDS\n'
		edges.forEach((e) => {
			pathway += e.id + '\t' + e.source + '\t' + e.target + '\t\n'
		})
		return({pathway: pathway, name: name, description: description})
	}
} // end class LaodFromExternalDatabase

