let canvas;
let ctx; // context to be used to draw on the canvas
let savedImageData;
let dragging = false;
let strokeColour = 'black';
let fillColour = 'black'; // make thi editable
let line_Width = 2;
let polygonSides = 6; // make this editable
let currentTool = 'brush';
let canvasWidth = 600;
let canvasHeight = 600;

// Brush globals
let usingBrush = false;
let brushXPoints = new Array();
let brushYPoints = new Array();
let brushDownPos = new Array();

class ShapeBoundingBox {
	constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }
}

class MouseDownPos {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Location {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class PolygonPoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

let shapeBoundingBox = new ShapeBoundingBox(0, 0, 0, 0);
let mousedown = new MouseDownPos(0, 0);
let loc = new Location(0, 0);

// This event fires when initial HTML document is completely loaded and parsed
document.addEventListener('DOMContentLoaded', setupCanvas);

/*
 * Initial set up to draw the large canvas
 * listen for user mouse input
*/
function setupCanvas() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  ctx.strokeStyle = strokeColour;
  ctx.lineWidth = line_Width;

  // action listeners
  canvas.addEventListener("mousedown", reactToMouseDown);
  canvas.addEventListener("mousemove", reactToMouseMove);
  canvas.addEventListener("mouseup", reactToMouseUp);
}

/*
 * TODO: add HTML view to be able to call this method
*/
function changeStrokeColour(colour) {
  ctx.strokeStyle = colour;
}

/*
 * Set tool class name to selected and
 * change currentTool to selected tool.
 * @param String tool
 */
function changeTool(tool) {
  // set all toolbar selections to not selected
  document.getElementById('open').className = "";
  document.getElementById('save').className = "";
  document.getElementById('brush').className = "";
  document.getElementById('line').className = "";
  document.getElementById('rectangle').className = "";
  document.getElementById('circle').className = "";
  document.getElementById('ellipse').className = "";
  document.getElementById('polygon').className = "";

  // get the tool as the ID and then select it
  document.getElementById(tool).className = "selected";
  currentTool = tool;
}

/*
 * Get mouse position
 * @param Integer x
 * @param Integer y
 * @return Hash position
 */
function getMousePosition(x, y) {
  const canvasSizeData = canvas.getBoundingClientRect();
  // get upper left hand corner of the canvas
  const xPosition = (x - canvasSizeData.left) * (canvas.width / canvasSizeData.width);
  const yPosition = (y - canvasSizeData.top) * (canvas.height / canvasSizeData.height);
  return { x: xPosition, y: yPosition };
}

/*
 * Save canvas image
 * by setting the savedImageData variable to the ImageData object
 * that represents the entire canvas.
 */
function saveCanvasImage() {
  savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 }

/*
 * Redraw canvas image
 * paints the ImageData object onto the canvas
 */
function redrawCanvasImage() {
  ctx.putImageData(savedImageData, 0, 0);
 }

/*
 * Update rubber band size data,
 * specifically width, height, left, and top for rectangle
 * this is used for most shapes
 * @param Location loc
 */
function updateRubberbandSizeData(loc) {
  shapeBoundingBox.width = Math.abs(loc.x - mousedown.x);
  shapeBoundingBox.height = Math.abs(loc.y - mousedown.y);

  // if the current x is greater than starting x, then the left of the 
  // shape bounding box is mousedown
  // otherwise, the left would be the current loc's value
  // this is for both x and y, with left and top respectively
  if (loc.x > mousedown.x) {
    shapeBoundingBox.left = mousedown.x;
  } else {
    shapeBoundingBox.left = loc.x;
  }

  if (loc.y > mousedown.y) {
    shapeBoundingBox.top = mousedown.y;
  } else {
    shapeBoundingBox.top = loc.y;
  }
}

/*
 * Get angle using x and y position
 * Angle = arcTan(Opposite / Adjacent)
 * @param Integer mouseLocX
 * @param Integer mouseLocY
 * @return angle in degrees based on current position
 */
function getAngleUsingXAndY(mouseLocX, mouseLocY) {
  let adjacent = mousedown.x - mouseLocX;
  let opposite = mousedown.y - mouseLocY;
  return convertRadToDeg(Math.atan2(opposite, adjacent));
}

/*
 * Convert radians to degrees
 * @param Double rad
 * @return Double degrees
 */
function convertRadToDeg(rad) {
  // if (rad < 0) {
  //   return 360.0 + (rad * 180 / Math.PI).toFixed(2);
  // }
  return (rad * 180 / Math.PI).toFixed(2);
}

/*
 * Convert degrees to radians
 * @param Double deg
 * @return Double radians
 */
function convertDegToRad(deg) {
  return deg * Math.PI / 180;
}

/*
 * Get all the points for the polygon
 * based on the number of sides specified (default 6).
 * @return Array<PolygonPoint> polygonPoints
 */
function getPolygonPoints() {
  let angle = convertDegToRad(getAngleUsingXAndY(loc.x, loc.y));
  let radiusX = shapeBoundingBox.width;
  let radiusY = shapeBoundingBox.height;
  let polygonPoints = [];

  // x = mouseloc.x + radiusX * sin(angle)
  // y = mouseloc.y + radiusY * cos(angle)
  // polygon point for each side
  for (let i = 0; i < polygonSides; i++) {
    polygonPoints.push(new PolygonPoint(
      loc.x + radiusX * Math.sin(angle),
      loc.y + radiusY * Math.cos(angle)
    ));
    // 2 * PI is 360 degrees
    // divide 360 into parts based on polygonSides
    angle += 2 * Math.PI / polygonSides;
  }
  return polygonPoints;
}

/*
 * Grab the points and draw the polygon by drawing lines
 * between all points.
 * ctx.stroke() is called in the polygon case when drawing the shape.
 */
function getPolygon() {
  let polygonPoints = getPolygonPoints();
  ctx.beginPath();
  ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
  for (let i = 1; i < polygonSides; i++) {
    ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
  }
  ctx.closePath();
}

/*
 * Main method to draw shapes for all tools,
 * this is called on every mouse up and move.
 * @param Location loc
 */
function drawRubberBandShape(loc) {
  ctx.strokeStyle = strokeColour;
  ctx.fillStyle = fillColour;
  switch(currentTool) {
    case "brush":
      drawBrush();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(mousedown.x, mousedown.y);
      ctx.lineTo(loc.x, loc.y);
      ctx.stroke();
      break;
    case "rectangle":
      ctx.strokeRect(
        shapeBoundingBox.left,
        shapeBoundingBox.top,
        shapeBoundingBox.width,
        shapeBoundingBox.height
      );
      break;
    case "circle":
      const radius = shapeBoundingBox.width;
      ctx.beginPath();
      ctx.arc(mousedown.x, mousedown.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "ellipse":
      let radiusX = shapeBoundingBox.width / 2;
      let radiusY = shapeBoundingBox.height / 2;
      ctx.beginPath();
      ctx.ellipse(mousedown.x, mousedown.y, radiusX, radiusY, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "polygon":
      getPolygon();
      ctx.stroke();
      break;
  }
  
}

/*
 * Update rubber band on movement
 * @param Location loc
 */
function updateRubberbandOnMove(loc) {
  updateRubberbandSizeData(loc);
  drawRubberBandShape(loc);
}

/*
 * Add x, y, and mouseDown to the appropriate brush arrays
 * @param Integer x
 * @param Integer y
 * @param Boolean mouseDown
 */
function addBrushPoint(x, y, mouseDown) {
  brushXPoints.push(x);
  brushYPoints.push(y);
  brushDownPos.push(mouseDown);
}

/*
 * Draw using the brush tool
 */
function drawBrush() {
  for (let i = 1; i < brushXPoints.length; i++) {
    ctx.beginPath();
    // if mouse was down at this point, continue drawing
    if (brushDownPos[i]) {
      ctx.moveTo(brushXPoints[i - 1], brushYPoints[i - 1]);
    } else {
      ctx.moveTo(brushXPoints[i] - 1, brushYPoints[i]);
    }
    ctx.lineTo(brushXPoints[i], brushYPoints[i]);
    ctx.closePath();
    ctx.stroke();
  }
}

/*
 * React to mouse down event
 * @param Event e
 */
function reactToMouseDown(e) {
  canvas.style.cursor = "crosshair";
  loc = getMousePosition(e.clientX, e.clientY);
  saveCanvasImage();
  mousedown.x = loc.x;
  mousedown.y = loc.y;
  dragging = true;

  if (currentTool === "brush") {
    usingBrush = true;
    addBrushPoint(loc.x, loc.y);
  }
}

/*
 * React to mouse move event
 * @param Event e
 */
function reactToMouseMove(e) {
  canvas.style.cursor = "crosshair";
  loc = getMousePosition(e.clientX, e.clientY);
  if (currentTool === "brush" && dragging && usingBrush) {
    if (loc.x > 0 && loc.x < canvasWidth && loc.y > 0 && loc.y < canvasHeight) {
      addBrushPoint(loc.x, loc.y, true);
    }
    redrawCanvasImage();
    drawBrush();
  } else {
    if (dragging) {
      redrawCanvasImage();
      updateRubberbandOnMove(loc);
    }
  }
}

/*
 * React to mouse up
 * @param Event e
 */
function reactToMouseUp(e) {
  canvas.style.cursor = "crosshair";
  loc = getMousePosition(e.clientX, e.clientY);
  redrawCanvasImage();
  updateRubberbandOnMove(loc);
  dragging = false;
  usingBrush = false;
}

/*
 * Save image to image.png
 */
function saveImage() {
  const imageFile = document.getElementById('img-file');
  imageFile.setAttribute('download', 'image.png');
  imageFile.setAttribute('href', canvas.toDataURL());
}

/*
 * Open image
 * TODO: fix
 */
function openImage() {
  let img = new Image();
  img.onload = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }
  img.src = 'image.png';
}
