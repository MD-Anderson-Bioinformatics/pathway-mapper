import EditorActionsManager from '../managers/EditorActionsManager';
import { IProfileMetaData } from '../ui/react-pathway-mapper';
import PathwayActions from '../utils/PathwayActions';
export default class NGCHM {
    editor: EditorActionsManager;
    profiles: IProfileMetaData[];
    VAN: any;
    pathwayActions: PathwayActions;
    pathwayReferences: any;
    loadedFirstValidPathway: boolean;
    maxNodesCanDisplay: number;
    highlightSelected: () => void;
    editorHandler(editor: any): void;
    ndex: (uuid: any) => void;
    ndexSummary: (uuidUnescaped: any) => void;
    cx2pm: (cxJSON: any) => {
        pathway: string;
        name: any;
        description: any;
        canDisplay: boolean;
    };
    constructor(profiles: IProfileMetaData[], pathwayActions: PathwayActions);
}
