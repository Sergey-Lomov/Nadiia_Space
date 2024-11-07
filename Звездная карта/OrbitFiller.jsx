//--------------------- Functional Constant
const millimetersToPoints = 2.83465
const radiansToDegress = 57.2958
const anchorsCount = 6;
const segmentsPerAnchor = 2;

//--------------------- Layers Constants
const prototypeLayerName = "OrbitsPrototype";
const backgroundLayerName = "Background";

const curveLayerName = "Curve";
const orbitsLayerName = "Orbits";
const anchorsLayerName = "Anchors";
const titleLayerName = "Title";
const segmentsLayerName = "Segments";
const primaryAnchorLayerName = "PrimaryAnchor";
const secondaryAnchorLayerName = "SecondaryAnchor";
const segmentLayerName = "Segment";

function CopyLayer(layer, toLayer) {
    var newLayer = toLayer.layers.add();
    newLayer.name = layer.name
    newLayer.opacity = layer.opacity

    for (var i = 0; i < layer.layers.length; i++) {
        CopyLayer(layer.layers[i], newLayer)
    }

    for (var i = layer.pageItems.length - 1; i >= 0; i--) {
        layer.pageItems[i].duplicate(newLayer)
    }

    newLayer.zOrder(ZOrderMethod.SENDBACKWARD)

    return newLayer
}

function MoveLayerContent(layer, x, y) {
    for (var i = 0; i < layer.layers.length; i++) {
        MoveLayerContent(layer.layers[i], x, y)
    }

    for (var i = 0; i < layer.pageItems.length; i++) {
        layer.pageItems[i].translate(x, y)
    }
}

function RotateLayerContent(layer, angle, position) {
    position = typeof (position) == "undefined" ? LayerCenter(layer) : position

    for (var i = 0; i < layer.layers.length; i++) {
        RotateLayerContent(layer.layers[i], angle, position)
    }

    for (var i = 0; i < layer.pageItems.length; i++) {
        var item = layer.pageItems[i]
        item.translate(-position[0], -position[1])
        item.rotate(angle * radiansToDegress, 1, 1, 1, 1, Transformation.DOCUMENTORIGIN)
        item.translate(position[0], position[1])
    }
}

function ScaleLayerContent(layer, x, y) {
    for (var i = 0; i < layer.layers.length; i++) {
        ScaleLayerContent(layer.layers[i], x, y)
    }

    for (var i = 0; i < layer.pageItems.length; i++) {
        layer.pageItems[i].resize(x * 100, y * 100)
    }
}

function LayerBounds(layer) {
    var bounds = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]

    for (var i = 0; i < layer.pageItems.length; i++) {
        var lbounds = layer.pageItems[i].geometricBounds
        if (lbounds[0] < bounds[0]) bounds[0] = lbounds[0]
        if (lbounds[1] > bounds[1]) bounds[1] = lbounds[1]
        if (lbounds[2] > bounds[2]) bounds[2] = lbounds[2]
        if (lbounds[3] < bounds[3]) bounds[3] = lbounds[3]
    }

    for (var i = 0; i < layer.layers.length; i++) {
        var lbounds = LayerBounds(layer.layers[i])
        if (lbounds[0] < bounds[0]) bounds[0] = lbounds[0]
        if (lbounds[1] > bounds[1]) bounds[1] = lbounds[1]
        if (lbounds[2] > bounds[2]) bounds[2] = lbounds[2]
        if (lbounds[3] < bounds[3]) bounds[3] = lbounds[3]
    }

    return bounds
}

function LayerCenter(layer) {
    var bounds = LayerBounds(layer)
    var x = (bounds[0] + bounds[2]) / 2
    var y = (bounds[1] + bounds[3]) / 2
    return [x, y]
}

function LayerSize(layer) {
    var bounds = LayerBounds(layer)
    var width = Math.abs(bounds[0] - bounds[2])
    var height = Math.abs(bounds[1] - bounds[3])
    return [width, height]
}

function Move(layer, x, y) {
    var center = LayerCenter(layer)
    MoveLayerContent(layer, x - center[0], y - center[1])
}

function PositionByEllipseCoord(r1, r2, angle, center) {
    var x = r1 * Math.cos(angle) * millimetersToPoints + center[0]
    var y = r2 * Math.sin(angle) * millimetersToPoints + center[1]
    return [x, y]
}

function CalculateCurveScale(layer, orbit) {
	var currentSize = LayerSize(layer)
    var scaleX = (orbit.r1 * 2 * millimetersToPoints) / currentSize[0]
    var scaleY = (orbit.r2 * 2 * millimetersToPoints) / currentSize[1]
	return [scaleX, scaleY]
}

function SetupCurve(layer, orbit, center) {
	var scale = CalculateCurveScale(layer, orbit)
    ScaleLayerContent(layer, scale[0], scale[1])
    Move(layer, center[0], center[1])
}

