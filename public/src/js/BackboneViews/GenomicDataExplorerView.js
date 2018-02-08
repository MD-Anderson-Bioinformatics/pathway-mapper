
var genomicDataExplorer = Backbone.View.extend(
    {
        cachedTpl: _.template($("#genomicDataExplorerTemplate").html()),
        events:
        {
            'click #save-genomic': 'saveHandler',
        },
        initialize: function (options)
        {
            this.$el.append(this.cachedTpl());
            this.editorActionsManagerRef = options.editorActionsManager;
            this.editorActionsManagerRef.registerGenomicDataObserver(this);
            this.renderEmptyView();
        },
        render: function ()
        {
        },
        renderEmptyView: function()
        {
            this.$el.find('.genomicDataContentDiv').append('<h4 class="modal-title">There is currently no data to show</h4>');
            this.$el.find('#save-genomic').hide();
        },
        saveHandler: function(event)
        {
            var dataMap = {};
            this.$el.find('.genomicDataContentDiv label').each(function ()
            {
                var jqEl = $(this);
                var cancerType = jqEl.text();
                var isChecked = jqEl.find('input').is(':checked');
                dataMap[cancerType] = isChecked;
            });
            this.editorActionsManagerRef.updateGenomicDataVisibility(dataMap);
            this.$el.modal('toggle');
        },
        //For observer observable pattern
        notify: function(data)
        {
            this.$el.find('.genomicDataContentDiv').empty();

            var cancerTypes = this.editorActionsManagerRef.genomicDataOverlayManager.visibleGenomicDataMapByType;
            var sortedKeys = _.keys(this.editorActionsManagerRef.genomicDataOverlayManager.visibleGenomicDataMapByType).sort();
            if(cancerTypes && Object.keys(cancerTypes).length === 0)
            {
                this.renderEmptyView();
            }
            else
            {
                this.$el.find('.genomicDataContentDiv').append('<h4 class="modal-title">Data Set To Show:</h4>');
                var checkboxDiv = $('<div class="genomicChecboxDiv"></div>');
                for (var sortedIndex in sortedKeys)
                {
                    //TODO check for 6
                    var checkboxContent = $('<label class="checkbox"><input type="checkbox" value="">'+sortedKeys[sortedIndex]+'</label>');
                    checkboxContent.find('input').attr('checked', cancerTypes[sortedKeys[sortedIndex]]);
                    checkboxDiv.append(checkboxContent);
                }
                this.$el.find('.genomicDataContentDiv').append(checkboxDiv);
                this.$el.find('#save-genomic').show();
            }
        }
    });

module.exports = genomicDataExplorer;
