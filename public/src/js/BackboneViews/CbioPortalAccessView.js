var CBioPortalAccessor = require('../Utils/cBioPortalAccessor.js');

var cbioPortalAccessView = Backbone.View.extend(
    {
        cachedLoadingTemplate: _.template($("#loading-small-template").html())(),
        events:
        {
            "click #getProfileData": "fetchProfileData"
        },
        initialize: function (options)
        {
            this.portalAccessor = new CBioPortalAccessor();
            this.$el.find("#cancerDropDown").append("<h4>Please Wait Loading Cancer Studies</h4>");
            this.$el.find("#cancerDropDown").append(this.cachedLoadingTemplate);
        },
        updateCancerStudies: function(cancerStudies)
        {
            this.cancerStudies = cancerStudies;
            this.updateView();
        },
        updateView: function()
        {
            var self = this;
            this.$el.find("#cancerDropDown").empty();
            this.$el.find("#dataTypeSelection").empty();
            this.$el.find("#cancerDropDown").append("<h4>Select Cancer Study</h4>");

            var cancerStudiesDropDown = $('<select  id="cancerSelectBox" class="selectpicker" title="Select a Cancer Study"></select>');

            for (var cancerName in this.cancerStudies)
            {
                cancerStudiesDropDown.append('<option key='+ cancerName +'>' +
                    this.cancerStudies[cancerName][1]
                    + '</option>');
            }

            $("#cancerDropDown").append(cancerStudiesDropDown);
            cancerStudiesDropDown.selectpicker({
                liveSearch: true,
                container: "body",
                liveSearchPlaceholder: "Search Cancer Study"
            });

            $('#cancerSelectBox').change(function ()
            {
                self.$el.find("#dataTypeSelection").empty();
                self.$el.find("#dataTypeSelection").append(self.cachedLoadingTemplate);

                var key = $(this).find("option:selected").attr('key');
                self.currenCancerStudy = self.cancerStudies[key];

                var createDataTypeSelectionCallback = function (cancerData)
                {
                    self.$el.find("#dataTypeSelection").empty();

                    //Map cancer profiles according to the profile type
                    var dataTypes = {};
                    for (var obj in cancerData)
                    {
                        var dataType = self.portalAccessor.getDataType(obj);
                        dataTypes[dataType] = cancerData[obj];
                    }

                    //Create associated UI elements
                    self.$el.find("#dataTypeSelection").append("<h4>Data Types</h4>");
                    for (var obj in dataTypes)
                    {
                        var genomicDataTypeDescription = "";
                        if (obj == "Copy Number Alteration")
                            genomicDataTypeDescription = 'Amplifications and deep deletions are used in the percentage calculation';
                        else if (obj == "Gene Expression")
                            genomicDataTypeDescription = "mRNA up and downregulation (z-score data used and&lt;br /&gt;samples" +
                                " with +/- 2) are used in the percentage calculation";
                        else if (obj == "Mutation")
                            genomicDataTypeDescription = "Mutations (any mutations: deletions/insertions, missense with" +
                                " and without&lt;br /&gt;known significance) and fusions are used in the percentage calculation";
                        var newCheckbox = $('<div class="checkbox">' + '<label>' +
                            '<input type="checkbox" cancerKey="' + dataTypes[obj][0] + '" value="" style="top:-3px">'+ obj  + '</label>' +
                                ' ' + '<span id="genomicDataTooltip" data-tooltip ="'+genomicDataTypeDescription+'"><img src="./assets/help_genomic_checkbox.svg" ' +
                            'alt="description" width="14" height="14"></span>' + '</div>');
                        newCheckbox.find('input[type="checkbox"]').on("click", function(evt)
                        {
                            var checkedNum = self.$el.find('input[type="checkbox"]:checked').length;

                            if (checkedNum >= 1)
                                self.showSubmitButton();
                            else if (checkedNum == 0)
                                self.hideSubmitButton();

                        });

                        self.$el.find("#dataTypeSelection").append(newCheckbox);
                        window.html5tooltips.refresh();
                    }
                }

                self.portalAccessor.getSupportedGeneticProfiles(key, createDataTypeSelectionCallback);

            });
        },
        render: function ()
        {
            this.hideSubmitButton();
            
            if(!this.cancerStudies)
            {
                this.$el.modal('show');
                return;
            }
            
            this.updateView();
            this.$el.modal('show');
        },
        hideSubmitButton: function()
        {
            $("#getProfileData").hide();
        },
        showSubmitButton: function()
        {
            $("#getProfileData").show();
        },
        fetchProfileData: function ()
        {
            var checkedDataTypes = this.$el.find('input[type="checkbox"]:checked');
            var geneSymbols = window.editorActionsManager.getGeneSymbols();
            
            var self = this;
            var collaborativeGroupID = window.editorActionsManager.getEmptyGroupID();

            for (var i = 0;  i < checkedDataTypes.length; i++)
            {
                self.portalAccessor.getProfileData({
                    caseSetId: self.currenCancerStudy[0],
                    geneticProfileId: $(checkedDataTypes[i]).attr('cancerkey'),
                    genes: geneSymbols
                },
                function (data)
                {
                    window.editorActionsManager.addPortalGenomicData(data, collaborativeGroupID);
                });
            }

            this.$el.modal('toggle');
        }
    });

module.exports = cbioPortalAccessView;