function SetupAnchors(layer, prototypeLayer, orbit, center) {
    var primaryPrototype = prototypeLayer.layers.getByName(primaryAnchorLayerName)
    var secondaryPrototype = prototypeLayer.layers.getByName(secondaryAnchorLayerName)
    for (var i = 0; i < anchorsCount; i++) {
        var prototype = i == 0 ? primaryPrototype : secondaryPrototype
        var angle = (Math.PI * 2) / anchorsCount * i + (orbit.zero_delta / radiansToDegress)
        var anchorLayer = CopyLayer(prototype, layer);
        var position = PositionByEllipseCoord(orbit.r1, orbit.r2, angle, center)
        Move(anchorLayer, position[0], position[1])
        var rotation = OrtonormalAngle(position, center, orbit)
        RotateLayerContent(anchorLayer, rotation)
    }
}

function SetupSegments(layer, prototypeLayer, orbit, center) {
    var segmentPrototype = prototypeLayer.layers.getByName(segmentLayerName)
    for (var anachorIndex = 0; anachorIndex < anchorsCount; anachorIndex++) {
        for (var segmentIndex = 0; segmentIndex < segmentsPerAnchor; segmentIndex++) {
            var resolvetIndex = anachorIndex + (segmentIndex + 1) / (segmentsPerAnchor + 1)
            var angle = (Math.PI * 2) / anchorsCount * resolvetIndex + (orbit.zero_delta / radiansToDegress)
            var segmentLayer = CopyLayer(segmentPrototype, layer);
            var position = PositionByEllipseCoord(orbit.r1, orbit.r2, angle, center)
            Move(segmentLayer, position[0], position[1])
            var rotation = OrtonormalAngle(position, center, orbit)
            RotateLayerContent(segmentLayer, rotation)
        }
    }
}

function SetupTitle(layer, orbit, center) {
	var angle = (Number(orbit.title_angle) + Number(orbit.zero_delta)) / radiansToDegress
	var titleFrame = layer.textFrames[0]
	if (typeof(titleFrame) == "undefined") { 
		alert("Title layer have no text elements")
		return
	}

	titleFrame.contents = orbit.title
	var scale = CalculateCurveScale(layer, orbit)
	titleFrame.textPath.width = orbit.r1 * 2 * millimetersToPoints
	titleFrame.textPath.height = orbit.r2 * 2 * millimetersToPoints
	//alert(titleFrame.textPath)
	titleFrame.startTValue = 4 - 4 / Math.PI / 2 * angle - 1
	titleFrame.endTValue = 4 - 4 / Math.PI / 2 * angle + 1
	//RotateLayerContent(layer, angle - Math.PI)
	Move(layer, center[0], center[1])
	layer.zOrder(ZOrderMethod.BRINGTOFRONT);
}

function OrtonormalAngle(point, center, orbit) {
    var x = center[0] - point[0]
    var y = center[1] - point[1]
    var k = -1 * (x * orbit.r2 * orbit.r2) / (y * orbit.r1 * orbit.r1)
    var angle = Math.atan(k)
    return angle - Math.PI / 2
}

function HandleOrbit(orbit, orbitsLayer, prototypeLayer, center) {
    var orbitLayer = orbitsLayer.layers.add()
    orbitLayer.name = orbit.title

    var curvePrototype = prototypeLayer.layers.getByName(curveLayerName)
    var curveLayer = CopyLayer(curvePrototype, orbitLayer);
    SetupCurve(curveLayer, orbit, center)

    var anchorsLayer = orbitLayer.layers.add()
    anchorsLayer.name = anchorsLayerName
    SetupAnchors(anchorsLayer, prototypeLayer, orbit, center)

    var segmentsLayer = orbitLayer.layers.add()
    segmentsLayer.name = segmentsLayerName
    SetupSegments(segmentsLayer, prototypeLayer, orbit, center)
	
	var titlePrototype = prototypeLayer.layers.getByName(titleLayerName)
    var titleLayer = CopyLayer(titlePrototype, orbitLayer);
    SetupTitle(titleLayer, orbit, center)

	RotateLayerContent(orbitLayer, orbit.rotation / radiansToDegress)
    var x = Number(orbit.translation.x)
    var y = Number(orbit.translation.y)
    MoveLayerContent(orbitLayer, x, y)
}

function Execute() {
    if (app.documents.length > 0) {
        var doc = app.activeDocument
        var backgroundLayer = doc.layers.getByName(backgroundLayerName)
        var center = LayerCenter(backgroundLayer)

        var orbitsLayer = doc.layers.add()
        orbitsLayer.name = orbitsLayerName
        var prototypeLayer = doc.layers.getByName(prototypeLayerName)

        var file = File.openDialog("Select orbits XML", "*.xml;")
        file.open("r");
        var xmlContent = XML(file.read());
        for each(var orbit in xmlContent.elements()) {
            HandleOrbit(orbit, orbitsLayer, prototypeLayer, center)
        }
    }
    else {
        alert("Please open a document with template.")
    }
}

Execute()