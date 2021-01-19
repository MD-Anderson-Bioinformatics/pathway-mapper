import React from 'react';
import PathwayActions from '../utils/PathwayActions';
import { EModalType } from './react-pathway-mapper';
interface IMenubarProps {
    pathwayActions: PathwayActions;
    handleOpen: (modalId: EModalType) => void;
    setActiveEdge: Function;
    ngchm: any;
    pathwayReferences: any;
}
export default class Menubar extends React.Component<IMenubarProps, {}> {
    pathwayReferences: any;
    constructor(props: IMenubarProps);
    componentDidUpdate(): void;
    render(): JSX.Element;
}
export {};
