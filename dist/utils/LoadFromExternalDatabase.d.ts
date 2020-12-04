import EditorActionsManager from '../managers/EditorActionsManager';
export default class LoadFromExternalDatabase {
    editor: EditorActionsManager;
    constructor(editor: any);
    ndex: (uuid: any) => void;
    cx2pm: (cxJSON: any) => {
        pathway: string;
        name: any;
    };
}
