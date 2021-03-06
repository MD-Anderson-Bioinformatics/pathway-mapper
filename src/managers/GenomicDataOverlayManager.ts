export default class GenomicDataOverlayManager {
  public genomicDataMap: {}
  public visibleGenomicDataMapByType: {}
  public groupedGenomicDataCount: number
  public groupedGenomicDataMap: {}
  private DEFAULT_VISIBLE_GENOMIC_DATA_COUNT: number
  private MAX_VISIBLE_GENOMIC_DATA_COUNT: number
  private observers: any[]
  private cy: any
  constructor(cy: any) {
    this.cy = cy
    this.genomicDataMap = {}
    this.visibleGenomicDataMapByType = {}
    this.groupedGenomicDataMap = {}
    this.groupedGenomicDataCount = 0
    this.DEFAULT_VISIBLE_GENOMIC_DATA_COUNT = 3
    this.MAX_VISIBLE_GENOMIC_DATA_COUNT = 6

    // Observer-observable pattern related stuff
    this.observers = []
  }

  getEmptyGroupID() {
    const oldCount = this.groupedGenomicDataCount
    this.groupedGenomicDataCount++
    return oldCount
  }

  /*
     Function to return genomic data group id of group containing all keys.
 
     This is for use when the user wants to overwrite the data in a previously
     existing genomic data group. (e.g. if the user is pulling data from an NGCHM)
  */
  findMatchingGroup (keys) {
    for (let i = 0; i < this.groupedGenomicDataCount; i++) {
      var matches = true;
      const k2 = this.groupedGenomicDataMap[i];
      for (let j = 0; j < keys.length; j++) {
        if (k2.indexOf(keys[j]) === -1) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return i;
      }
    }
    return null;
  }

  addGenomicDataLocally(genomicData, groupID) {
    this.parseGenomicData(genomicData, groupID)
    this.showGenomicData()
    this.notifyObservers()
  }

  preparePortalGenomicDataShareDB(genomicData) {
    const geneMap = {}
    const visMap = {}

    for (const cancerKey in genomicData) {
      for (const geneSymbol in genomicData[cancerKey]) {
        geneMap[geneSymbol] = {}
        geneMap[geneSymbol][cancerKey] = genomicData[cancerKey][geneSymbol]
      }

      visMap[cancerKey] = true
    }

    return {
      genomicDataMap: geneMap,
      visibilityMap: visMap
    }
  }

  addGenomicData(data) {
    this.genomicDataMap = data
  }

  removeGenomicVisData() {
    this.visibleGenomicDataMapByType = {}
  }

  addGenomicDataWithGeneSymbol(geneSymbol, data) {
    this.genomicDataMap[geneSymbol] = data
  }

  addGenomicGroupData(groupID, data) {
    this.groupedGenomicDataMap[groupID] = data
  }

  addPortalGenomicData(data, groupID) {
    for (const cancerStudy of Object.keys(data)) {
      this.visibleGenomicDataMapByType[cancerStudy] = true

      // Group current cancer study according to the groupID
      if (this.groupedGenomicDataMap[groupID] === undefined) {
        this.groupedGenomicDataMap[groupID] = []
      }

      this.groupedGenomicDataMap[groupID].push(cancerStudy)

      var cancerData = data[cancerStudy]

      for (const geneSymbol of Object.keys(cancerData)) {
        if (this.genomicDataMap[geneSymbol] === undefined)
          this.genomicDataMap[geneSymbol] = {}

        this.genomicDataMap[geneSymbol][cancerStudy] = data[cancerStudy][
          geneSymbol
        ].toFixed(2)
      }
    }

    this.showGenomicData()
    this.notifyObservers()
  }

  clearAllGenomicData = function() {
    this.genomicDataMap = {}
    this.visibleGenomicDataMapByType = {}
    this.groupedGenomicDataMap = {}
    this.groupedGenomicDataCount = 0
  }

  removeGenomicData() {
    this.genomicDataMap = {}
  }

  removeGenomicDataWithGeneSymbol(geneSymbol) {
    this.genomicDataMap[geneSymbol] = {}
  }

  addGenomicVisData(key, data) {
    this.visibleGenomicDataMapByType[key] = data
  }

  prepareGenomicDataShareDB = function(genomicData) {
    const genomicDataMap = {}
    const cancerTypes = []
    const visibleGenomicDataMapByType = {}

    // By lines
    const lines = genomicData.split('\n')
    // First line is meta data !
    const metaLineColumns = lines[0].split('\t')

    // Parse cancer types
    for (let i = 1; i < metaLineColumns.length; i++) {
      cancerTypes.push(metaLineColumns[i])
      // Update initially visible genomic data boxes !
      if (i - 1 < this.DEFAULT_VISIBLE_GENOMIC_DATA_COUNT) {
        visibleGenomicDataMapByType[cancerTypes[i - 1]] = true
      } else {
        visibleGenomicDataMapByType[cancerTypes[i - 1]] = false
      }
    }

    // parse genomic data
    for (let i = 1; i < lines.length; i++) {
      // EOF check
      if (lines[i].length === 0) {
        break
      }

      // Split each line by tab and parse genomic data content
      const lineContent = lines[i].split('\t')
      const geneSymbol = lineContent[0]

      // If current gene entry is not  in genomic data map create new hashmap entry
      if (!(geneSymbol in genomicDataMap)) {
        genomicDataMap[geneSymbol] = {}
      }

      // Add each entry of genomic data
      for (let j = 1; j < lineContent.length; j++) {
        genomicDataMap[geneSymbol][cancerTypes[j - 1]] = lineContent[j]
      }
    }

    const returnObj = {
      genomicDataMap: genomicDataMap,
      visibilityMap: visibleGenomicDataMapByType
    }

    return returnObj
  }

  updateGenomicDataVisibility = function(_key, isVisible) {
    if (_key in this.visibleGenomicDataMapByType) {
      this.visibleGenomicDataMapByType[_key] = isVisible
    }
  }

  hideGenomicData = function() {
    this.cy
      .style()
      .selector('node[type="GENE"]')
      .style('text-margin-y', 0)
      .style('width', function(ele) {
        return 150
      })
      .style('background-image', function(ele) {
        const dataURI = 'data:image/svg+xml;utf8,'
        return dataURI
      })
      .update()
  }

  countVisibleGenomicDataByType() {
    // Count the genomic data that will be displayed on nodes' body
    let genomicDataBoxCount = 0
    for (let cancerType in this.visibleGenomicDataMapByType) {
      if (this.visibleGenomicDataMapByType[cancerType]) {
        genomicDataBoxCount++
      }
    }
    return genomicDataBoxCount
  }

  generateSVGForNode(ele) {
    const genomicDataBoxCount = this.countVisibleGenomicDataByType()

    // Experimental data overlay part !
    const dataURI = 'data:image/svg+xml;utf8,'
    const svgNameSpace = 'http://www.w3.org/2000/svg'
    const nodeLabel = ele.data('name')

    // If there is no genomic data for this node return !
    if (!(nodeLabel in this.genomicDataMap)) {
      return dataURI
    }

    const eleBBox = ele.boundingBox()
    const reqWidth = this.getRequiredWidthForGenomicData(genomicDataBoxCount)
    const overlayRecBoxW = reqWidth - 10
    const overlayRecBoxH = 25
    const svg: any = document.createElementNS(svgNameSpace, 'svg')
    // It seems this should be set according to the node size !
    svg.setAttribute('width', reqWidth)
    svg.setAttribute('height', eleBBox.h)
    // This is important you need to include this to succesfully render in cytoscape.js!
    svg.setAttribute('xmlns', svgNameSpace)

    // Overlay Data Rect
    const overLayRectBBox = {
      w: overlayRecBoxW,
      h: overlayRecBoxH,
      x: reqWidth / 2 - overlayRecBoxW / 2,
      y: eleBBox.h / 2 + overlayRecBoxH / 2 - 18
    }

    const genomicFrequencyData = this.genomicDataMap[nodeLabel]

    let maxGenomicDataBoxCount = /*(genomicDataBoxCount > 3) ? 3:*/ genomicDataBoxCount
    let genomicBoxCounter = 0

    for (let i in this.groupedGenomicDataMap) {
      for (let j in this.groupedGenomicDataMap[i]) {
        const cancerType = this.groupedGenomicDataMap[i][j]
        if (!this.visibleGenomicDataMapByType[cancerType]) {
          continue
        }

        if (genomicFrequencyData[cancerType] !== undefined) {
          genomicDataRectangleGenerator(
            overLayRectBBox.x +
              (genomicBoxCounter * overLayRectBBox.w) / maxGenomicDataBoxCount,
            overLayRectBBox.y,
            overLayRectBBox.w / maxGenomicDataBoxCount,
            overLayRectBBox.h,
            genomicFrequencyData[cancerType],
            svg
          )
        } else {
          genomicDataRectangleGenerator(
            overLayRectBBox.x +
              (genomicBoxCounter * overLayRectBBox.w) / maxGenomicDataBoxCount,
            overLayRectBBox.y,
            overLayRectBBox.w / maxGenomicDataBoxCount,
            overLayRectBBox.h,
            null,
            svg
          )
        }

        genomicBoxCounter++
      }
    }
    /* Function to determine if text should be black or white
         Inputs: 
           backgroundColor: hex color value of background
         Outputs:
            textColor: recommented text color (hex)
    */
    function suggestTextColor(backgroundColor) {
      function hexToRgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
           r: parseInt(result[1], 16),
           g: parseInt(result[2], 16),
           b: parseInt(result[3], 16)
        } : null;
      }
      let rgbColor = hexToRgb(backgroundColor);
      let red = rgbColor.r / 255.0;
      let green = rgbColor.g / 255.0;
      let blue = rgbColor.b / 255.0;
      if (red <= 0.03928) { red = red / 12.92 } else { red = Math.pow((red+0.055)/1.055, 2.4) }
      if (green <= 0.03928) { green = green / 12.92 } else { green = Math.pow((green+0.055)/1.055, 2.4) }
      if (blue <= 0.03928) { blue = blue / 12.92 } else { blue = Math.pow((blue+0.055)/1.055, 2.4) }
      let relativeLuminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      if (relativeLuminance > 0.179) {
        return '#000000' // black text (background color is light)
      } else {
        return '#ffffff' // white text (background color is dark)
      }
    }

    /*
       Function to generate svg for node
         Inputs:
            x
            y
            w
            h
            percent: can be number or object. 
                     If an object, structure is:
                        { value: <value>,
                          colorValue: <hex color value>
                        }.
                     If an object, the color of the SVG will be determined by the colorValue, 
                     and the color of the text will be determined by suggestTextColor()
            parentSVG
          Outputs:
            svg
    */
    function genomicDataRectangleGenerator(x, y, w, h, percent, parentSVG) {
      let colorString = ''
      if (percent) {
        if (percent.hasOwnProperty('colorValue')) { // then use the color value passed in percent object
          colorString = percent.colorValue
        } else {
          const isNegativePercent = percent < 0
          let _percent = Math.abs(percent)
          // Handle special cases here !
          _percent = _percent < 0.5 ? 2 : _percent
          _percent = _percent === 1 ? 2 : _percent
          // Here we are using non linear regression
          // Fitting points of (0,0), (25,140), (50,220), (100, 255)
          const percentColor = 255 - (-7.118 + 53.9765 * Math.log(_percent))
  
          if (percent === 0) {
            colorString = 'rgb(255,255,255)'
          } else if (isNegativePercent) {
            colorString =
              'rgb(' +
              Math.round(percentColor) +
              ',' +
              Math.round(percentColor) +
              ',255)'
            percent = percent.substring(1)
          } else {
            colorString =
              'rgb(255,' +
              Math.round(percentColor) +
              ',' +
              Math.round(percentColor) +
              ')'
          }
        }
        // Rectangle Part
        const overlayRect = document.createElementNS(svgNameSpace, 'rect')
        overlayRect.setAttribute('x', x)
        overlayRect.setAttribute('y', y)
        overlayRect.setAttribute('width', w)
        overlayRect.setAttribute('height', h)
        overlayRect.setAttribute(
          'style',
          'stroke-width:1;stroke:rgb(0,0,0);opacity:1;fill:' + colorString + ';'
        )

        // Text Part
        var text
        if (percent.hasOwnProperty('colorValue')) { // then use raw value (w/o '%' sign)
           if (parseFloat(percent.value) == NaN) {
             text = percent.value;
           } else {
             text = parseFloat(percent.value).toFixed(2)
           }
        } else {
           const textPercent =
             percent < 0.5 && percent > 0 ? '<0.5' : Number(percent).toFixed(1)
           text = textPercent + '%'
        }
        const fontSize = 14
        const textLength = text.length
        const xOffset = w / 2 - textLength * 4
        const yOffset = fontSize / 3

        const svgText = document.createElementNS(svgNameSpace, 'text')
        svgText.setAttribute('x', x + xOffset)
        svgText.setAttribute('y', y + h / 2 + yOffset)
        svgText.setAttribute('font-family', 'Arial')
        if (percent.hasOwnProperty('colorValue')) {  // then get text color based on background color 
          svgText.setAttribute('fill', suggestTextColor(percent.colorValue)) 
        }
        svgText.setAttribute('font-size', fontSize + '')
        svgText.innerHTML = text

        parentSVG.appendChild(overlayRect)
        parentSVG.appendChild(svgText)
      } else {
        colorString = 'rgb(210,210,210)'

        // Rectangle Part
        const overlayRect = document.createElementNS(svgNameSpace, 'rect')
        overlayRect.setAttribute('x', x)
        overlayRect.setAttribute('y', y)
        overlayRect.setAttribute('width', w)
        overlayRect.setAttribute('height', h)
        overlayRect.setAttribute(
          'style',
          'stroke-width:1;stroke:rgb(0,0,0);opacity:1;fill:' + colorString + ';'
        )

        parentSVG.appendChild(overlayRect)
      }
    }

    return svg
  }

  // Just an utility function to calculate required width for genes for genomic data !
  getRequiredWidthForGenomicData(genomicDataBoxCount) {
    const term = genomicDataBoxCount > 3 ? genomicDataBoxCount - 3 : 0
    return 150 + term * 35
  }

  showGenomicData() {
    const self = this

    const genomicDataBoxCount = this.countVisibleGenomicDataByType()

    if (genomicDataBoxCount < 1) {
      // Hide all genomic data and return
      this.hideGenomicData()
      return
    }

    console.log('Inside showGenomicData')
    console.log(this.cy)

    this.cy
      .style()
      .selector('node[type="GENE"]')
      // It used to change the width of nodes only locally
      .style('width', ele => {
        return this.getRequiredWidthForGenomicData(genomicDataBoxCount)
      })
      .style('text-margin-y', function(ele) {
        const nodeLabel = ele.data('name')
        // If there is no genomic data for this node return !
        if (!(nodeLabel in self.genomicDataMap)) {
          return 0
        }

        // Else shift label in Y axis
        return -15
      })
      .style('background-image', function(ele) {
        const x = encodeURIComponent(self.generateSVGForNode(ele).outerHTML)
        if (x === 'undefined') {
          return 'none'
        }
        const dataURI = 'data:image/svg+xml;utf8,' + x
        // console.log(dataURI)
        return dataURI
      })
      .update()
  }

  parseGenomicData(genomicData, groupID) {
    this.genomicDataMap = this.genomicDataMap || {}
    this.visibleGenomicDataMapByType = this.visibleGenomicDataMapByType || {}
    this.groupedGenomicDataMap = this.groupedGenomicDataMap || {}
    if (typeof genomicData == 'object') { 
       if (!this.groupedGenomicDataMap.hasOwnProperty(groupID)) { this.groupedGenomicDataMap[groupID] = [] }
       var dataSetNames = Object.keys(genomicData) // the different sets of data
       /* BUG WARNING: if the gene names are different in different genomic datasets, these will be wrong. TODO: fix me*/
       var geneNames = genomicData[dataSetNames[0]].map((gd) => {return gd.gene})
       geneNames.forEach(gn => {
         if (!this.genomicDataMap.hasOwnProperty(gn)) { this.genomicDataMap[gn] = {} }
       })
       dataSetNames.forEach((dsname, idx) => {
         //let genomicDataSet = genomicData[dsname]
         genomicData[dsname].forEach((gds) => {
           this.genomicDataMap[gds.gene][dsname] = {}
           this.genomicDataMap[gds.gene][dsname]['value'] = gds.value
           this.genomicDataMap[gds.gene][dsname]['colorValue'] = gds.color
         })
         if (this.groupedGenomicDataMap[groupID].indexOf(dsname) == -1) {
           this.groupedGenomicDataMap[groupID].push(dsname)
         }
         this.visibleGenomicDataMapByType[dsname] = true
       })
       return
    } else {
    const cancerTypes = []

    // By lines
    const lines = genomicData.split('\n')
    // First line is meta data !
    const metaLineColumns = lines[0].split('\t')

    // Parse cancer types
    for (let i = 1; i < metaLineColumns.length; i++) {
      cancerTypes.push(metaLineColumns[i])
      // Update initially visible genomic data boxes !
      if (i - 1 < this.DEFAULT_VISIBLE_GENOMIC_DATA_COUNT) {
        this.visibleGenomicDataMapByType[cancerTypes[i - 1]] = true
      } else {
        this.visibleGenomicDataMapByType[cancerTypes[i - 1]] = false
      }

      if (this.groupedGenomicDataMap[groupID] === undefined) {
        this.groupedGenomicDataMap[groupID] = []
      }
      this.groupedGenomicDataMap[groupID].push(cancerTypes[i - 1])
    }

    // parse genomic data
    for (let i = 1; i < lines.length; i++) {
      // EOF check
      if (lines[i].length === 0) {
        break
      }

      // Split each line by tab and parse genomic data content
      const lineContent = lines[i].split('\t')
      const geneSymbol = lineContent[0]

      // If current gene entry is not  in genomic data map create new map
      if (!(geneSymbol in this.genomicDataMap)) {
        this.genomicDataMap[geneSymbol] = {}
      }

      // Add each entry of genomic data
      for (let j = 1; j < lineContent.length; j++) {
        this.genomicDataMap[geneSymbol][cancerTypes[j - 1]] = lineContent[j]
      }
    }
    }
  }

  // Simple observer-observable pattern for views!!!!!
  registerObserver(observer) {
    this.observers.push(observer)
  }

  notifyObservers() {
    for (const observer of this.observers) {
      observer.notify()
    }
  }
}
