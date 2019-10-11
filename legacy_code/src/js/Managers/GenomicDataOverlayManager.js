/**
 *
 */

module.exports = (function()
{
    var GenomicDataOverlayManager = function ()
    {
        this.genomicDataMap = {};
        this.visibleGenomicDataMapByType = {};
        this.groupedGenomicDataMap = {};
        this.groupedGenomicDataCount = 0;
        this.DEFAULT_VISIBLE_GENOMIC_DATA_COUNT = 3;
        this.MAX_VISIBLE_GENOMIC_DATA_COUNT = 6;


        //Observer-observable pattern related stuff
        this.observers = [];
    };

    GenomicDataOverlayManager.prototype.getEmptyGroupID = function()
    {
        var oldCount = this.groupedGenomicDataCount;
        this.groupedGenomicDataCount++;
        return oldCount;
    }

    GenomicDataOverlayManager.prototype.addGenomicDataLocally = function(genomicData, groupID)
    {
        this.parseGenomicData(genomicData, groupID);
        this.showGenomicData();
        this.notifyObservers();
    };

    GenomicDataOverlayManager.prototype.preparePortalGenomicDataShareDB = function(genomicData)
    {
        var geneMap = {};
        var visMap = {};

        for (var cancerKey in genomicData)
        {
            for (var geneSymbol in genomicData[cancerKey])
            {
                geneMap[geneSymbol] = {};
                geneMap[geneSymbol][cancerKey] = genomicData[cancerKey][geneSymbol];
            }

            visMap[cancerKey]  = true;
        }

        return {
            'genomicDataMap': geneMap,
            'visibilityMap': visMap
        };
    };

    GenomicDataOverlayManager.prototype.removeGenomicData = function()
    {
        this.genomicDataMap = {};
    }

    GenomicDataOverlayManager.prototype.addGenomicData = function(data)
    {
        this.genomicDataMap = data;
    }

    GenomicDataOverlayManager.prototype.removeGenomicVisData = function()
    {
        this.visibleGenomicDataMapByType = {};
    }

    GenomicDataOverlayManager.prototype.addGenomicData = function(geneSymbol, data)
    {
        this.genomicDataMap[geneSymbol] = data;
    }

    GenomicDataOverlayManager.prototype.addGenomicGroupData = function(groupID, data)
    {
        this.groupedGenomicDataMap[groupID] = data;
    }

    GenomicDataOverlayManager.prototype.addPortalGenomicData = function(data, groupID)
    {
        for (var cancerStudy in data)
        {
            this.visibleGenomicDataMapByType[cancerStudy] = true;

            //Group current cancer study according to the groupID
            if(this.groupedGenomicDataMap[groupID] == undefined)
                this.groupedGenomicDataMap[groupID] = [];

            this.groupedGenomicDataMap[groupID].push(cancerStudy);


            var cancerData = data[cancerStudy];

            for (var geneSymbol in cancerData)
            {
                if (this.genomicDataMap[geneSymbol] == undefined)
                    this.genomicDataMap[geneSymbol] = {};

                this.genomicDataMap[geneSymbol][cancerStudy] = data[cancerStudy][geneSymbol].toFixed(2);
            }
        }

        this.showGenomicData();
        this.notifyObservers();
    }

    GenomicDataOverlayManager.prototype.clearAllGenomicData = function()
    {
        this.genomicDataMap = {};
        this.visibleGenomicDataMapByType = {};
        this.groupedGenomicDataMap = {};
        this.groupedGenomicDataCount = 0;
    }

    GenomicDataOverlayManager.prototype.removeGenomicData = function(geneSymbol)
    {
        this.genomicDataMap[geneSymbol] = {};
    }

    GenomicDataOverlayManager.prototype.addGenomicVisData = function(key, data)
    {
        this.visibleGenomicDataMapByType[key] = data;
    };

    GenomicDataOverlayManager.prototype.prepareGenomicDataShareDB = function(genomicData)
    {
        var genomicDataMap = {};
        var cancerTypes = [];
        var visibleGenomicDataMapByType = {};

        // By lines
        var lines = genomicData.split('\n');
        //First line is meta data !
        var metaLineColumns = lines[0].split('\t');

        //Parse cancer types
        for (var i = 1;  i < metaLineColumns.length; i++)
        {
            cancerTypes.push(metaLineColumns[i]);
            //Update initially visible genomic data boxes !
            if(i-1 < this.DEFAULT_VISIBLE_GENOMIC_DATA_COUNT)
                visibleGenomicDataMapByType[cancerTypes[i-1]] = true;
            else
                visibleGenomicDataMapByType[cancerTypes[i-1]] = false;
        }

        // parse genomic data
        for(var i =1; i < lines.length; i++)
        {
            //EOF check
            if (lines[i].length == 0)
                break;

            //Split each line by tab and parse genomic data content
            var lineContent = lines[i].split('\t');
            var geneSymbol = lineContent[0];

            //If current gene entry is not  in genomic data map create new hashmap entry
            if(!(geneSymbol in genomicDataMap))
                genomicDataMap[geneSymbol] = {};

            //Add each entry of genomic data
            for (var j = 1; j < lineContent.length; j++)
            {
                genomicDataMap[geneSymbol][cancerTypes[j-1]] = lineContent[j];
            }
        }

        var returnObj =
        {
            'genomicDataMap': genomicDataMap,
            'visibilityMap': visibleGenomicDataMapByType
        };

        return returnObj;

    };

    GenomicDataOverlayManager.prototype.updateGenomicDataVisibility = function(_key, isVisible)
    {
        if(_key in this.visibleGenomicDataMapByType)
            this.visibleGenomicDataMapByType[_key] = isVisible;
    };

    GenomicDataOverlayManager.prototype.hideGenomicData = function()
    {
        cy.style()
            .selector('node[type="GENE"]')
            .style('text-margin-y', 0)
            .style('width', function (ele)
            {
                return 150;
            })
            .style('background-image', function(ele)
            {
                var dataURI = "data:image/svg+xml;utf8,";
                return dataURI;
            })
            .update();
    };

    GenomicDataOverlayManager.prototype.countVisibleGenomicDataByType = function()
    {
        //Count the genomic data that will be displayed on nodes' body
        var genomicDataBoxCount = 0;
        for (var cancerType in this.visibleGenomicDataMapByType)
        {
            if(this.visibleGenomicDataMapByType[cancerType])
                genomicDataBoxCount++;
        }
        return genomicDataBoxCount;
    };

    GenomicDataOverlayManager.prototype.generateSVGForNode = function(ele)
    {
        var genomicDataBoxCount = this.countVisibleGenomicDataByType();

        //Experimental data overlay part !
        var dataURI = "data:image/svg+xml;utf8,";
        var svgNameSpace = 'http://www.w3.org/2000/svg';
        var nodeLabel = ele.data('name');

        //If there is no genomic data for this node return !
        if(!(nodeLabel in this.genomicDataMap))
            return dataURI;

        var eleBBox = ele.boundingBox();
        var reqWidth = getRequiredWidthForGenomicData(genomicDataBoxCount);
        var overlayRecBoxW = reqWidth - 10;
        var overlayRecBoxH = 25;
        var svg = document.createElementNS(svgNameSpace,'svg');
        //It seems this should be set according to the node size !
        svg.setAttribute('width', reqWidth);
        svg.setAttribute('height', eleBBox.h);
        //This is important you need to include this to succesfully render in cytoscape.js!
        svg.setAttribute('xmlns', svgNameSpace);

        //Overlay Data Rect
        var overLayRectBBox =
        {
            w: overlayRecBoxW,
            h: overlayRecBoxH,
            x: reqWidth/2 - overlayRecBoxW/2,
            y: eleBBox.h/2 + overlayRecBoxH/2 - 18
        };

        var genomicFrequencyData = this.genomicDataMap[nodeLabel];

        var maxGenomicDataBoxCount = /*(genomicDataBoxCount > 3) ? 3:*/genomicDataBoxCount;
        var genomicBoxCounter = 0;


        for (var i in this.groupedGenomicDataMap)
        {
            for (var j in this.groupedGenomicDataMap[i])
            {
                var cancerType = this.groupedGenomicDataMap[i][j];
                if(!this.visibleGenomicDataMapByType[cancerType])
                    continue;

                if(genomicFrequencyData[cancerType] != undefined)
                {
                    genomicDataRectangleGenerator(
                        overLayRectBBox.x + genomicBoxCounter * overLayRectBBox.w/maxGenomicDataBoxCount,
                        overLayRectBBox.y,
                        overLayRectBBox.w/maxGenomicDataBoxCount,
                        overLayRectBBox.h,
                        genomicFrequencyData[cancerType],
                        svg
                    );
                }
                else
                {
                    genomicDataRectangleGenerator(
                        overLayRectBBox.x + genomicBoxCounter * overLayRectBBox.w/maxGenomicDataBoxCount,
                        overLayRectBBox.y,
                        overLayRectBBox.w/maxGenomicDataBoxCount,
                        overLayRectBBox.h,
                        null,
                        svg
                    );
                }

                genomicBoxCounter++;
            }
        }


        function genomicDataRectangleGenerator(x,y,w,h,percent,parentSVG)
        {
            if(percent)
            {
                var isNegativePercent = (percent < 0);
                var _percent = Math.abs(percent);
                //Handle special cases here !
                _percent = (_percent < 0.5) ? 2 : _percent;
                _percent =  (_percent == 1) ? 2 : _percent;
                //Here we are using non linear regression
                //Fitting points of (0,0), (25,140), (50,220), (100, 255)
                var percentColor =  255 - (-7.118 + 53.9765 * Math.log(_percent));

                var colorString = "";
                if(percent == 0)
                {
                    colorString = "rgb(255,255,255)";
                }
                else if (isNegativePercent)
                {
                    colorString = "rgb("+Math.round(percentColor)+","+Math.round(percentColor)+",255)";
                    percent = percent.substring(1);
                }
                else
                    colorString = "rgb(255,"+Math.round(percentColor)+","+Math.round(percentColor)+")";

                //Rectangle Part
                var overlayRect = document.createElementNS(svgNameSpace, 'rect');
                overlayRect.setAttribute('x', x);
                overlayRect.setAttribute('y', y );
                overlayRect.setAttribute('width', w);
                overlayRect.setAttribute('height', h);
                overlayRect.setAttribute('style', "stroke-width:1;stroke:rgb(0,0,0);opacity:1;fill:"+colorString+";");

                //Text Part
                var textPercent = (percent < 0.5 && percent > 0) ? '<0.5': Number(percent).toFixed(1);
                var text = textPercent+'%';
                var fontSize = 14;
                var textLength = text.length;
                var xOffset = w/2 - textLength * 4;
                var yOffset = fontSize/3;

                var svgText = document.createElementNS(svgNameSpace, 'text');
                svgText.setAttribute('x', x + xOffset );
                svgText.setAttribute('y', y + h/2 + yOffset );
                svgText.setAttribute('font-family', 'Arial');
                svgText.setAttribute('font-size', fontSize);
                svgText.innerHTML = text;

                parentSVG.appendChild(overlayRect);
                parentSVG.appendChild(svgText);
            }
            else
            {

                colorString = "rgb(210,210,210)";

                //Rectangle Part
                var overlayRect = document.createElementNS(svgNameSpace, 'rect');
                overlayRect.setAttribute('x', x);
                overlayRect.setAttribute('y', y );
                overlayRect.setAttribute('width', w);
                overlayRect.setAttribute('height', h);
                overlayRect.setAttribute('style', "stroke-width:1;stroke:rgb(0,0,0);opacity:1;fill:"+colorString+";");

                parentSVG.appendChild(overlayRect);
            }
        }

        return svg;
    };


    //Just an utility function to calculate required width for genes for genomic data !
    function getRequiredWidthForGenomicData(genomicDataBoxCount)
    {
        var term = (genomicDataBoxCount > 3) ? genomicDataBoxCount-3:0;
        return 150 + term * 35;
    }

    GenomicDataOverlayManager.prototype.showGenomicData = function()
    {
        var self = this;

        var genomicDataBoxCount = this.countVisibleGenomicDataByType();

        if (genomicDataBoxCount < 1)
        {
            //Hide all genomic data and return
            this.hideGenomicData();
            return;
        }

        cy.style()
            .selector('node[type="GENE"]')
                //It used to change the width of nodes only locally
            // .style('width', function (ele)
            // {
            //     return getRequiredWidthForGenomicData(genomicDataBoxCount);
            // })
            .style('text-margin-y', function (ele)
            {
                var nodeLabel = ele.data('name');
                //If there is no genomic data for this node return !
                if(!(nodeLabel in self.genomicDataMap))
                    return 0;

                //Else shift label in Y axis
                return -15;
            })
            .style('background-image', function(ele)
            {
                var dataURI = "data:image/svg+xml;utf8,";
                return dataURI + encodeURIComponent(self.generateSVGForNode(ele).outerHTML);
            })
            .update();
    }

    GenomicDataOverlayManager.prototype.parseGenomicData = function(genomicData, groupID)
    {
        this.genomicDataMap = this.genomicDataMap || {};
        this.visibleGenomicDataMapByType = this.visibleGenomicDataMapByType || {};
        this.groupedGenomicDataMap = this.groupedGenomicDataMap || {};
        var cancerTypes =  [];

        // By lines
        var lines = genomicData.split('\n');
        //First line is meta data !
        var metaLineColumns = lines[0].split('\t');

        //Parse cancer types
        for (var i = 1;  i < metaLineColumns.length; i++)
        {
            cancerTypes.push(metaLineColumns[i]);
            //Update initially visible genomic data boxes !
            if(i-1 < this.DEFAULT_VISIBLE_GENOMIC_DATA_COUNT)
                this.visibleGenomicDataMapByType[cancerTypes[i-1]] = true;
            else
                this.visibleGenomicDataMapByType[cancerTypes[i-1]] = false;

            if(this.groupedGenomicDataMap[groupID] == undefined)
                this.groupedGenomicDataMap[groupID] = [];

            this.groupedGenomicDataMap[groupID].push(cancerTypes[i-1]);
        }

        // parse genomic data
        for(var i =1; i < lines.length; i++)
        {
            //EOF check
            if (lines[i].length == 0)
                break;

            //Split each line by tab and parse genomic data content
            var lineContent = lines[i].split('\t');
            var geneSymbol = lineContent[0];

            //If current gene entry is not  in genomic data map create new map
            if(!(geneSymbol in this.genomicDataMap))
                this.genomicDataMap[geneSymbol] = {};

            //Add each entry of genomic data
            for (var j = 1; j < lineContent.length; j++)
            {
                this.genomicDataMap[geneSymbol][cancerTypes[j-1]] = lineContent[j];
            }
        }
    };

    //Simple observer-observable pattern for views!!!!!
    GenomicDataOverlayManager.prototype.registerObserver = function(observer)
    {
        this.observers.push(observer);
    };

    GenomicDataOverlayManager.prototype.notifyObservers = function()
    {
        for (var i in this.observers)
        {
            var observer = this.observers[i];
            observer.notify();
        }
    };

    return GenomicDataOverlayManager;

})();
