import React from 'react';
import {Modal, Button} from 'react-bootstrap';
import { EModalType } from '../react-pathway-mapper';

interface IConfirmationModalProps{
    isModalShown: boolean;
    handleClose: (modalId: EModalType) => void;
}

export default class ConfirmationModal extends React.Component<IConfirmationModalProps>{

    static pendingFunction: Function;

    constructor(props: IConfirmationModalProps){
        super(props);

    }

    render(){


        return(
            <Modal
            show={this.props.isModalShown}
            onHide={() => {this.props.handleClose(EModalType.CONFIRMATION);}}
            >
                <Modal.Header closeButton>
                <Modal.Title>
                    <h4>Confirmation</h4>
                </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>    
                    All unsaved changes will be lost. Do you want to continue?
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => {ConfirmationModal.pendingFunction(); this.props.handleClose(EModalType.CONFIRMATION);}}>Yes</Button>
                    <Button onClick={() => {this.props.handleClose(EModalType.CONFIRMATION);}}>No</Button>

                </Modal.Footer>
            </Modal>
        );
    }
}