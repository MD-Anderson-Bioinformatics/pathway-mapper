// NGCHM class
//
// For interaction with NG-CHM
import autobind from 'autobind-decorator'
import EditorActionsManager from '../managers/EditorActionsManager'
import {IProfileMetaData, IPathwayData} from '../ui/react-pathway-mapper'
import {toast} from 'react-toastify';
import PathwayActions from '../utils/PathwayActions'
import {observable, autorun,toJS} from 'mobx';
import SaveLoadUtility from './SaveLoadUtility'
import _ from 'lodash';

	//////////////////////
	//
	// ColorMap module.
	//
	function ColorMap (colorMapObj) {
		this.initColorMap (colorMapObj);
	}

	ColorMap.prototype.initColorMap = (function initColorMap (colorMapObj) {
		this._type = colorMapObj["type"];
		this._thresholds = colorMapObj[this._type === "quantile" ? "linearEquiv" : "thresholds"];

		// Hex colors
		this._colors = colorMapObj["colors"];
		this._missingColor = colorMapObj["missing"];

		// RGBA colors
		if (colorMapObj["rgbaColors"] !== undefined){
			this._rgbaColors = colorMapObj["rgbaColors"];
		} else {
			this._rgbaColors = [];
			for (var i =0; i<this._thresholds.length; i++){
				this._rgbaColors[i] = hexToRgba(this._colors[i]);
			}
		}

		if (colorMapObj["rgbaMissingColor"] !== undefined){
			this._rgbaMissingColor = colorMapObj["rgbaMissingColor"];
		} else {
			this._rgbaMissingColor = hexToRgba(this._missingColor);
		}

		this._continuousMap = null;
	});

	const hexToRgbaRegEx = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
	function hexToRgba (hex) { // I didn't write this function. I'm not that clever. Thanks stackoverflow
		const rgbColor = hexToRgbaRegEx.exec(hex);
		return rgbColor ? {
			r: parseInt(rgbColor[1], 16),
			g: parseInt(rgbColor[2], 16),
			b: parseInt(rgbColor[3], 16),
			a: 255
		} : null;
	}

	function rgbToHex (r, g, b) {
		return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);

		function componentToHex(c) {
		    const hex = c.toString(16);
		    return hex.length == 1 ? "0" + hex : hex;
		}
	}

	const BYTE_PER_RGBA = 4;
	const SUMminValues = -2147483647;
	const SUMmaxValues = 2147483647;

	const continuousMapPrototype = {
		createArrays: (function createArrays() {
			// Create co-located arrays for thresholds, colors, and scales.
			// Use a single ArrayBuffer of the necessary size.  For small
			// color maps, all three arrays can fit in a single cache line.
			// (Only if the ArrayBuffer is cache-line aligned. No idea if they
			// actually do.)
			const pixelsLen = (2+this.rgbaColors.length) * BYTE_PER_RGBA;
			const threshLen = this.thresholds.length * Float32Array.BYTES_PER_ELEMENT;
			const scaleLen = (this.thresholds.length-1) * Float32Array.BYTES_PER_ELEMENT;
			const buf = new ArrayBuffer(pixelsLen + threshLen + scaleLen);

			this.missingColorIdx = this.rgbaColors.length * BYTE_PER_RGBA;
			this.cutsColorIdx = this.missingColorIdx + BYTE_PER_RGBA;

			// Calculate numeric thresholds and scale factors as 32-bit floats.
			const t32 = this.thresh32 = new Float32Array(buf,0,this.thresholds.length);
			const s32 = this.scale32 = new Float32Array(buf,threshLen,this.thresholds.length-1);
			t32[0] = +this.thresholds[0];
			for (let i = 1; i < this.thresholds.length; i++) {
				t32[i] = +this.thresholds[i];
				s32[i-1] = 1.0 / (t32[i] - t32[i-1]);
			}

			// Set threshold colors and the missing color as RGBA pixels.
			const pixels = this.rgbaPixels = new Uint8Array(buf, threshLen+scaleLen, pixelsLen);
			for (let i = 0; i < this.rgbaColors.length; i++) {
				pixels[i*BYTE_PER_RGBA  ] = this.rgbaColors[i].r;
				pixels[i*BYTE_PER_RGBA+1] = this.rgbaColors[i].g;
				pixels[i*BYTE_PER_RGBA+2] = this.rgbaColors[i].b;
				pixels[i*BYTE_PER_RGBA+3] = this.rgbaColors[i].a;
			}
			pixels[this.missingColorIdx] = this.rgbaMissingColor.r;
			pixels[this.missingColorIdx+1] = this.rgbaMissingColor.g;
			pixels[this.missingColorIdx+2] = this.rgbaMissingColor.b;
			pixels[this.missingColorIdx+3] = this.rgbaMissingColor.a;
		}),
		mapColorBlock: (function mapColorBlock (valueBuffer, cutsColor) {

			const pixels = this.rgbaPixels;
			const thresh32 = this.thresh32;
			const scale32 = this.scale32;

			if (typeof cutsColor !== 'undefined') {
				const color = hexToRgba(cutsColor);
				pixels[this.cutsColorIdx]   = color.r;
				pixels[this.cutsColorIdx+1] = color.g;
				pixels[this.cutsColorIdx+2] = color.b;
				pixels[this.cutsColorIdx+3] = color.a;
			} else {
				pixels[this.cutsColorIdx] = 255;
				pixels[this.cutsColorIdx+1] = 255;
				pixels[this.cutsColorIdx+2] = 255;
				pixels[this.cutsColorIdx+3] = 0;
			}

			const colorBlock = [];
			for (let vidx = 0; vidx < valueBuffer.length; vidx++) {
				const value = valueBuffer[vidx];
				if (value <= thresh32[0]) {
					// Set color for lowest threshold if value is below range
					// But first check it's not a cut.
					const pixidx = value <= SUMminValues ? this.cutsColorIdx : 0;
					colorBlock.push (rgbToHex (pixels[pixidx+0], pixels[pixidx+1], pixels[pixidx+2]));
				} else if (value >= thresh32[thresh32.length-1]) {
					// Set color for highest threshold if value is above range.
					// But first check it's not a missing value.
					const pixidx = value >= SUMmaxValues ? this.missingColorIdx : (thresh32.length-1) * BYTE_PER_RGBA;
					colorBlock.push (rgbToHex (pixels[pixidx+0], pixels[pixidx+1], pixels[pixidx+2]));
				} else {
					// Value is strictly between the lowest and highest thresholds.
					// Consequently, one of the following tests *must* succeed before
					// we exceed the length of the array.  No need to check.

					// Find idx such that thresholds[idx] <= value < thresholds[idx+1].
					let idx;
					if (value < thresh32[1]) { idx = 0; }      // Unwind first few loops for common case of a small map.
					else if (value < thresh32[2]) { idx = 1; }
					else if (value < thresh32[3]) { idx = 2; }
					else if (value < thresh32[4]) { idx = 3; }
					else {
						idx = 4; while (value >= thresh32[idx+1]) idx++;
					}

					// Determine proportion of colors to use.
					const pc2 = (value - thresh32[idx])*scale32[idx];
					const pc1 = 1.0 - pc2;

					const pixidx = idx * BYTE_PER_RGBA;
					const r = (pixels[pixidx  ] * pc1 + pixels[pixidx+4] * pc2)|0;
					const g = (pixels[pixidx+1] * pc1 + pixels[pixidx+5] * pc2)|0;
					const b = (pixels[pixidx+2] * pc1 + pixels[pixidx+6] * pc2)|0;
					colorBlock.push (rgbToHex (r, g, b));
				}
			}
			return colorBlock;
		})
	};

	// Return an array of hexColors corresponding to the values in valueBuffer.
	ColorMap.prototype.mapColorBlock = function mapColorBlock (valueBuffer, cutsColor) {
		if (!this._continuousMap) this._continuousMap = newContinuousMap (this._thresholds, this._rgbaColors, this._rgbaMissingColor);
		return this._continuousMap.mapColorBlock (valueBuffer, cutsColor);
	};

	// Creates (an object containing) a function that efficiently converts
	// every numeric value in an array into an array of hex colors
	// using the color map defined by the parameters and the cuts color.
	function newContinuousMap (thresholds, rgbaColors, rgbaMissingColor) {
		const cm = Object.create (continuousMapPrototype, {
			thresholds: { value: thresholds, writable: false },
			rgbaColors: { value: rgbaColors, writable: false },
			rgbaMissingColor: { value: rgbaMissingColor, writable: false }
		});
		cm.createArrays();
		return cm;
	}

	//
	// ColorMap module.
	//
	//////////////////////

	//////////////////////
	//
	// Vanodi module.
	//

	function Vanodi (options) {
		this.init (options);
		const _this = this;
		window.addEventListener('message', function (msg) {
			_this.dispatchMessage(msg);
		});
	}

	Vanodi.prototype.init = function initVanodi (options) {
		const nonce = (x => x && x.length > 1 ? x[1] : '')(/[?&]nonce=([^&;]+?)(&|#|;|$)/.exec(location.search));
		this._registerID = setInterval(function() {
			parent.postMessage({
				vanodi: Object.assign ({}, options, { op: 'register', nonce })
			}, '*');
		}, 1000);
		this.getNonce = function () { return nonce; };
	};

	Vanodi.prototype.postMessage = function postMessage (msg) {
		parent.postMessage({
			vanodi: Object.assign ({}, msg, { nonce: this.getNonce() })
		}, '*');
	};

	const listenerOps = [];
	const listenerFns = [];

	Vanodi.prototype.addMessageListener = function addMessageListener (op, fn) {
		const i = listenerOps.indexOf (op);
		if (i === -1) {
			listenerOps.push (op);
			listenerFns.push (fn);
		} else {
			listenerFns[i] = fn;
		}
	};

	Vanodi.prototype.dispatchMessage = function dispatchMessage (msg) {
		const vanodi = msg && msg.data && msg.data.vanodi;
		if (!vanodi) return;

		if (!vanodi.hasOwnProperty('nonce')) {
			console.log('vanodi message: no nonce');
			return;
		}
		if (vanodi.nonce !== this.getNonce()) {
			console.log('vanodi message: bad nonce');
			return;
		}
		if (!vanodi.hasOwnProperty('op')) {
			console.log('vanodi message: no op');
			return;
		}
		if (this._registerID != null) {
			// Host has registered us.
			// Stop trying to register.
			clearInterval(this._registerID);
			this._registerID = null;
			// Call _register listener, if any.
			const i = listenerOps.indexOf ("_register");
			if (i !== -1) listenerFns[i]();
		}
		const i = listenerOps.indexOf (vanodi.op);
		if (i !== -1) listenerFns[i](vanodi);
	};

	//
	// Vanodi module.
	//
	//////////////////////

export default class NGCHM {
	editor: EditorActionsManager
	profiles: IProfileMetaData[]
	VAN: any;
	pathwayActions: PathwayActions;
	@observable
	pathwayReferences: any;
	loadedFirstValidPathway: boolean;
	maxNodesCanDisplay: number;

	/* Function to post message to NGCHM to select heat map labels of genes selected on pathway */
	highlightSelected = () => { 
		var selectedGeneSymbols = []
		var selectedNodes = this.editor.cy.elements(':selected') // nodes selected 
		var highlightedNodes = this.editor.cy.elements().filter(ele => ele.classes().includes('highlightedNode')) // nodes already highlighted
		var nodesToPost = selectedNodes.union(highlightedNodes);
		nodesToPost.forEach(function(ele: any) {
			selectedGeneSymbols.push(ele.data().name)
		})
		var highLightInfo = {
			axis: 'row',
			pointIds: selectedGeneSymbols,
			clickType: 'standard'
		}
		this.VAN.postMessage({
			op: 'selectLabels',
			selection: highLightInfo
		})
	} // end function highlightSelected


	/* Define editor for ngchm object*/
	@autobind
	editorHandler(editor) {
		this.editor = editor;
	}

	/*
		Function to query NDEX for a given pathway and load that pathway
		into PathwayMapper.
		
		Updates pathway information in pathwayActions. 
		
		Inputs:
			uuid: string UUID of specific pathway from NDEx
	*/
	ndex = (uuid) => {
		if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
			toast.error('"'+_.escape(uuid)+'" is not a valid UUID. Cannot query NDEx', {position: 'top-left', autoClose: 10000});
			return
		}
		let url = 'http://www.ndexbio.org/v2/network/' + uuid 
		let request = new XMLHttpRequest()
		request.onreadystatechange = () => {
			if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
				let cxJSON = JSON.parse(request.responseText);
				let pmFormat = this.cx2pm(cxJSON)
				let pathwayData: IPathwayData = SaveLoadUtility.parseGraph(pmFormat['pathway'], false)
				if (pmFormat['canDisplay']) {
					this.editor.loadFile(pathwayData.nodes, pathwayData.edges)
					toast.success('Loaded NDEx pathway: '+pmFormat['name'], {position: 'top-left', autoClose: 10000})
				}
				this.pathwayActions.setPathwayInfo({
					pathwayTitle: pmFormat['name'],
					pathwayDetails: pmFormat['description'],
					fileName: pmFormat['name'].replace(/[^a-z0-9]/gi, '_').toLowerCase()
				})
				this.pathwayActions.pathwayHandler(pmFormat['name']);
			} else if (request.readyState === XMLHttpRequest.DONE && request.status != 200) {
				let jsonResponse = JSON.parse(request.response)
				toast.error('NDEx error: '+jsonResponse.message, {position: 'top-left', autoClose: 10000})
				console.error('Error getting uuid "'+uuid+'" from NDEx. NDEx error message: ' + jsonResponse.message)
			}
		}
		request.open('GET',url)
		request.setRequestHeader('Content-Type', 'application/json')
		request.send()
	}

	/* Function to get pathay summary from NDEx.
		
		Queries NDEx to get pathway summary information. The purpose is to
		get pathway names for display in the Network -> External Databse -> NDEx
		dropdown. This function updates pathwayReferences, a mobx observable,
		which triggers a re-rendering of the Menubar component.

		Inputs:
			uuid: string UUID of specific pathway from NDEx
	*/
	ndexSummary = (uuidUnescaped) => {
		let uuid = _.escape(uuidUnescaped);
		if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
			this.pathwayReferences['NDEx'][uuid] = {}
			this.pathwayReferences['NDEx'][uuid]['tooltip'] = 'NDEx UUID from NG-CHM was not valid. Cannot retrieve pathway information.'
			this.pathwayReferences['NDEx'][uuid]['name'] = uuid 
			return
		}
		let url = 'http://www.ndexbio.org/v2/network/' + uuid + '/summary'
		let request = new XMLHttpRequest()
		request.onreadystatechange = () => {
			if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
				let name = JSON.parse(request.responseText)['name']
				let nodeCount = JSON.parse(request.responseText)['nodeCount']
				this.pathwayReferences['NDEx'][uuid] = {}
				this.pathwayReferences['NDEx'][uuid]['name'] = name
				if (nodeCount > this.maxNodesCanDisplay) { 
					this.pathwayReferences['NDEx'][uuid]['tooltip'] = 'Pathway is too large to display. Pathway contains '+
						nodeCount+' nodes. The maximum is '+this.maxNodesCanDisplay+'.'
				} else if (!this.loadedFirstValidPathway) {
					this.ndex(uuid)
					this.loadedFirstValidPathway = true;
				}
			} else if (request.readyState === XMLHttpRequest.DONE && request.status != 200) {
				console.error('Error getting NDEx summary data for '+uuid)
				this.pathwayReferences['NDEx'][uuid] = {}
				this.pathwayReferences['NDEx'][uuid]['tooltip'] = 'NDEx UUID in NG-CHM was not valid. Cannot retrieve pathway information.'
				this.pathwayReferences['NDEx'][uuid]['name'] = uuid
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
		let canDisplay = true 
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
			// setting type to 'GENE' because that's the only node type recognized by PathwayMapper
			let elem = {id: n['@id'], name: n['n'], type: 'GENE'} 
			nodes.push(elem)
		})
		let maxNodes = this.maxNodesCanDisplay;
		if (nodes.length > maxNodes) {
			toast.error('Pathway ' + name + ' has too many nodes ('+nodes.length+') to display. Maximum is ' + 
				maxNodes +'.', {position: 'top-left', autoClose: 10000})
			canDisplay = false
		}
		// get cartesian layout
		try {
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
		} catch (err) {
			nodes.forEach((n) => {
				n['x'] = Math.random() * 100;
				n['y'] = Math.random() * 100;
			})
			toast.warn('Layout information not available from NDEx. Using random layout.', {position:'top-left', autoClose: 10000})
		}
		let width = 150; 
		let height = 52;
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
		return({pathway: pathway, name: name, description: description, canDisplay: canDisplay})
	}


	constructor(profiles: IProfileMetaData[], pathwayActions: PathwayActions) {
		this.pathwayActions = pathwayActions;
		var existingProfiles = [];
		var labels = null;
		var plotConfig = {};
		this.pathwayReferences = {} // References to pathways in external databases (e.g. NDEx)
		this.loadedFirstValidPathway = false;
		this.maxNodesCanDisplay = 1000; 
		const VAN = new Vanodi ({
			name: 'pathway-mapper',
			updatePolicy: 'asis',		// Choices are 'asis', 'update', or 'final'.
			axes: [
				{ axisName: 'column',
				  axisLabel: 'Group Axis',
				  group: [ { label: "Group(s)", baseid: "ugroup", min: 1, max: 2 } ]
				}
			],
			options: [
				{ label: 'Test name',
				  type: 'text',
				  default: 'test1'
				},
				{ label: 'Test to run',
				  type: 'dropdown',
				  choices: "STANDARD TESTS" }
			]
		});


		// Once registered, ask host for the axis labels and ndexUUIDs.
		VAN.addMessageListener ('_register', function () {
			VAN.postMessage ({ op: 'getLabels', axisName: 'row' });
			VAN.postMessage ({ op: 'getProperty', propertyName: 'ndexUUIDs' });
		});

		/*
			Message listener to get labels and pathway reference information from NGCHM
			
			If there is NDEx pathway reference information in the heat map (in the form of
			NDEx UUIDs separated by commas), the first of these is loaded into PathwayMapper
			(via call to this.ndex(uuid). All of them are added to the 
			Network -> External Databse -> NDEX menu (via call to this.ndexSummary(uuid)
		*/
		VAN.addMessageListener('labels', (msg) => {
			labels = msg.labels; // list of gene names
		})

		/*
			Message listener to get property. 
			
			After registration, an {op:'getProperty'} message was sent to get ndexUUIDs.
			This function processes those UUIDs 
		*/
		VAN.addMessageListener('property', (msg) => {
			if (msg.hasOwnProperty('propertyName') && msg.propertyValue != undefined ) {
				try {
					var uuidsList = _.escape(msg.propertyValue).split(',')
				} catch(err) {
					toast.error('NG-CHM contains an ndexUUIDs property, but it is not valid.',{position:'top-left',autoClose:10000})
					return;
				}
				this.pathwayReferences['NDEx'] = {} // References to pathways in NDEx
				uuidsList.forEach((uuid,idx) => {
					this.ndexSummary(uuid) // get summary from NDEx for this UUID
				})
			}
		})

		// After the user has selected the groups and options,
		// ask the host to send the test results for the known genes
		// and the user specified groups.
		// TODO: Restrict the labels to just those in the current pathway.
		VAN.addMessageListener ('plot', function (msg) {
			let axisName = (msg.config.axes[0].axisName === 'row') ? 'column' : 'row';
			VAN.postMessage({
				op: 'getTestData',
				axisName: axisName,
				axisLabels: getLabels(),
				testToRun: msg.config.options['Test to run'],
				group1: msg.data.axes[0].ugroups[0].labels[0],
				group2: msg.data.axes[0].ugroups[0].labels[1]
			});
			plotConfig = msg.config;
		});

		/* Listen for messages from NGCHM to highlight nodes on pathway.
			When user clicks labels on the NGCHM, those nodes (if present) will
			be highlighted on the pathway
		*/
		VAN.addMessageListener('makeHiLite', (msg) => {
			this.editor.removeAllHighlight() // clear existing highlights first
			var genesFromNGCHM = msg.data.pointIds.map(l => l.toUpperCase()).map(l => l.split('|')[0]);
			var allNodes = this.editor.cy.elements()
			allNodes.forEach(function(ele:any) {
				if (genesFromNGCHM.includes(ele.data().name.toUpperCase())) {
					ele.addClass('highlightedNode')
				}
			})
		})

		// Update the editor when we get the test results.
		VAN.addMessageListener ('testData', (msg) => {
			// structure of objToSend:
			//    { name1: [ {gene: geneName1, value: value1, color: hexcolor1 },
			//               {gene: geneName2, value: value2, color: hexcolor2 } ...
			//             ],
			//      name2: [ {gene: geneName1, value: value1, color: hexcolor1 },
			//               {gene: geneName2, value: value2, color: hexcolor2 } ...
			//             ]
			//       ...
			//     }
			// 'name1', 'name2' correspond to different colored boxes in the pathway map
			// (e.g. 'tvalues', 'pvalues')
			const geneNames = msg.data.labels;
			const objToSend = {};
			msg.data.results.forEach( r => {
				const label = "ngchm_" + plotConfig['options']['Test name'] + "_" + r.label;
				addDataset (label);
				const cm = new ColorMap (r.colorMap);
				const colors = cm.mapColorBlock (r.values);
				objToSend[label] = geneNames.map(function (gn,idx) {
					return { gene: gn, value: r.values[idx], color: colors[idx] };
				});
			});
			this.editor.addGenomicData(objToSend);
		});

		/* Add datasetLabel to profiles if a profile with profileId = datasetLabel is not already there.
		   If profileId is already there, give user warning that that data for that profileId was overwritten.
		   Use the same toast message as used for cBioPortal addition, but move it to left (because of gear menu)
		*/
		function addDataset (datasetLabel) {
			existingProfiles = profiles.map(pr => {return pr.profileId})
			if (existingProfiles.indexOf(datasetLabel) === -1) {
				profiles.push({profileId: datasetLabel, enabled: true, studyId: datasetLabel});
				toast.success(datasetLabel + ' successfully loaded from NG-CHM', {position: 'top-left', autoClose: 10000});
			} else {
				toast.error('Warning: Overwrote existing test name: "' + datasetLabel + '"', {position: 'top-left', autoClose: 10000});
			}
		}

		/* Function to return the gene symbols that are on the pathway */
		var getLabels = () => {
			return this.editor.getGeneSymbols();
		}

		this.VAN = VAN;
	} // end NGCHM constructor
}

