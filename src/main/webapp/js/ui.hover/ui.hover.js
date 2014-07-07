(function( $, undefined ) {

_MSG_NOT_SUPPORTED = 'Need browser with canvas support';
_MSG_AREA_ALT = 'Switch area';

// this is to ensure that all the layers are not shifted
_CSS_NO_BORDER = { border: '0px !important', padding: '0px !important', margin: '0px !important' };
// TODO: replace with 40x40, this one is 1x1 and not optimal for scaling
_IMG_TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

$.widget( 'ui.hover', {

    options: {
        version: '1.0.0',
        image: { src: _IMG_TRANSPARENT, width: 100, height: 100, alt: 'Picture' },
        marker: [{x: 10, y: 10}, {x: 30, y: 10}, {x: 30, y: 30}, {x: 10, y: 30}],
        flags: {
            renderBorder: true, border: 'thin solid black',
            background: 'RGBA(180, 255, 100, 0.1)',
            meshBorderColor: 'white',
            meshColor: 'yellow',
            markerBorderColor: 'blue', markerBorderWidth: 2
        }
     },

    _id: null,
    _w: null,
    _h: null,

    _borders: null,
    _hLines: null,
    _vLines: null,

    _map: null,
    _context: null,

    // creates html components
    _create: function() {
        this._id = this.element.attr('id') + '_hover_';

        this._w = this.options.image.width;
        this._h = this.options.image.height;

        var canvas = $('<canvas/>')
            .attr('id', this._id + 'canvas')
            .attr('width', this._w)
            .attr('height', this._h)
            .text(_MSG_NOT_SUPPORTED)
            .css(_CSS_NO_BORDER)
            .css({ background: this.options.flags.background });
        var touch = $('<img/>')
            .attr('id', this._id + 'touch')
            .attr('src', _IMG_TRANSPARENT)
            .attr('width', this._w)
            .attr('height', this._h)
            .attr('usemap', '#' + this._id + 'map')
            .css(_CSS_NO_BORDER)
            .css({ position: 'relative', left: 0, top: -this._h });
        this._map = $('<map/>')
            .attr('id', this._id + 'map')
            .attr('name', this._id + 'map');

        this.element.empty()
            .css({
                backgroundImage: 'url(' + this.options.image.src + ')',
                border: this.options.flags.border
            })
            .width(this._w)
            .height(this._h);
        this.element.append([canvas, touch, this._map]);

        this._context = document.getElementById(this._id + 'canvas').getContext('2d');
    },

    // perform calculations and rendering
    _init: function() {
        this._calculateMesh();
        this._calculateMap(this._map);

        this._renderBorders();
        this._renderMesh();
        this._renderMarker();
    },

    // calculates grid
    _calculateMesh: function() {
        // base lines are marker borders
        var m = this.options.marker;
        var vLine1 = __line(m[0], m[1]),
            vLine2 = __line(m[3], m[2]),
            hLine1 = __line(m[1], m[2]),
            hLine2 = __line(m[0], m[3]);
        // they form two vanishing points
        var vanishV = __cross(vLine1, vLine2),
            vanishH = __cross(hLine1, hLine2);
        // rendering area (0,0)-(w,h)
        this._borders = [
            __line({x: 0, y: 0}, {x: this._w, y: 0}),
            __line({x: 0, y: 0}, {x: 0, y: this._h}),
            __line({x: 0, y: this._h}, {x: this._w, y: this._h}),
            __line({x: this._w, y: 0}, {x: this._w, y: this._h})
        ];

        var vLinesNeg, vLinesPos, hLinesNeg, hLinesPos;
        if (vanishV) {
            vLinesNeg = this._getVanishLines(hLine1, vanishV, false);
            vLinesPos = this._getVanishLines(hLine1, vanishV, true);
        } else {
            vLinesNeg = this._getParallelLines(hLine1, vLine1, false);
            vLinesPos = this._getParallelLines(hLine1, vLine1, true);
        }
        if (vanishH) {
            hLinesNeg = this._getVanishLines(vLine1, vanishH, false);
            hLinesPos = this._getVanishLines(vLine1, vanishH, true);
        } else {
            hLinesNeg = this._getParallelLines(vLine1, hLine1, false);
            hLinesPos = this._getParallelLines(vLine1, hLine1, true);
        }

        this._vLines = $.merge($.merge([], vLinesNeg.reverse()), vLinesPos);
        this._hLines = $.merge($.merge([], hLinesNeg.reverse()), hLinesPos);
    },

    // found all the lines from point to vanishing point that cross the borders
    // point are moved from starting position by vector
    _getVanishLines: function(ort, vanish, direction) {
        var start = direction? ort.pA : ort.pB;
        var sign = direction? 1 : -1;
        var vector = { x: -sign * ort.a, y: sign * ort.b };

        return this._getLines(start, vanish, vector, false);
    },

    // found all the lines from point to end point, both moved by vector
    _getParallelLines: function(ort, base, direction) {
        var start = direction? ort.pA : ort.pB;
        var end = __move(start, {x: base.a, y: -base.b});
        var sign = direction? 1 : -1;
        var vector = { x: -sign * ort.a, y: sign * ort.b };
        return this._getLines(start, end, vector, true);
    },

    _getLines: function(start, end, vector, moveEnd) {
        var lines = [];
        var i = 0;
        var hit = true;
        while (hit && i++ < 100) {
            var line = __line(start, end);
            hit = false;
            $.each(this._borders, function() {
                var cross = __crossSegment(line, this);
                if (cross) {
                    if (hit)
                        line.pB = cross;
                    else
                        line.pA = cross;
                    hit = true;
                }
            });
            if (hit)
                lines.push(line);
            start = __move(start, vector);
            if (moveEnd)
                end = __move(end, vector);
        }
        return lines;
    },

    _calculateMap: function(map) {
        // for each zone
        // fixme
        var index = 0;
        var zone = this.options.marker;
        {
            var coords = '';
            $.each(zone, function() {
                coords += this.x + "," + this.y + ","
            });
            if (coords.length > 0)
                coords = coords.substring(0, coords.length - 1);
            var area = $('<area/>')
                .attr('shape', 'poly')
                .attr('href', 'javascript:alert(' + index + ')')
                .attr('alt', _MSG_AREA_ALT)
                .attr('coords', coords)
                .css({ });
            map.append(area);
        }
    },

    _renderBorders: function() {
        var me = this;
        if (this.options.flags.renderBorder)
            $.each(this._borders, function() {
                me._renderSegment(this, me.options.flags.borderColor);
            });
    },

    _renderMesh: function() {
        var me = this;
        $.each(this._vLines, function() {
            me._renderLine(this);
        });
        $.each(this._hLines, function() {
            me._renderLine(this);
        });
    },

    _renderMarker: function() {
        var context = this._context;
        var last = this.options.marker[this.options.marker.length - 1];

        context.strokeStyle = this.options.flags.markerBorderColor;
        context.lineWidth = this.options.flags.markerBorderWidth;
        context.beginPath();
        context.moveTo(last.x, last.y);
        $.each(this.options.marker, function() {
            context.lineTo(this.x, this.y);
        });
        context.closePath();
        context.stroke();
    },

    // render line passed, its, visible segment restricted by horizontal axises
    _renderLine: function(line, color) {
        var pA, pB;
        if (line.vertical) {
            pA = { x: __lineX(line, 0), y: 0 };
            pB = { x: __lineX(line, this._h), y: this._h };
        } else {
            pA = { x: 0, y: __lineY(line, 0)};
            pB = { x: this._w, y: __lineY(line, this._w)};
        }
        this._renderSegment(__line(pA, pB), color);
    },

    _renderSegment: function(line, color) {
        var context = this._context;

        context.strokeStyle = color || this.options.flags.meshColor;
        context.beginPath();
        context.moveTo(line.pA.x, line.pA.y);
        context.lineTo(line.pB.x, line.pB.y);
        context.closePath();
        context.stroke();
    },

});

/////// Mathematics ///////

// return point object
function __point(x, y) {
    return {x: x, y: y};
}

function __move(point, vector) {
    return { x: point.x + vector.x, y: point.y + vector.y };
}

// return line object, calculated by segment between two points,
// contains segment itself, canonical and angle formula coefficients
function __line(pA, pB) {
    var a = pB.x - pA.x;
    var b = pA.y - pB.y;
    var c = pA.x * pB.y - pA.y * pB.x;
    return {
        pA: pA, pB: pB,
        a: a, b: b, c: c, // ay + bx + c = 0
        vertical: pA.x == pB.x,
        x: pA.x == pB.x? pA.x : null, // vertical: x = pA.x
        k: -b/a, d: -c/a // !vertical? y = kx + d
    };
}

// check that two lines are parallel
function __parallel(lA, lB) {
    return lA.vertical && lB.vertical || lA.k == lB.k;
}

// return intersection point for two lines or null
function __cross(lA, lB) {
    if (__parallel(lA, lB))
        return null;

    if (lA.vertical)
        return {x: lA.x, y: lB.k * lA.x + lB.d };
    if (lB.vertical)
        return {x: lB.x, y: lA.k * lB.x + lA.d };

    var x = (lB.d - lA.d) / (lA.k - lB.k);
    var y = lA.k * x + lA.d;
    return { x: x, y: y };
}

// return intersection point for by lineA within segment of lineB
// only if intersection lies within segment of lineB
function __crossSegment(lA, lB) {
    var cross = __cross(lA, lB);
    if (!cross)
        return null;

    var minX = lB.pA.x < lB.pB.x? lB.pA.x : lB.pB.x;
    var maxX = lB.pA.x < lB.pB.x? lB.pB.x : lB.pA.x;
    var minY = lB.pA.y < lB.pB.y? lB.pA.y : lB.pB.y;
    var maxY = lB.pA.y < lB.pB.y? lB.pB.y : lB.pA.y;
    var hit =
        cross.x >= minX && cross.x <= maxX &&
        cross.y >= minY && cross.y <= maxY;
    return hit? cross : null;
}

// return X coordinate of line point for another coordinate is given
function __lineX(line, y) {
    return line.vertical?
        line.x:
        (y - line.d) / line.k;
}

// return Y coordinate of line point for another coordinate is given
function __lineY(line, x) {
    return line.vertical? null : line.k * x + line.d;
}

})( jQuery );