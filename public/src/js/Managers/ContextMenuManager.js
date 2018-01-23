;
module.exports = (function()
{
  "use strict";

  var CxtMenu = function(cy, editorActionsManager)
  {
    this.cy = cy;
    this.editorActionsManager = editorActionsManager;
    this.init();
  };

  CxtMenu.prototype.init = function() {
    var classRef = this;

    var ctxMenus = this.cy.contextMenus();

    ctxMenus.appendMenuItems(
      [
        //Context menu items when clicking on blank space
        {
            id: 'deleteSelected', // ID of menu item
            content: 'Delete Selected', // content of menu item
            // Filters the elements to have this menu item on cxttap
            // If the selector is not truthy no elements will have this menu item on cxttap
            coreAsWell: true,
            onClickFunction: function (event) {
                var selectedEles = cy.elements(':selected');
                classRef.editorActionsManager.removeElement(selectedEles);
            },
            disabled: false, // Whether the item will be created as disabled
            hasTrailingDivider: true, // Whether the item will have a trailing divider
        },
        {
            id: 'undoAction', // ID of menu item
            content: 'Undo', // content of menu item
            // Filters the elements to have this menu item on cxttap
            // If the selector is not truthy no elements will have this menu item on cxttap
            coreAsWell: true,
            onClickFunction: function (event) {
                window.undoRedoManager.undo();
            },
            disabled: false, // Whether the item will be created as disabled
            hasTrailingDivider: true, // Whether the item will have a trailing divider
        },
        {
            id: 'redoAction', // ID of menu item
            content: 'Redo', // content of menu item
            // Filters the elements to have this menu item on cxttap
            // If the selector is not truthy no elements will have this menu item on cxttap
            coreAsWell: true,
            onClickFunction: function (event) {
                window.undoRedoManager.redo();
            },
            disabled: false, // Whether the item will be created as disabled
            hasTrailingDivider: true, // Whether the item will have a trailing divider
        },
        {
            id: 'hideSelected', // ID of menu item
            content: 'Hide Selected', // content of menu item
            // Filters the elements to have this menu item on cxttap
            // If the selector is not truthy no elements will have this menu item on cxttap
            coreAsWell: true,
            onClickFunction: function (event) {
                window.editorActionsManager.hideSelectedNodes();
            },
            disabled: false, // Whether the item will be created as disabled
            hasTrailingDivider: true, // Whether the item will have a trailing divider
        },
        {
            id: 'loadFromCBioPortal', // ID of menu item
            content: 'Load From cBioPortal...', // content of menu item
            // Filters the elements to have this menu item on cxttap
            // If the selector is not truthy no elements will have this menu item on cxttap
            coreAsWell: true,
            onClickFunction: function (event) {
              window.appManager.portalAccessView.render();
            },
            disabled: false, // Whether the item will be created as disabled
            hasTrailingDivider: true, // Whether the item will have a trailing divider
        },
        {
            id: 'performLayout', // ID of menu item
            content: 'Perform Layout', // content of menu item
            // Filters the elements to have this menu item on cxttap
            // If the selector is not truthy no elements will have this menu item on cxttap
            coreAsWell: true,
            onClickFunction: function (event) {
              classRef.editorActionsManager.performLayout();
            },
            disabled: false, // Whether the item will be created as disabled
            hasTrailingDivider: true, // Whether the item will have a trailing divider
        },
        //Context menu items when clicking on nodes/compounds
        {
          id: 'remove', // ID of menu item
          content: 'Delete', // content of menu item
          // Filters the elements to have this menu item on cxttap
          // If the selector is not truthy no elements will have this menu item on cxttap
          selector: 'node, edge',
          onClickFunction: function (event) {
            var ele = event.target;
            // The function to be executed on click
            var selectedElements = cy.nodes(':selected').union(ele);
            classRef.editorActionsManager.removeElement(selectedElements);
          },
          disabled: false, // Whether the item will be created as disabled
          hasTrailingDivider: true, // Whether the item will have a trailing divider
          coreAsWell: false // Whether core instance have this item on cxttap
        },
        {
          id: 'addSelected', // ID of menu item
          content: 'Add Selected Into This', // content of menu item
          // Filters the elements to have this menu item on cxttap
          // If the selector is not truthy no elements will have this menu item on cxttap
          selector: 'node',
          onClickFunction: function (event)
          {
            var ele = event.target;
            var selectedNodes = cy.nodes(':selected');
            var containerType = ele.data('type');
            var validNodes = cy.collection();

            //Do nothing if node is GENE
            if (ele._private.data['type'] === 'GENE' || selectedNodes.size() < 1) {
              return;
            }
            //Prevent actions like adding root node to children & addition to itself
            else
            {
              var notValid = false;
              selectedNodes.forEach(function (tmpNode, i)
              {
                if (ele.id() == tmpNode.id()) {
                  notValid = true;
                  return false;
                }

                if (tmpNode.isParent()) {
                  notValid = isChildren(tmpNode, ele);
                  if (notValid) {
                    return false;
                  }
                }
              });

              if (notValid) {
                return;
              }
            }


            selectedNodes.forEach(function (tmpNode, i)
            {

              if(containerType == "FAMILY" || containerType == "COMPLEX")
              {
                if(tmpNode.data('type') != "COMPARTMENT" && tmpNode.data('type') != "PROCESS")
                {
                  validNodes = validNodes.add(tmpNode);
                }
              }
              else
              {
                validNodes = validNodes.add(tmpNode);
              }

            });

            var compId = ele.id();
            classRef.editorActionsManager.changeParents(validNodes, compId);

            //Update size of nodes according to autosize checkbox
            //Unselect and select to fix the grapple positions
            classRef.editorActionsManager.updateAutoSizeNodesToContent(cy.nodes());
            var selected = cy.elements(':selected');
            selected.unselect();
            selected.select();
          },
          disabled: false, // Whether the item will be created as disabled
          hasTrailingDivider: true, // Whether the item will have a trailing divider
          coreAsWell: false // Whether core instance have this item on cxttap
        },
        {
          id: 'removeSelected', // ID of menu item
          content: 'Remove Selected From Parent', // content of menu item
          // Filters the elements to have this menu item on cxttap
          // If the selector is not truthy no elements will have this menu item on cxttap
          selector: 'node',
          onClickFunction: function (event) {
            var ele = event.target;
            var selectedNodes = cy.nodes(':selected').union(ele);

            var notValid = false;
            selectedNodes.forEach(function (tmpNode, i) {

              if (tmpNode.isParent()) {
                notValid = isChildren(tmpNode, ele);
                if (notValid) {
                  return false;
                }
              }
            });

            if (notValid) {
              return;
            }

            classRef.editorActionsManager.changeParents(selectedNodes, null);
          },
          disabled: false, // Whether the item will be created as disabled
          hasTrailingDivider: true, // Whether the item will have a trailing divider
          coreAsWell: false // Whether core instance have this item on cxttap
        }
      ]);
    }


    //TODO ??????
    window.edgeAddingMode = false;

    //TODO better move this to another class
    //Utility function to check whether query node is children of given node
    function isChildren(node, queryNode)
    {
      var parent = queryNode.parent()[0];
      while(parent)
      {
        if (parent.id() == node.id()) {
          return true;
        }
        parent = parent.parent()[0];
      }
      return false;
    }


    return CxtMenu;

  }());
