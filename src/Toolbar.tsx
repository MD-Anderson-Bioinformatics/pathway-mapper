import React, { Component } from 'react';
import {Row, Col, Image} from "react-bootstrap";
import autobind from "autobind-decorator";
import EditorActionsManager from "./EditorActionsManager";
import {observer} from "mobx-react";
import {observable} from "mobx";
import PathwayActions from './PathwayActions';
// @ts-ignore
import layoutImage from "./toolbar/layout-cose.svg";
// @ts-ignore
import savePNGImage from "./toolbar/save_png.svg";
// @ts-ignore
import saveSVGImage from "./toolbar/save_svg.svg";
// @ts-ignore
const addSelImage = require("./toolbar/add-selected.svg");
// @ts-ignore
const addAllImage = require("./toolbar/add-all.svg");
// @ts-ignore
const aboutImage = require("./toolbar/about.svg");
// @ts-ignore
import openImage from "./toolbar/edit.svg";

import { IProfileMetaData, IAlterationData, EModalType } from './react-pathway-mapper';
import { toast } from 'react-toastify';

interface IToolbarProps {
  pathwayActions: PathwayActions;
  selectedPathway: string;
  alterationData: IAlterationData;
  handleOpen: (modalId: number) => void;
  queryParameter: any;
  oncoPrintTab: string;
  genes: any[];
  isValidGene: (gene: string) => boolean;
  toast: any;
  pathwayGenes: string[];
}

@observer
export default class Toolbar extends React.Component<IToolbarProps, {}>{


    @observable
    selectedGenes: string[];

    @observable
    private editor: EditorActionsManager;
    constructor(props: IToolbarProps){
      super(props);
      this.selectedGenes = [];
    }

    
    render(){


      const studyQuery = "q=" + JSON.stringify(this.props.alterationData) + "&g=" + this.props.genes.map(gene => gene.hugoGeneSymbol).join("+");
      return (
      <div id="toolbar">
          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Save as PNG" data-place="right" data-effect="solid" src={savePNGImage} onClick={() => {this.props.pathwayActions.saveAs("PNG");}}/>

          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Save as SVG" data-place="right" data-effect="solid" src={saveSVGImage} onClick={() => {this.props.pathwayActions.saveAs("SVG");}}/>

          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Perform layout" data-place="right" data-effect="solid" src={layoutImage} onClick={this.props.pathwayActions.performLayout} />              

          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Add selected genes to query" data-place="right" data-effect="solid" src={addSelImage} onClick={() => {
            this.selectedGenes = this.props.pathwayActions.getSelectedNodes()
                                                          .filter((node: any) => node.data().type === "GENE")
                                                          .map((node: any) => node.data().name as string);
            const invalidGenes: string[] = [];
            this.selectedGenes.forEach((gene: string) => {
              if(!this.props.isValidGene(gene)){
                invalidGenes.push(gene);
              }
            });

            if(invalidGenes.length === 0){

              if(this.selectedGenes.length > 0){
                this.onAddGenes();
              }
            } else {
              this.props.toast("Following gene symbols are invalid: " + invalidGenes.join(", "), {autoClose: false, position: "bottom-left"});
            }
            }}/>
            
          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Add all valid genes to query" data-place="right" data-effect="solid" src={addAllImage} onClick={() => {

            this.selectedGenes = this.props.pathwayGenes.filter((gene: string) => {
              return this.props.isValidGene(gene);
            });
            
            if(this.selectedGenes.length > 0){
              this.onAddGenes();
            }
          }}/>
          
          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Edit pathway" data-place="right" data-effect="solid" src={openImage} onClick={() => {{window.open("http://react-pathway-mapper.herokuapp.com/?pathwayName=" + this.props.selectedPathway +"&"+ studyQuery )}}}/>
          
          <img height="22px" width="22px" data-border="true" data-type="light" data-tip="Help" data-place="right" data-effect="solid" src={aboutImage} onClick={() => {console.log("Here");this.props.handleOpen(EModalType.CHELP);}}/>
          
    </div>);
  }
  @autobind
  private onAddGenes() {
      // add genes and go back to oncoprint tab
      
      (window as any).routingStore.updateRoute({
          [this.props.queryParameter]: `${(window as any).routingStore.query[this.props.queryParameter]}\n${this.selectedGenes.join(" ")}`
      },                                       `results/${this.props.oncoPrintTab}`);
  }
}
