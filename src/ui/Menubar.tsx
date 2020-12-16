import React from 'react';
import {Navbar, Nav, NavDropdown, MenuItem, NavItem} from 'react-bootstrap';
import pathways from "../data/pathways.json";
import PathwayActions from '../utils/PathwayActions';
import autobind from 'autobind-decorator';
import SaveLoadUtility from '../utils/SaveLoadUtility';
import { EModalType } from './react-pathway-mapper';
import ConfirmationModal from '../modals/ConfirmationModal';
import {observer} from 'mobx-react';
import {observable,computed} from 'mobx';

interface IMenubarProps{
    pathwayActions: PathwayActions;
    handleOpen: (modalId: EModalType) => void;
    setActiveEdge: Function;
    ngchm: any;
    pathwayReferences: any;
}


@observer
export default class Menubar extends React.Component<IMenubarProps, {}>{


        @observable
        pathwayReferences: any;
    constructor(props: IMenubarProps){
        super(props);

  }

    render(){
        const nodeTypes = ["Gene", "Family", "Complex", "Compartment", "Process"];
        const edgeTypes = ["Activates", "Inhibits", "Induces", "Represses", "Binds"];

        const pathwayDropdownData: {[pwHead: string]: string[]} = {};
        for(const pwName of Object.keys(pathways)){
          // If a pathway name ain't include 'pathway' word then it is under pancanatlas.
          const isPancanatlas = !pwName.includes('pathway');
          const dashPos = pwName.indexOf('-');
          const pwHead = (isPancanatlas) ? 'PanCanAtlas' : pwName.substring(0, dashPos);
          if(pwHead in pathwayDropdownData){
            pathwayDropdownData[pwHead].push(pwName);
          } else {
            pathwayDropdownData[pwHead] = [pwName];
          }
        }

        return(
            <Navbar className="pathway-navbar">
              <Nav>
                <NavDropdown eventKey={1} title="Network" id="basic-nav-network">
                  <MenuItem eventKey={1.1} onClick={this.props.pathwayActions.newPathway}>New</MenuItem>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.handleOpen(EModalType.PW_DETAILS);}}>Properties...</MenuItem>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.upload();}}>Import</MenuItem>
                  <NavDropdown className="dropdown-submenu" eventKey={1} title="TCGA" id="basic-nav-TCGA">
                    {
                      Object.keys(pathwayDropdownData).map((pwHead) => {
                          return (
                            <NavDropdown id={pwHead + "_dropdown"} className="dropdown-submenu" eventKey={1} title={pwHead}>
                              
                              {
                                pathwayDropdownData[pwHead].map((pwName) => 
                                <MenuItem onClick={() => {

                                    if(this.props.pathwayActions.doesCyHaveElements()){
                                      this.props.handleOpen(EModalType.CONFIRMATION);
                                      ConfirmationModal.pendingFunction = () => {this.props.pathwayActions.changePathway(pwName);};
                                    } else {
                                      this.props.pathwayActions.changePathway(pwName);
                                    }
                                }
                                }>
                                  {pwName.split('-').join(" ")}
                                </MenuItem>
                                )
                              }
                              
                            </NavDropdown>);
                      })
                    }
                  </NavDropdown>
                  <NavDropdown className="dropdown-submenu" eventKey={1} title="External Database" id="basic-nav-External">
                        { 
                            /* Add a sub-menu item for each external database (e.g. 'NDEx') */
                          Object.keys(this.props.pathwayReferences).map((database) => {
                            return (
                               <NavDropdown id={database+"_dropdown"} className="dropdown-submenu" eventKey={1} title={database}>
                                  {
                                     /* Add entry for each pathway in that database. Clicking on entry loads the pathway. */
                                     Object.keys(this.props.pathwayReferences[database]).map((uuid) => 
                                       <MenuItem onClick={() => {
                                           if (this.props.pathwayActions.doesCyHaveElements()) {
                                            this.props.handleOpen(EModalType.CONFIRMATION);
                                            ConfirmationModal.pendingFunction = () => {this.props.ngchm.ndex(uuid)}
                                           } else {
                                            this.props.ngchm.ndex(uuid)
                                           }
                                         }}>{this.props.pathwayReferences[database][uuid]}
                                       </MenuItem>
                                     )
                                   }
                                  
                               </NavDropdown>);
                          })
                        }
                  </NavDropdown>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.merge();}}>Merge With...</MenuItem>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.export(false);}}>Export</MenuItem>
                  <NavDropdown className="dropdown-submenu" eventKey={1} title="Export as" id="basic-nav-export">
                    <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.saveAs("JPEG");}}>JPEG</MenuItem>
                    <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.saveAs("PNG");}}>PNG</MenuItem>
                    <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.saveAs("SVG");}}>SVG</MenuItem>
                    <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.export(true);}}>SIFNX</MenuItem>
                  </NavDropdown>
                </NavDropdown>

                <NavDropdown eventKey={2} title="Edit" id="basic-nav-edit">
                  <NavDropdown id="add-node-submenu" className="dropdown-submenu" eventKey={2.1} title="Add Node">
                      {
                        nodeTypes.map((nodeType) => {
                        return (<MenuItem onClick={() => {this.props.pathwayActions.addNode(nodeType);}}>
                        {nodeType}
                      </MenuItem>);} )
                      }
                  </NavDropdown>
                  <NavDropdown id="add-edge-submenu" className="dropdown-submenu" eventKey={2.1} title="Add Edge">
                      {
                        edgeTypes.map((nodeType, i) => {
                        return (<MenuItem 
                          onClick={
                          () => {
                            this.props.pathwayActions.addEdge(i);
                            this.props.setActiveEdge(i);
                          }}>
                        {nodeType}
                      </MenuItem>);} )
                      }
                  </NavDropdown>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.deleteSelected();}}>Delete Selected</MenuItem>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.resizeToContent();}}>Resize Nodes to Content</MenuItem>

                  { !this.props.pathwayActions.isCollaborative && 
                  [<MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.undo();}}>Undo</MenuItem>,
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.redo();}}>Redo</MenuItem>]
                  }
                </NavDropdown>
                <NavDropdown eventKey={3} title="View" id="basic-nav-view">
                  <NavDropdown id="align-view-submenu" className="dropdown-submenu" eventKey={2.1} title="Align Selected">
                    <NavDropdown id="align-vertical-submenu" className="dropdown-submenu" eventKey={2.1} title="Vertical">
                      <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.align("vLeft");}}>Left</MenuItem>
                      <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.align("vCen");}}>Center</MenuItem>
                      <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.align("vRight");}}>Right</MenuItem>
                    </NavDropdown>
                    <NavDropdown id="align-horizontal-submenu" className="dropdown-submenu" eventKey={2.1} title="Horizontal">
                      <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.align("hTop");}}>Top</MenuItem>
                      <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.align("hMid");}}>Middle</MenuItem>
                      <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.align("hBot");}}>Bottom</MenuItem>
                    </NavDropdown>
                  </NavDropdown>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.handleOpen(EModalType.GRID);}}>Grid...</MenuItem>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.hideSelected();}}>Hide Selected Nodes</MenuItem>
                  <MenuItem eventKey={1.1} onClick={() => {this.props.pathwayActions.showAll();}}>Show All Nodes</MenuItem>
                </NavDropdown>
                <NavDropdown eventKey={4} title="Highlight" id="basic-nav-highlight">
                  <MenuItem eventKey={4.1} onClick={() => {this.props.pathwayActions.highlightSelected();
                     this.props.ngchm.highlightSelected();}}>Highlight Selected</MenuItem>
                  <MenuItem eventKey={4.1} onClick={this.props.pathwayActions.highlightNeighbours}>Highlight Neighbors Of Selected</MenuItem>
                  <MenuItem eventKey={4.1} onClick={this.props.pathwayActions.validateGenes}>Identify Invalid Genes</MenuItem>
                  <MenuItem eventKey={4.1} onClick={() => {this.props.pathwayActions.removeAllHighlight();
                     this.props.pathwayActions.highlightSelected();}}>Remove All Highlights</MenuItem>
                </NavDropdown>
                <NavDropdown eventKey={5} title="Alteration %" id="basic-nav-alteration">
                  <MenuItem eventKey={5.1} onClick={() => {this.props.pathwayActions.uploadOverlay();}}>Load From File...</MenuItem>
                  <MenuItem eventKey={5.1} onClick={this.props.pathwayActions.loadSampleData}>Load Sample Data</MenuItem>
                  <MenuItem eventKey={5.1} onClick={ () => {this.props.handleOpen(EModalType.STUDY);}}>Load cBioPortal Data...</MenuItem>
                  <MenuItem eventKey={5.1} onClick={ () => {this.props.handleOpen(EModalType.PROFILES);}}>View Settings...</MenuItem>
                  <MenuItem eventKey={5.1} onClick={this.props.pathwayActions.removeAllData}>Remove All Data</MenuItem>
                </NavDropdown>
                <NavDropdown eventKey={6} title="Layout" id="basic-nav-layout">
                  <MenuItem eventKey={6.1} onClick={this.props.pathwayActions.performLayout}>Perform Layout</MenuItem>
                  <MenuItem eventKey={6.1} onClick={() => {this.props.handleOpen(EModalType.LAYOUT);}}>Layout Properties...</MenuItem>
                </NavDropdown>
                <NavDropdown eventKey={7} title="Help" id="basic-nav-help">
                  <MenuItem eventKey={7.1} onClick={ () => {this.props.handleOpen(EModalType.HELP);}}>Quick Help</MenuItem>
                  <MenuItem eventKey={7.1} onClick={ () => {window.open("https://github.com/iVis-at-Bilkent/pathway-mapper");}}>How To Use</MenuItem>
                  <MenuItem eventKey={7.1} onClick={ () => {this.props.handleOpen(EModalType.ABOUT);}}>About</MenuItem>
                </NavDropdown>
              </Nav>
              <Nav pullRight>
                <Navbar.Brand>
                  <a href="#">PathwayMapper</a>
                </Navbar.Brand>
              </Nav>
            </Navbar>
        );
    }

}
