/*
  MIT License

  Copyright (c) 2018 Rex

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

import GetValue from "phaser3-rex-plugins/plugins/utils/object/GetValue.js";

// changed move to tile so it moves game objects in tile coords
// instead of transforming them to world coordinates
var MoveToTile = function(tileX, tileY, direction) {
  var board = this.chessData.board;
  if (board === null) {
    // chess is not in a board
    this.lastMoveResult = false;
    return this;
  }

  if (tileX != null && typeof tileX !== "number") {
    var config = tileX;
    tileX = GetValue(config, "x", undefined);
    tileY = GetValue(config, "y", undefined);
    direction = GetValue(config, "direction", undefined);
  }
  var myTileXYZ = this.chessData.tileXYZ;
  if ((direction !== undefined && tileX == null) || tileY == null) {
    // Get neighbor tile position if direction is not undefined
    var targetTileXY = board.getNeighborTileXY(myTileXYZ, direction, true);
    if (targetTileXY !== null) {
      tileX = targetTileXY.x;
      tileY = targetTileXY.y;
    } else {
      tileX = null;
      tileY = null;
    }
  }

  // invalid tile position
  if (tileX == null || tileY == null) {
    this.lastMoveResult = false;
    return this;
  }
  if (direction === undefined) {
    globTileXYZ.x = tileX;
    globTileXYZ.y = tileY;
    direction = board.getNeighborTileDirection(myTileXYZ, globTileXYZ);
  }
  if (!this.canMoveTo(tileX, tileY, direction)) {
    this.lastMoveResult = false;
    return this;
  }
  this.destinationTileX = tileX;
  this.destinationTileY = tileY;
  this.destinationDirection = direction;

  if (board.wrapMode && direction !== null) {
    // board.grid.getNeighborTileXY(myTileXYZ.x, myTileXYZ.y, direction, neighborTileXY);
    // // wrap mode && neighbor
    // if ((neighborTileXY.x === tileX) && (neighborTileXY.y === tileY)) {
    //     // not a wrapped neighbor
    //     var out = board.tileXYToWorldXY(tileX, tileY, true);
    //     this.moveAlongLine(undefined, undefined, out.x, out.y);
    // } else {
    //     // wrapped neighbor
    //     // line 0
    //     var out = board.tileXYToWorldXY(neighborTileXY.x, neighborTileXY.y, true);
    //     var originNeighborWorldX = out.x;
    //     var originNeighborWorldY = out.y;
    //     out = board.tileXYToWorldXY(myTileXYZ.x, myTileXYZ.y, true);
    //     var startX = out.x;
    //     var startY = out.y;
    //     var endX = (startX + originNeighborWorldX) / 2;
    //     var endY = (startY + originNeighborWorldY) / 2;
    //     this.moveAlongLine(undefined, undefined, endX, endY);
    //     // line 1
    //     var oppositeDirection = board.getOppositeDirection(tileX, tileY, direction);
    //     board.grid.getNeighborTileXY(tileX, tileY, oppositeDirection, neighborTileXY);
    //     out = board.tileXYToWorldXY(neighborTileXY.x, neighborTileXY.y, true);
    //     originNeighborWorldX = out.x;
    //     originNeighborWorldY = out.y;
    //     out = board.tileXYToWorldXY(tileX, tileY, true);
    //     endX = out.x;
    //     endY = out.y;
    //     startX = (originNeighborWorldX + endX) / 2;
    //     startY = (originNeighborWorldY + endY) / 2;
    //     this.addMoveLine(startX, startY, endX, endY);
    // }

    throw new Error(
      "MoveToTile method (from RexPlugins) doesn't have board.wrapMode condition implemented~!"
    );
  } else {
    // var out = board.tileXYToWorldXY(tileX, tileY, true);
    this.moveAlongLine(undefined, undefined, tileX, tileY);
  }
  board.moveChess(this.gameObject, tileX, tileY, undefined, false);

  this.isRunning = true;
  this.lastMoveResult = true;
  return this;
};

var globTileXYZ = {};
var neighborTileXY = {};

export default MoveToTile;
