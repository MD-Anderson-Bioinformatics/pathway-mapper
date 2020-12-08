import React from 'react';
import {Modal, MenuItem, InputGroup, Checkbox, FormControl, Button} from 'react-bootstrap';
import { observable } from 'mobx';
import autobind from 'autobind-decorator';
import { IPathwayData, IDataTypeMetaData, EModalType } from '../ui/react-pathway-mapper';
import EditorActionsManager from '../managers/EditorActionsManager'
import { observer } from 'mobx-react';
import {toast} from 'react-toastify';
import LoadFromExternalDatabase from '../utils/LoadFromExternalDatabase'
import PathwayActions from '../utils/PathwayActions'

interface INDExModalProps {
	isModalShown: boolean;
	pathwayActions: PathwayActions;
	handleClose : Function;
}

export interface INDExModal {
	pathwayToGet: string;
}

@observer
export default class NDExModal extends React.Component<INDExModalProps, {}>{
	@observable
	static ndexmodal: INDExModal;
	
	constructor(props: INDExModalProps){
		super(props);
		NDExModal.ndexmodal = {pathwayToGet: ''}
	}

	/*
		Renders dialog for user to enter an NDEx UUID. When the button is clicked, LoadFromExternalDatabase
		is used to load the corresponding NDEx pathway.
	*/
	render(){
		return(
			<Modal id="NDExModal" show={this.props.isModalShown} onHide={() => {this.props.handleClose(EModalType.NDEX); }}>
					<Modal.Header closeButton>
							<Modal.Title><h3>Query NDEx</h3></Modal.Title>
					</Modal.Header>
					<Modal.Body>
							<div>
									<label htmlFor='ndexUUID'>Enter NDEx UUID</label>
									<InputGroup>
										<FormControl id='ndexUUID' type='text' value={NDExModal.ndexmodal.pathwayToGet} 
											onChange={(e: any) => {
												NDExModal.ndexmodal.pathwayToGet = e.target.value; 
											}}
										/>
									</InputGroup>
							</div>
						<Button onClick={() => {
								let loadFromExternal = new LoadFromExternalDatabase(this.props.pathwayActions.editor, this.props.pathwayActions);
								loadFromExternal.ndex(NDExModal.ndexmodal.pathwayToGet);
								this.props.handleClose(EModalType.NDEX);
								}}>Load Pathway
						</Button>
					</Modal.Body>
				</Modal>
		);
	}
}
