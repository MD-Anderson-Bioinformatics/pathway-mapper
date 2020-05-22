import EditorActionsManager from '../managers/EditorActionsManager';
import { IProfileMetaData } from '../ui/react-pathway-mapper';
export default class NGCHM {
    editor: EditorActionsManager;
    profiles: IProfileMetaData[];
    VAN: any;
    highlightSelected: () => void;
    editorHandler(editor: any): void;
    constructor(profiles: IProfileMetaData[]);
}
